import { NextRequest } from 'next/server';
import { connectDb } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { fail, ok } from '@/lib/http';
import { Ride } from '@/models/Ride';
import { User } from '@/models/User';
void User; // register User schema for .populate()
import { withLogger } from '@/lib/logger';

export const GET = withLogger(async function GET(req: NextRequest) {
  try {
    await connectDb();
    const auth = await getAuthUser(req);
    if (auth.role !== 'driver') return fail('Only drivers can load ride history', 403);

    const rides = await Ride.find({
      driverId: auth.sub,
      status: { $in: ['completed', 'cancelled'] }
    })
      .sort({ updatedAt: -1 })
      .limit(50)
      .populate('passengerId', 'name phone')
      .lean();

    return ok({ rides });
  } catch (err: unknown) {
    return fail(err instanceof Error ? err.message : 'Could not load driver history');
  }
});
