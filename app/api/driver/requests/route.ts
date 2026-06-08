import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { connectDb } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { fail, ok } from '@/lib/http';
import { Ride } from '@/models/Ride';
import { User } from '@/models/User';

function showOpenRidesFallback() {
  return String(process.env.SHOW_ALL_OPEN_RIDES_TO_ONLINE_DRIVERS || 'true').toLowerCase() === 'true';
}

export async function GET(req: NextRequest) {
  try {
    await connectDb();
    const auth = await getAuthUser(req);
    if (auth.role !== 'driver') return fail('Only drivers can load ride requests', 403);

    const driverObjectId = new mongoose.Types.ObjectId(auth.sub);
    const driver = await User.findById(auth.sub).select('online currentLocation');
    if (!driver) return fail('Driver not found', 404);
    if (!driver.online) return ok({ rides: [], online: false });

    let rides = await Ride.find({
      status: 'requested',
      candidateDriverIds: driverObjectId
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('passengerId', 'name phone')
      .lean();

    // Rural/testing fallback: if the driver was online but was not selected by the initial geo search,
    // still show open passenger requests so a real driver can accept them.
    if (rides.length === 0 && showOpenRidesFallback()) {
      rides = await Ride.find({ status: 'requested' })
        .sort({ createdAt: -1 })
        .limit(20)
        .populate('passengerId', 'name phone')
        .lean();
    }

    return ok({ rides, online: driver.online });
  } catch (err: unknown) {
    return fail(err instanceof Error ? err.message : 'Could not load ride requests');
  }
}
