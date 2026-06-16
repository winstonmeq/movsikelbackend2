import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { connectDb } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { fail, ok } from '@/lib/http';
import { Ride } from '@/models/Ride';
import { withLogger } from '@/lib/logger';

export const GET = withLogger(async function GET(req: NextRequest) {
  try {
    await connectDb();
    const auth = await getAuthUser(req);
    if (auth.role !== 'passenger') return fail('Only passengers can view active passenger rides', 403);

    const ride = await Ride.findOne({
      passengerId: new mongoose.Types.ObjectId(auth.sub),
      status: { $in: ['requested', 'accepted', 'arrived', 'in_progress'] }
    })
      .sort({ createdAt: -1 })
      .populate('driverId', 'name phone vehicleType plateNumber tricycleNumber currentLocation heading');

    return ok({ ride });
  } catch (err: unknown) {
    return fail(err instanceof Error ? err.message : 'Could not load active ride');
  }
});
