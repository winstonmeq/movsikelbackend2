import mongoose from 'mongoose';
import { haversineDistanceMeters } from '@/lib/geo';
import { onlineDriverFilter } from '@/lib/account';
import { emitToUsers, emitToUser } from '@/lib/realtime';
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
  return Number(process.env.DISPATCH_FIRST_BATCH || 3); // first 3 together
}

export function dispatchSearchRadiusMeters() {
  return Number(process.env.DRIVER_SEARCH_RADIUS_METERS || 15000);
}

type LatLng = { lat: number; lng: number };

/**
 * Builds the ordered driver queue (nearest first) for a pickup. Excludes the
 * dummy driver and any driver who already declined this ride.
 */
export async function buildDispatchQueue(
  pickup: LatLng,
  radiusMeters: number,
  excludeDriverIds: mongoose.Types.ObjectId[] = []
): Promise<mongoose.Types.ObjectId[]> {
  const excludeStr = new Set(excludeDriverIds.map(String));
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

  // $near already returns nearest-first; just filter exclusions.
  return drivers
    .map((d: any) => d._id as mongoose.Types.ObjectId)
    .filter((id) => !excludeStr.has(String(id)));
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
  const slice = offerSliceForIndex(queue, index);

  if (slice.length === 0) {
    // No more drivers to try.
    const updated = await Ride.findByIdAndUpdate(
      rideId,
      {
        status: 'no_drivers',
        currentOfferDriverIds: [],
        candidateDriverIds: [],
        offerExpiresAt: undefined
      },
      { returnDocument: 'after' }
    ).lean();
    emitToUser(String(ride.passengerId), 'ride:update', { ride: updated });
    return updated;
  }

  const expires = new Date(Date.now() + offerWindowMs());
  const updated = await Ride.findByIdAndUpdate(
    rideId,
    {
      dispatchIndex: index,
      currentOfferDriverIds: slice,
      candidateDriverIds: slice,
      offerExpiresAt: expires
    },
    { returnDocument: 'after' }
  ).lean();

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

  const nextIndex = (ride.dispatchIndex ?? 0) + 1;
  return applyStage(rideId, nextIndex);
}

/**
 * Immediately advance dispatch when the currently-offered driver declines,
 * rather than waiting for the window to expire. Only advances if the decliner
 * was actually in the current offer.
 */
export async function advanceDispatchOnDecline(rideId: string, declinerId: string) {
  const ride = await Ride.findById(rideId)
    .select('status dispatchIndex currentOfferDriverIds')
    .lean();
  if (!ride || ride.status !== 'requested') return ride;

  const current = (ride.currentOfferDriverIds || []).map(String);
  if (!current.includes(String(declinerId))) return ride;

  // If others are still in the current batch (first stage of 3), keep waiting
  // on them; only advance when the offer is now empty of non-decliners.
  const remaining = current.filter((id) => id !== String(declinerId));
  if (remaining.length > 0) {
    await Ride.findByIdAndUpdate(rideId, {
      currentOfferDriverIds: remaining,
      candidateDriverIds: remaining
    });
    return ride;
  }

  const nextIndex = (ride.dispatchIndex ?? 0) + 1;
  return applyStage(rideId, nextIndex);
}
