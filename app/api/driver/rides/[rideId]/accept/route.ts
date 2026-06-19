import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { connectDb } from '@/lib/db';
import { requireActiveUser, statusForAuthError } from '@/lib/account';
import { haversineDistanceMeters } from '@/lib/geo';
import { fail, ok } from '@/lib/http';
import { emitToUser } from '@/lib/realtime';
import { withLogger } from '@/lib/logger';
import { Ride } from '@/models/Ride';
import { User } from '@/models/User';
import { getOrCreateWallet } from '@/lib/wallet';
import { WALLET_MINIMUM_ACCEPT, computeFee } from '@/lib/fareScheme';

function allowOpenRideAccept() {
  return String(process.env.ALLOW_OPEN_RIDE_ACCEPT || 'false').toLowerCase() === 'true';
}

function maxAcceptDistanceMeters() {
  return Number(process.env.DRIVER_ACCEPT_MAX_DISTANCE_METERS || process.env.DRIVER_SEARCH_RADIUS_METERS || 15000);
}

function pointToLatLng(point: unknown) {
  const coordinates = (point as { coordinates?: unknown })?.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length < 2) return null;
  const lng = coordinates[0];
  const lat = coordinates[1];
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

export const POST = withLogger(async function POST(req: NextRequest, context?: any) {
  try {
    await connectDb();
    let auth;
    try {
      ({ auth } = await requireActiveUser(req));
    } catch (err) {
      return fail(err instanceof Error ? err.message : 'Unauthorized', statusForAuthError(err));
    }
    if (auth.role !== 'driver') return fail('Only drivers can accept rides', 403);

    const { rideId } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(rideId)) return fail('Invalid ride id');

    const driverObjectId = new mongoose.Types.ObjectId(auth.sub);
    const driver = await User.findById(auth.sub)
      .select('name phone vehicleType plateNumber tricycleNumber currentLocation heading online')
      .lean();

    if (!driver) return fail('Driver not found', 404);
    if (driver.online !== true) return fail('Go online before accepting a ride', 409);

    const existingRide = await Ride.findOne({ _id: new mongoose.Types.ObjectId(rideId), status: 'requested' })
      .select('currentOfferDriverIds candidateDriverIds passengerId pickup rideType offeredFare fareEstimate')
      .lean();

    if (!existingRide) return fail('Ride is no longer available', 409);

    // ── Wallet gate: booking rides require a minimum balance ─────────────────
    if ((existingRide as any).rideType === 'book') {
      const wallet = await getOrCreateWallet(auth.sub);
      if (wallet.balance < WALLET_MINIMUM_ACCEPT) {
        const fare = (existingRide as any).offeredFare ?? (existingRide as any).fareEstimate ?? 0;
        const { fee } = computeFee(fare);
        return fail(
          `Insufficient wallet balance (₱${wallet.balance.toFixed(2)}). ` +
          `Top up to at least ₱${WALLET_MINIMUM_ACCEPT} to accept booking rides. ` +
          `This ride's fee would be ₱${fee}.`,
          402
        );
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    // With staged dispatch, a driver may only accept while the ride is currently
    // offered to them. (candidateDriverIds mirrors currentOfferDriverIds.)
    const offeredIds = ((existingRide as any).currentOfferDriverIds || []).map(String);
    const isOffered = offeredIds.includes(String(driverObjectId));
    if (offeredIds.length > 0 && !isOffered && !allowOpenRideAccept()) {
      return fail('This ride is no longer offered to you', 409);
    }

    const driverLocation = pointToLatLng((driver as any).currentLocation);
    const pickup = (existingRide as any).pickup;
    if (!driverLocation) return fail('Update your driver location before accepting this ride', 409);
    const distanceToPickup = haversineDistanceMeters(driverLocation, { lat: pickup.lat, lng: pickup.lng });
    const maxDistance = maxAcceptDistanceMeters();
    if (Number.isFinite(maxDistance) && distanceToPickup > maxDistance && !allowOpenRideAccept()) {
      return fail('This pickup is too far from your current driver location', 409);
    }

    const ride = await Ride.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(rideId),
        status: 'requested'
      },
      {
        driverId: driverObjectId,
        status: 'accepted',
        acceptedAt: new Date(),
        // Dispatch is over once accepted — clear the offer state.
        currentOfferDriverIds: [],
        candidateDriverIds: [driverObjectId],
        offerExpiresAt: undefined
      },
      { returnDocument: 'after' }
    )
      .populate('passengerId', 'name phone')
      .lean();

    if (!ride) return fail('Ride is no longer available', 409);

    const update = { ride, driver };
    const passengerId = String((ride as any).passengerId?._id || (ride as any).passengerId);
    // Heads-up tray alert for the passenger (their request was just accepted) so
    // they notice even if the app is backgrounded. The driver's own copy is a
    // silent in-app sync.
    emitToUser(passengerId, 'ride:update', update, {
      title: 'Driver on the way',
      body: `${(driver as any).name || 'Your driver'} accepted your ride and is heading to your pickup.`
    });
    emitToUser(auth.sub, 'ride:update', update);

    return ok(update);
  } catch (err: unknown) {
    return fail(err instanceof Error ? err.message : 'Could not accept ride');
  }
});
