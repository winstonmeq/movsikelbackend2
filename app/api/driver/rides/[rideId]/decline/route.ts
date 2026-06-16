import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { connectDb } from '@/lib/db';
import { requireActiveUser, statusForAuthError } from '@/lib/account';
import { fail, ok } from '@/lib/http';
import { advanceDispatchOnDecline } from '@/lib/dispatch';
import { Ride } from '@/models/Ride';

export async function POST(req: NextRequest, context: { params: Promise<{ rideId: string }> }) {
  try {
    await connectDb();
    let auth;
    try {
      ({ auth } = await requireActiveUser(req));
    } catch (err) {
      return fail(err instanceof Error ? err.message : 'Unauthorized', statusForAuthError(err));
    }
    if (auth.role !== 'driver') return fail('Only drivers can decline rides', 403);

    const { rideId } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(rideId)) return fail('Invalid ride id');

    const driverObjectId = new mongoose.Types.ObjectId(auth.sub);
    const ride = await Ride.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(rideId), status: 'requested' },
      {
        $pull: { candidateDriverIds: driverObjectId, currentOfferDriverIds: driverObjectId },
        $addToSet: { declinedDriverIds: driverObjectId }
      },
      { returnDocument: 'after' }
    ).lean();

    if (!ride) return fail('Ride request not found', 404);

    // Move straight to the next driver instead of waiting for the 10s window.
    await advanceDispatchOnDecline(rideId, auth.sub);

    return ok({ declined: true, rideId });
  } catch (err: unknown) {
    return fail(err instanceof Error ? err.message : 'Could not decline ride');
  }
}
