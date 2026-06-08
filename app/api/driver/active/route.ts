import { NextRequest } from 'next/server';
import { connectDb } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { fail, ok } from '@/lib/http';
import { Ride } from '@/models/Ride';

export async function GET(req: NextRequest) {
  try {
    await connectDb();
    const auth = await getAuthUser(req);
    if (auth.role !== 'driver') return fail('Only drivers can load active rides', 403);

    const ride = await Ride.findOne({
      driverId: auth.sub,
      status: { $in: ['accepted', 'arrived', 'in_progress'] }
    })
      .sort({ updatedAt: -1 })
      .populate('passengerId', 'name phone')
      .lean();

    return ok({ ride });
  } catch (err: unknown) {
    return fail(err instanceof Error ? err.message : 'Could not load active ride');
  }
}
