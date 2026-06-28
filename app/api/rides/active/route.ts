import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { connectDb } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { fail, okNoStore } from '@/lib/http';
import { progressDispatchIfNeeded } from '@/lib/dispatch';
import { getDriverLocation } from '@/lib/redis';
import { Ride, type RideStatus } from '@/models/Ride';
import { User } from '@/models/User';
void User; // register User schema for .populate()
import { withLogger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ACTIVE_PASSENGER_RIDE_STATUSES: RideStatus[] = ['requested', 'accepted', 'arrived', 'in_progress'];

export const GET = withLogger(async function GET(req: NextRequest) {
  try {
    await connectDb();
    const auth = await getAuthUser(req);
    if (auth.role !== 'passenger') return fail('Only passengers can view active passenger rides', 403);

    const passengerId = new mongoose.Types.ObjectId(auth.sub);
    const activeRide = await Ride.findOne({
      passengerId,
      status: { $in: ACTIVE_PASSENGER_RIDE_STATUSES }
    })
      .sort({ createdAt: -1 })
      .select('_id')
      .lean();

    if (!activeRide) return okNoStore({ ride: null });

    await progressDispatchIfNeeded(String(activeRide._id));

    const ride = await Ride.findOne({
      _id: activeRide._id,
      passengerId,
      status: { $in: ACTIVE_PASSENGER_RIDE_STATUSES }
    })
      .populate('driverId', 'name phone vehicleType plateNumber tricycleNumber currentLocation heading');

    if (!ride) return okNoStore({ ride: null });

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

    return okNoStore({ ride });
  } catch (err: unknown) {
    return fail(err instanceof Error ? err.message : 'Could not load active ride');
  }
});
