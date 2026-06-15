import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { connectDb } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { haversineDistanceMeters } from '@/lib/geo';
import { fail, ok } from '@/lib/http';
import { emitToUser } from '@/lib/realtime';
import { Ride } from '@/models/Ride';
import { User } from '@/models/User';

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

export async function POST(req: NextRequest, context: { params: Promise<{ rideId: string }> }) {
  try {
    await connectDb();
    const auth = await getAuthUser(req);
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
      .select('candidateDriverIds passengerId pickup')
      .lean();

    if (!existingRide) return fail('Ride is no longer available', 409);

    const candidateIds = ((existingRide as any).candidateDriverIds || []).map(String);
    const isCandidate = candidateIds.includes(String(driverObjectId));
    if (candidateIds.length > 0 && !isCandidate && !allowOpenRideAccept()) {
      return fail('This ride was not assigned to your driver app', 403);
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
        $addToSet: { candidateDriverIds: driverObjectId }
      },
      { returnDocument: 'after' }
    )
      .populate('passengerId', 'name phone')
      .lean();

    if (!ride) return fail('Ride is no longer available', 409);

    const update = { ride, driver };
    const passengerId = String((ride as any).passengerId?._id || (ride as any).passengerId);
    emitToUser(passengerId, 'ride:update', update);
    emitToUser(auth.sub, 'ride:update', update);

    return ok(update);
  } catch (err: unknown) {
    return fail(err instanceof Error ? err.message : 'Could not accept ride');
  }
}
