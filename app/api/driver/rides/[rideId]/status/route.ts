import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { z } from 'zod';
import { connectDb } from '@/lib/db';
import { requireActiveUser, statusForAuthError } from '@/lib/account';
import { fail, ok } from '@/lib/http';
import { emitToUser } from '@/lib/realtime';
import { withLogger } from '@/lib/logger';
import { Ride, type RideStatus } from '@/models/Ride';

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
    }).select('rideType status').lean();

    if (!existingRide) return fail('Ride not found', 404);

    const requestedStatus = body.status;
    const nextStatus = (existingRide as any).rideType === 'shared' && requestedStatus === 'arrived' ? 'completed' : requestedStatus;

    const updates: Record<string, unknown> = { status: nextStatus };
    if (requestedStatus === 'arrived') updates.arrivedAt = new Date();
    if (nextStatus === 'in_progress') updates.startedAt = new Date();
    if (nextStatus === 'completed') updates.completedAt = new Date();
    if (nextStatus === 'cancelled') updates.cancelledAt = new Date();

    const ride = await Ride.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(rideId),
        driverId: new mongoose.Types.ObjectId(auth.sub),
        status: { $ne: 'completed' }
      },
      updates,
      { returnDocument: 'after' }
    )
      .populate('passengerId', 'name phone')
      .lean();

    if (!ride) return fail('Ride not found or already completed', 404);

    const update = { ride };
    const passengerId = String((ride as any).passengerId?._id || (ride as any).passengerId);
    emitToUser(passengerId, 'ride:update', update);
    emitToUser(auth.sub, 'ride:update', update);

    return ok(update);
  } catch (err: unknown) {
    return fail(err instanceof Error ? err.message : 'Could not update ride status');
  }
});
