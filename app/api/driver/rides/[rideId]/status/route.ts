import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { z } from 'zod';
import { connectDb } from '@/lib/db';
import { requireActiveUser, statusForAuthError } from '@/lib/account';
import { fail, ok } from '@/lib/http';
import { emitToUser } from '@/lib/realtime';
import { withLogger } from '@/lib/logger';
import { Ride, type RideStatus } from '@/models/Ride';
import { User } from '@/models/User';
import { computeFee, REFERRAL_BONUS } from '@/lib/fareScheme';
import { creditWallet, debitWallet } from '@/lib/wallet';
import redis from '@/lib/redis';
void User; // register User schema for .populate()

const allowedStatuses: RideStatus[] = ['arrived', 'in_progress', 'completed', 'cancelled'];
const schema = z.object({ status: z.enum(['arrived', 'in_progress', 'completed', 'cancelled']) });

export const POST = withLogger(async function POST(req: NextRequest, context?: any) {
  try {
    await connectDb();
    let auth;
    try {
      ({ auth } = await requireActiveUser(req));
    } catch (err) {
      return fail(err instanceof Error ? err.message : 'Unauthorized', statusForAuthError(err));
    }
    if (auth.role !== 'driver') return fail('Only drivers can update ride status', 403);

    const { rideId } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(rideId)) return fail('Invalid ride id');

    const body = schema.parse(await req.json());
    if (!allowedStatuses.includes(body.status)) return fail('Invalid status');

    const existingRide = await Ride.findOne({
      _id: new mongoose.Types.ObjectId(rideId),
      driverId: new mongoose.Types.ObjectId(auth.sub)
    }).select('rideType status offeredFare fareEstimate').lean();

    if (!existingRide) return fail('Ride not found', 404);

    const requestedStatus = body.status;
    const nextStatus = (existingRide as any).rideType === 'shared' && requestedStatus === 'arrived' ? 'completed' : requestedStatus;

    const updates: Record<string, unknown> = { status: nextStatus };
    if (requestedStatus === 'arrived') updates.arrivedAt = new Date();
    if (nextStatus === 'in_progress') updates.startedAt = new Date();
    if (nextStatus === 'completed') updates.completedAt = new Date();
    if (nextStatus === 'cancelled') updates.cancelledAt = new Date();

    let feeToCharge = 0;
    let feeDescription = '';
    const fare = (existingRide as any).offeredFare ?? (existingRide as any).fareEstimate ?? 0;

    if (nextStatus === 'completed' && (existingRide as any).rideType === 'book') {
      const feeResult = computeFee(fare);
      feeToCharge = feeResult.fee;
      feeDescription = feeResult.feeDescription;
      if (feeToCharge > 0) {
        updates.feeCharged = feeToCharge;
      }
    }

    // Atomically transition the ride status. Only the request that successfully transitions
    // from a non-terminal status to completed is permitted to debit the wallet or trigger bonuses.
    const ride = await Ride.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(rideId),
        driverId: new mongoose.Types.ObjectId(auth.sub),
        status: { $nin: ['completed', 'cancelled'] }
      },
      updates,
      { returnDocument: 'after' }
    )
      .populate('passengerId', 'name phone')
      .lean();

    if (!ride) return fail('Ride not found or already completed/cancelled', 409);

    // ── Wallet: deduct the booking fee only after status transition was committed ──
    if (nextStatus === 'completed' && (existingRide as any).rideType === 'book') {
      if (feeToCharge > 0) {
        await debitWallet({
          driverId: auth.sub,
          amount: feeToCharge,
          type: 'fee',
          description: feeDescription,
          rideId,
        });

        emitToUser(auth.sub, 'wallet:update', {
          fee: feeToCharge,
          fare,
        }, {
          title: 'Booking fee deducted',
          body: `₱${feeToCharge.toFixed(2)} platform fee deducted for your ₱${fare} ride.`,
        });
      }

      // ── Referral bonus: atomically flag driver so bonus is credited exactly once ──
      const driverBeforeUpdate = await User.findOneAndUpdate(
        {
          _id: new mongoose.Types.ObjectId(auth.sub),
          referredBy: { $exists: true, $ne: null },
          referralBonusPaid: { $ne: true }
        },
        { $set: { referralBonusPaid: true } }
      ).select('referredBy').lean();

      if (driverBeforeUpdate && (driverBeforeUpdate as any).referredBy) {
        const referrerId = String((driverBeforeUpdate as any).referredBy);
        await creditWallet({
          driverId: referrerId,
          amount: REFERRAL_BONUS,
          type: 'referral_bonus',
          description: `Referral bonus — ${auth.name || 'your recruit'} completed their first booking`,
          rideId,
        });

        emitToUser(referrerId, 'wallet:update', { referralBonus: REFERRAL_BONUS }, {
          title: 'Referral bonus!',
          body: `₱${REFERRAL_BONUS} added — your recruit completed their first booking ride.`,
        });
      }
    }

    const update = { ride };
    const passengerId = String((ride as any).passengerId?._id || (ride as any).passengerId);

    const passengerNote =
      nextStatus === 'arrived'
        ? { title: 'Driver has arrived', body: 'Your driver is at the pickup location.' }
        : nextStatus === 'in_progress'
        ? { title: 'Ride started', body: 'You are on your way to your destination.' }
        : nextStatus === 'completed'
        ? { title: 'Ride completed', body: 'Thank you for riding with MovSikel.' }
        : undefined;

    // 1. Broadcast to WebSocket clients listening on this ride
    await redis.publish(
      `ride:live:${rideId}`,
      JSON.stringify({
        event: 'ride:update',
        data: update
      })
    ).catch(() => {});

    // 2. Push notification via FCM
    emitToUser(passengerId, 'ride:update', update, passengerNote);
    emitToUser(auth.sub, 'ride:update', update);

    return ok(update);
  } catch (err: unknown) {
    return fail(err instanceof Error ? err.message : 'Could not update ride status');
  }
});
