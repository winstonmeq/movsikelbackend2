import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { connectDb } from '@/lib/db';
import { requireActiveUser, statusForAuthError } from '@/lib/account';
import { fail, ok } from '@/lib/http';
import { progressDispatchIfNeeded } from '@/lib/dispatch';
import { getDriverLocation } from '@/lib/redis';
import { withLogger } from '@/lib/logger';
import { Ride } from '@/models/Ride';

export const GET = withLogger(async function GET(req: NextRequest, context?: any) {
  try {
    await connectDb();
    let auth;
    try {
      ({ auth } = await requireActiveUser(req));
    } catch (err) {
      return fail(err instanceof Error ? err.message : 'Unauthorized', statusForAuthError(err));
    }
    if (auth.role !== 'passenger') return fail('Only passengers can view passenger rides', 403);

    const { rideId } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(rideId)) return fail('Invalid ride id');

    await progressDispatchIfNeeded(rideId);

    const ride = await Ride.findById(rideId).populate(
      'driverId',
      'name phone vehicleType plateNumber tricycleNumber currentLocation heading'
    );

    if (!ride) return fail('Ride not found', 404);
    if (String(ride.passengerId) !== auth.sub) return fail('Forbidden', 403);

    // Overlay Redis location on the driver if available — fresher than MongoDB.
    if (ride?.driverId && typeof (ride.driverId as any)._id !== 'undefined') {
      const driverId = String((ride.driverId as any)._id);
      const redisLoc = await getDriverLocation(driverId);
      if (redisLoc) {
        (ride.driverId as any).currentLocation = {
          type: 'Point',
          coordinates: [redisLoc.lng, redisLoc.lat]
        };
        (ride.driverId as any).heading = redisLoc.heading;
      }
    }

    return ok({ ride });
  } catch (err: unknown) {
    return fail(err instanceof Error ? err.message : 'Could not load ride');
  }
});

