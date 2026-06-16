import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { connectDb } from '@/lib/db';
import { requireActiveUser, statusForAuthError } from '@/lib/account';
import { fail, ok } from '@/lib/http';
import { emitToUsers } from '@/lib/realtime';
import { withLogger } from '@/lib/logger';
import { Ride } from '@/models/Ride';

export const POST = withLogger(async function POST(req: NextRequest, context?: any) {
  try {
    await connectDb();
    let auth;
    try {
      ({ auth } = await requireActiveUser(req));
    } catch (err) {
      return fail(err instanceof Error ? err.message : 'Unauthorized', statusForAuthError(err));
    }
    if (auth.role !== 'passenger') return fail('Only passengers can cancel passenger rides', 403);

    const { rideId } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(rideId)) return fail('Invalid ride id');

    const ride = await Ride.findById(rideId);
    if (!ride) return fail('Ride not found', 404);
    if (String(ride.passengerId) !== auth.sub) return fail('Forbidden', 403);

    if (ride.status === 'cancelled') return ok({ ride, message: 'Ride already cancelled' });
    if (ride.status === 'completed') return fail('Completed rides cannot be cancelled', 409);
    if (ride.status === 'in_progress') return fail('Ride already in progress and cannot be cancelled from the passenger app', 409);

    ride.status = 'cancelled';
    ride.cancelledAt = new Date();
    await ride.save();

    const notifyUserIds = new Set<string>([String(ride.passengerId)]);
    if (ride.driverId) notifyUserIds.add(String(ride.driverId));
    for (const driverId of ride.candidateDriverIds || []) notifyUserIds.add(String(driverId));

    emitToUsers([...notifyUserIds], 'ride:update', {
      ride,
      cancelledBy: 'passenger'
    });

    return ok({ ride, message: 'Ride cancelled' });
  } catch (err: unknown) {
    return fail(err instanceof Error ? err.message : 'Could not cancel ride');
  }
});
