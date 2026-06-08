import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { connectDb } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { fail, ok } from '@/lib/http';
import { Ride } from '@/models/Ride';

export async function POST(req: NextRequest, context: { params: Promise<{ rideId: string }> }) {
  try {
    await connectDb();
    const auth = await getAuthUser(req);
    if (auth.role !== 'driver') return fail('Only drivers can decline rides', 403);

    const { rideId } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(rideId)) return fail('Invalid ride id');

    const ride = await Ride.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(rideId), status: 'requested' },
      { $pull: { candidateDriverIds: new mongoose.Types.ObjectId(auth.sub) } },
      { returnDocument: 'after' }
    ).lean();

    if (!ride) return fail('Ride request not found', 404);
    return ok({ declined: true, rideId });
  } catch (err: unknown) {
    return fail(err instanceof Error ? err.message : 'Could not decline ride');
  }
}
