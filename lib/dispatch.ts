import mongoose from 'mongoose';
import { onlineDriverFilter } from '@/lib/account';
import { emitToUsers, emitToUser } from '@/lib/realtime';
import {
  getNearbyOnlineDriverLocations,
  releaseDriverReservations,
  reservedDriverIdSet,
  reserveDriversForRide
} from '@/lib/redis';
import { angleDifferenceDegrees, bearingDegrees, haversineDistanceMeters } from '@/lib/geo';
import { Ride } from '@/models/Ride';
import { User } from '@/models/User';

/**
 * Staged sequential dispatch.
 *
 * When a passenger requests a ride we build an ordered queue of nearby drivers
 * (nearest first). We then OFFER the ride to the first 3 together; if none
 * accept within OFFER_WINDOW_MS, we advance and offer to the next single driver,
 * then the next, one by one, until someone accepts or the queue is exhausted.
 *
 * There is no background worker (Vercel serverless can't hold timers), so the
 * advance happens LAZILY: whenever a driver polls /requests or the passenger
 * polls ride status, we call `progressDispatchIfNeeded`, which checks whether
 * the current offer has expired and, if so, advances to the next stage.
 *
 * `currentOfferDriverIds` mirrors into `candidateDriverIds` so the existing
 * /requests filter only shows a ride to whoever is currently being offered.
 */

export function offerWindowMs() {
  return Number(process.env.DISPATCH_OFFER_WINDOW_MS || 10000); // 10s per stage
}

export function firstBatchSize() {
  return Number(process.env.DISPATCH_FIRST_BATCH || 5); // first 3 together
}

export function dispatchSearchRadiusMeters() {
  return Number(process.env.DRIVER_SEARCH_RADIUS_METERS || 5000);
}

export function dispatchSearchMaxRadiusMeters() {
  return Number(process.env.DRIVER_SEARCH_MAX_RADIUS_METERS || dispatchSearchRadiusMeters());
}

export function dispatchSearchRadiusExpansionMeters() {
  return Number(process.env.DRIVER_SEARCH_RADIUS_EXPANSION_METERS || 500);
}

function reservationTtlMs() {
  return offerWindowMs() + Number(process.env.DRIVER_RESERVATION_GRACE_MS || 1000);
}

export function dispatchSearchRadiiMeters(startRadius = dispatchSearchRadiusMeters()) {
  const maxRadius = Math.max(startRadius, dispatchSearchMaxRadiusMeters());
  const expansion = dispatchSearchRadiusExpansionMeters();
  const radii = [startRadius];

  if (!Number.isFinite(expansion) || expansion <= 0) return radii;

  let nextRadius = startRadius + expansion;
  while (nextRadius <= maxRadius) {
    radii.push(nextRadius);
    nextRadius += expansion;
  }

  if (radii[radii.length - 1] !== maxRadius) {
    radii.push(maxRadius);
  }

  return [...new Set(radii.map((radius) => Math.round(radius)))];
}

type LatLng = { lat: number; lng: number };
type LiveDriverLocation = {
  driverId: string;
  lat: number;
  lng: number;
  updatedAt: number;
  previousLat?: number;
  previousLng?: number;
  previousUpdatedAt?: number;
};
const ACTIVE_DRIVER_RIDE_STATUSES = ['accepted', 'arrived', 'in_progress'] as const;
const MIN_MOVEMENT_DIRECTION_METERS = 8;
const MAX_PREVIOUS_LOCATION_AGE_MS = 120_000;

async function busyDriverIdSet(driverIds: mongoose.Types.ObjectId[]) {
  if (driverIds.length === 0) return new Set<string>();

  const activeRides = await Ride.find({
    driverId: { $in: driverIds },
    status: { $in: ACTIVE_DRIVER_RIDE_STATUSES }
  })
    .select('driverId')
    .lean();

  return new Set(activeRides.map((ride: any) => String(ride.driverId)));
}

function movementBearing(location: LiveDriverLocation) {
  if (
    typeof location.previousLat !== 'number' ||
    typeof location.previousLng !== 'number' ||
    typeof location.previousUpdatedAt !== 'number' ||
    location.updatedAt - location.previousUpdatedAt > MAX_PREVIOUS_LOCATION_AGE_MS
  ) {
    return null;
  }

  const previous = { lat: location.previousLat, lng: location.previousLng };
  const current = { lat: location.lat, lng: location.lng };
  const movementMeters = haversineDistanceMeters(previous, current);
  if (movementMeters < MIN_MOVEMENT_DIRECTION_METERS) return null;

  return bearingDegrees(previous, current);
}

function directionAdjustedDistanceMeters(location: LiveDriverLocation, pickup: LatLng, destination?: LatLng) {
  const current = { lat: location.lat, lng: location.lng };
  const distanceMeters = haversineDistanceMeters(current, pickup);
  const movement = movementBearing(location);
  if (movement === null) return distanceMeters;

  const pickupAngle = angleDifferenceDegrees(movement, bearingDegrees(current, pickup));
  const pickupBonus = Math.max(0, (90 - pickupAngle) / 90) * 120;
  const pickupPenalty = pickupAngle > 135 ? 80 : 0;
  const routeBonus = destination
    ? Math.max(0, (75 - angleDifferenceDegrees(movement, bearingDegrees(pickup, destination))) / 75) * 40
    : 0;

  return distanceMeters - pickupBonus - routeBonus + pickupPenalty;
}

function sortByDistanceAndDirection(
  locations: LiveDriverLocation[],
  pickup: LatLng,
  destination?: LatLng
) {
  return [...locations].sort((a, b) => {
    const scoreA = directionAdjustedDistanceMeters(a, pickup, destination);
    const scoreB = directionAdjustedDistanceMeters(b, pickup, destination);
    if (scoreA !== scoreB) return scoreA - scoreB;
    return haversineDistanceMeters({ lat: a.lat, lng: a.lng }, pickup) - haversineDistanceMeters({ lat: b.lat, lng: b.lng }, pickup);
  });
}

/**
 * Builds the ordered driver queue (nearest first) for a pickup.
 *
 * Presence comes from REDIS — the same live, TTL'd set the admin Live Map reads
 * — so "online on the map" and "eligible for dispatch" can never drift apart.
 * Mongo is consulted only to confirm identity (still a driver, still online,
 * not banned/suspended); it is NOT the freshness authority anymore. The Redis
 * TTL ({@link DRIVER_LOCATION_TTL}, 60s) is.
 *
 * Falls back to a Mongo `$near` query when Redis has no presence data at all
 * (e.g. Redis was flushed) so dispatch degrades gracefully rather than finding
 * zero drivers.
 *
 * Excludes any driver in `excludeDriverIds` (declined / already offered).
 */
export async function buildDispatchQueue(
  pickup: LatLng,
  radiusMeters: number,
  excludeDriverIds: mongoose.Types.ObjectId[] = [],
  destination?: LatLng
): Promise<mongoose.Types.ObjectId[]> {
  const excludeStr = new Set(excludeDriverIds.map(String));

  // 1) Live, nearby presence from Redis (nearest-first). null => Redis empty.
  const nearbyLocations = await getNearbyOnlineDriverLocations(pickup, radiusMeters);

  if (nearbyLocations !== null) {
    if (nearbyLocations.length === 0) return [];
    const candidates = sortByDistanceAndDirection(
      nearbyLocations.filter((location) => !excludeStr.has(location.driverId)),
      pickup,
      destination
    );
    if (candidates.length === 0) return [];
    const candidateIds = candidates.map((location) => location.driverId);

    // Confirm identity/eligibility in Mongo, preserving Redis's distance order.
    const objectIds = candidateIds.map((id) => new mongoose.Types.ObjectId(id));
    const eligible = await User.find({
      _id: { $in: objectIds },
      role: 'driver',
      online: true,
      status: 'active'
    })
      .select('_id')
      .lean();

    const eligibleSet = new Set(eligible.map((d: any) => String(d._id)));
    const busySet = await busyDriverIdSet(eligible.map((d: any) => d._id));
    const reservedSet = await reservedDriverIdSet(candidateIds);
    return candidateIds
      .filter((id) => eligibleSet.has(id) && !busySet.has(id) && !reservedSet.has(id))
      .slice(0, 50)
      .map((id) => new mongoose.Types.ObjectId(id));
  }

  // 2) Redis empty — fall back to Mongo $near + the 2-min freshness window.
  const drivers = await User.find({
    role: 'driver',
    ...onlineDriverFilter(),
    currentLocation: {
      $near: {
        $geometry: { type: 'Point', coordinates: [pickup.lng, pickup.lat] },
        $maxDistance: radiusMeters
      }
    }
  })
    .select('_id')
    .limit(50)
    .lean();

  const busySet = await busyDriverIdSet(drivers.map((d: any) => d._id));
  const reservedSet = await reservedDriverIdSet(drivers.map((d: any) => String(d._id)));
  return drivers
    .map((d: any) => d._id as mongoose.Types.ObjectId)
    .filter((id) => !excludeStr.has(String(id)) && !busySet.has(String(id)) && !reservedSet.has(String(id)));
}

export async function buildDispatchQueueWithExpansion(
  pickup: LatLng,
  startRadiusMeters = dispatchSearchRadiusMeters(),
  excludeDriverIds: mongoose.Types.ObjectId[] = [],
  destination?: LatLng
): Promise<mongoose.Types.ObjectId[]> {
  const exclude = [...excludeDriverIds];

  for (const radiusMeters of dispatchSearchRadiiMeters(startRadiusMeters)) {
    const queue = await buildDispatchQueue(pickup, radiusMeters, exclude, destination);
    if (queue.length > 0) return queue;
  }

  return [];
}

/**
 * Computes the current offer window from the queue + an index.
 * Stage 0 offers drivers from 0 up to firstBatch. Each later stage offers exactly one.
 */
export function offerSliceForIndex(
  queue: mongoose.Types.ObjectId[],
  index: number
): mongoose.Types.ObjectId[] {
  const batch = firstBatchSize();
  if (index <= 0) return queue.slice(0, batch);
  // After the first batch, advance one driver at a time.
  const start = batch + (index - 1);
  return queue.slice(start, start + 1);
}

/** True once the index has walked past the end of the queue. */
export function isQueueExhausted(queue: mongoose.Types.ObjectId[], index: number): boolean {
  return offerSliceForIndex(queue, index).length === 0;
}

/**
 * Sets a ride's current offer to the given stage index, updates
 * candidateDriverIds + offerExpiresAt, and notifies the newly-offered drivers.
 * If the queue is exhausted, marks the ride `no_drivers` and notifies the
 * passenger. Returns the (possibly updated) lean ride.
 */
async function applyStage(rideId: string, index: number) {
  const ride = await Ride.findById(rideId).lean();
  if (!ride || ride.status !== 'requested') return ride;

  const queue = (ride.dispatchQueue || []) as mongoose.Types.ObjectId[];
  const previousOfferDriverIds = ((ride.currentOfferDriverIds || []) as mongoose.Types.ObjectId[]).map(String);
  const declined = new Set(
    ((ride.declinedDriverIds || []) as mongoose.Types.ObjectId[]).map(String)
  );
  const dispatchStartedAt = (ride as any).dispatchMetrics?.dispatchStartedAt
    ? new Date((ride as any).dispatchMetrics.dispatchStartedAt)
    : new Date((ride as any).createdAt || Date.now());

  // Walk forward to the next stage that actually has a non-declined driver to
  // offer. A stage whose only driver already declined must be SKIPPED (advance
  // the index), not treated as queue-exhausted — otherwise one decline at a
  // single-driver stage would prematurely end the ride while later drivers
  // remain. We stop when we find a real slice or run off the end of the queue.
  let stageIndex = index;
  let slice: mongoose.Types.ObjectId[] = [];
  while (!isQueueExhausted(queue, stageIndex)) {
    const candidateSlice = offerSliceForIndex(queue, stageIndex).filter((id) => !declined.has(String(id)));
    if (candidateSlice.length > 0) {
      const reserved = await reserveDriversForRide(
        candidateSlice.map(String),
        rideId,
        reservationTtlMs()
      );
      const reservedSet = new Set(reserved);
      slice = candidateSlice.filter((id) => reservedSet.has(String(id)));
      if (slice.length > 0) break;
    }
    stageIndex += 1;
  }

  if (slice.length === 0) {
    // Genuinely no more drivers to try.
    const now = new Date();
    const updated = await Ride.findOneAndUpdate(
      { _id: rideId, status: 'requested' },
      {
        $set: {
          status: 'no_drivers',
          currentOfferDriverIds: [],
          candidateDriverIds: [],
          'dispatchMetrics.noDriversAt': now,
          'dispatchMetrics.dispatchStageCount': Math.max(stageIndex, 0)
        },
        $unset: { offerExpiresAt: 1 }
      },
      { returnDocument: 'after' }
    ).lean();
    if (!updated) return Ride.findById(rideId).lean();
    await releaseDriverReservations(previousOfferDriverIds, rideId);
    if (previousOfferDriverIds.length > 0) {
      emitToUsers(previousOfferDriverIds, 'ride:update', { ride: updated, offerExpired: true });
    }
    emitToUser(String(ride.passengerId), 'ride:update', { ride: updated });
    return updated;
  }

  const now = new Date();
  const expires = new Date(Date.now() + offerWindowMs());
  const updated = await Ride.findOneAndUpdate(
    { _id: rideId, status: 'requested' },
    {
      $set: {
        dispatchIndex: stageIndex,
        currentOfferDriverIds: slice,
        candidateDriverIds: slice,
        offerExpiresAt: expires,
        'dispatchMetrics.firstOfferedAt': (ride as any).dispatchMetrics?.firstOfferedAt || now,
        'dispatchMetrics.lastOfferedAt': now,
        'dispatchMetrics.firstOfferLatencyMs':
          (ride as any).dispatchMetrics?.firstOfferLatencyMs ?? now.getTime() - dispatchStartedAt.getTime(),
        'dispatchMetrics.dispatchStageCount': stageIndex + 1
      },
      $inc: {
        'dispatchMetrics.offeredDriverCount': slice.length
      }
    },
    { returnDocument: 'after' }
  ).lean();
  if (!updated) {
    await releaseDriverReservations(slice.map(String), rideId);
    return Ride.findById(rideId).lean();
  }

  const newOfferSet = new Set(slice.map(String));
  const expiredOfferDriverIds = previousOfferDriverIds.filter((id) => !newOfferSet.has(id));
  await releaseDriverReservations(expiredOfferDriverIds, rideId);
  if (expiredOfferDriverIds.length > 0) {
    emitToUsers(expiredOfferDriverIds, 'ride:update', { ride: updated, offerExpired: true });
  }

  emitToUsers(slice.map(String), 'ride:request', { ride: updated }, {
    title: 'New ride request',
    body: 'A passenger nearby is requesting a ride. Tap to view.'
  });
  return updated;
}

/** Starts dispatch at stage 0 (the first batch). */
export async function startDispatch(rideId: string) {
  return applyStage(rideId, 0);
}

/**
 * Re-scans live presence and APPENDS any newly-eligible drivers to the tail of
 * the ride's existing `dispatchQueue`, preserving the order already offered.
 *
 * This is the fix for the "frozen queue" problem: the original queue was built
 * once at request time, so a driver who came online (or whose Redis presence
 * refreshed) AFTER the booking could never be offered the ride, even while
 * polling. Rebuilding before each stage advance lets late-arriving drivers
 * still receive the request on a later stage.
 *
 * Already-queued and already-declined drivers are excluded so no one is offered
 * twice and the existing progression index stays valid.
 */
async function refreshQueueTail(rideId: string) {
  const ride = await Ride.findById(rideId)
    .select('status pickup destination dispatchQueue declinedDriverIds')
    .lean();
  if (!ride || ride.status !== 'requested') return;

  const existing = (ride.dispatchQueue || []) as mongoose.Types.ObjectId[];
  const declined = (ride.declinedDriverIds || []) as mongoose.Types.ObjectId[];
  const pickup = (ride as any).pickup;
  if (!pickup) return;

  const fresh = await buildDispatchQueueWithExpansion(
    { lat: pickup.lat, lng: pickup.lng },
    dispatchSearchRadiusMeters(),
    [...existing, ...declined],
    (ride as any).destination ? { lat: (ride as any).destination.lat, lng: (ride as any).destination.lng } : undefined
  );
  if (fresh.length === 0) return;

  // Append only — never reorder what's already been offered. $addToSet (not
  // $push) so a same-tick race between the worker and a driver poll can't insert
  // the same driver twice, which would otherwise offer them the ride on two
  // different stages.
  await Ride.updateOne(
    { _id: rideId, status: 'requested' },
    { $addToSet: { dispatchQueue: { $each: fresh } } }
  );
}

/**
 * Lazy progress check. If the ride is still `requested` and its current offer
 * has expired, advance to the next stage. Safe to call on every poll; it only
 * does work when the window has actually lapsed. Idempotent under races because
 * the stage write is keyed on the ride id and re-reads current state.
 */
export async function progressDispatchIfNeeded(rideId: string) {
  const ride = await Ride.findById(rideId).select('status offerExpiresAt dispatchIndex dispatchQueue').lean();
  if (!ride || ride.status !== 'requested') return ride;

  const expiresAt = ride.offerExpiresAt ? new Date(ride.offerExpiresAt).getTime() : 0;
  if (!expiresAt || Date.now() < expiresAt) return ride; // still within window

  // Pull in any drivers who became eligible since the queue was last built, so a
  // late-arriving driver still gets offered the ride on this (or a later) stage.
  await refreshQueueTail(rideId);

  const nextIndex = (ride.dispatchIndex ?? 0) + 1;
  return applyStage(rideId, nextIndex);
}

/**
 * Immediately advance dispatch when the currently-offered driver declines,
 * rather than waiting for the window to expire. Only advances if the decliner
 * was actually in the current offer.
 */
export async function advanceDispatchOnDecline(rideId: string, declinerId: string) {
  const declinerObjectId = new mongoose.Types.ObjectId(declinerId);
  const ride = await Ride.findOneAndUpdate(
    {
      _id: new mongoose.Types.ObjectId(rideId),
      status: 'requested',
      currentOfferDriverIds: declinerObjectId
    },
    {
      $pull: { candidateDriverIds: declinerObjectId, currentOfferDriverIds: declinerObjectId },
      $addToSet: { declinedDriverIds: declinerObjectId }
    },
    { returnDocument: 'after' }
  )
    .select('status dispatchIndex currentOfferDriverIds')
    .lean();
  if (!ride || ride.status !== 'requested') return ride;

  await releaseDriverReservations([declinerId], rideId);

  const current = (ride.currentOfferDriverIds || []).map(String);
  if (current.length > 0) return ride;

  const nextIndex = (ride.dispatchIndex ?? 0) + 1;
  return applyStage(rideId, nextIndex);
}
