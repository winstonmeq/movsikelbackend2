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
    if (auth.role !== 'passenger') return fail('Only passengers can view passenger trip history', 403);

    const rides = await Ride.find({ passengerId: new mongoose.Types.ObjectId(auth.sub) })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('driverId', 'name phone vehicleType plateNumber tricycleNumber');

    return ok({ rides });
  } catch (err: unknown) {
    return fail(err instanceof Error ? err.message : 'Could not load trip history');
  }
});
