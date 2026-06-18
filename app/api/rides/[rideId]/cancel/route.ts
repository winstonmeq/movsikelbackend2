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

    const hadDriver = Boolean(ride.driverId);

    ride.status = 'cancelled';
    ride.cancelledAt = new Date();
    await ride.save();

    // Notify everyone who could be showing this ride: the passenger, the
    // assigned driver (if accepted), and ALL drivers who were ever offered it
    // during dispatch — currentOffer, the wider candidate/queue lists — so a
    // driver still looking at the request card learns it's gone, even if the
    // dispatch queue had already moved past them.
    const notifyUserIds = new Set<string>([String(ride.passengerId)]);
    if (ride.driverId) notifyUserIds.add(String(ride.driverId));
    for (const driverId of ride.candidateDriverIds || []) notifyUserIds.add(String(driverId));
    for (const driverId of ride.currentOfferDriverIds || []) notifyUserIds.add(String(driverId));
    for (const driverId of ride.dispatchQueue || []) notifyUserIds.add(String(driverId));

    // Only a driver who had ACCEPTED needs a heads-up tray alert (their active
    // trip just vanished). Drivers merely offered an unaccepted request don't
    // need a noisy notification — their request card just clears on next sync.
    emitToUsers(
      [...notifyUserIds],
      'ride:update',
      { ride, cancelledBy: 'passenger' },
      hadDriver
        ? { title: 'Ride cancelled', body: 'The passenger cancelled this ride.' }
        : undefined
    );

    return ok({ ride, message: 'Ride cancelled' });
  } catch (err: unknown) {
    return fail(err instanceof Error ? err.message : 'Could not cancel ride');
  }
});
