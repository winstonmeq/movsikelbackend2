import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { connectDb } from '@/lib/db';
import { requireActiveUser, statusForAuthError } from '@/lib/account';
import { fail, ok } from '@/lib/http';
import { advanceDispatchOnDecline } from '@/lib/dispatch';
import { withLogger } from '@/lib/logger';

export const POST = withLogger(async function POST(req: NextRequest, context?: any) {
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

    // Move straight to the next driver instead of waiting for the 10s window.
    const ride = await advanceDispatchOnDecline(rideId, auth.sub);
    if (!ride) return fail('Ride request not found or no longer offered to you', 404);

    return ok({ declined: true, rideId });
  } catch (err: unknown) {
    return fail(err instanceof Error ? err.message : 'Could not decline ride');
  }
});
