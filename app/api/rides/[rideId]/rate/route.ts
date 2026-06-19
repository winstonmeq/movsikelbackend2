import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { z } from 'zod';
import { connectDb } from '@/lib/db';
import { requireActiveUser, statusForAuthError } from '@/lib/account';
import { fail, ok } from '@/lib/http';
import { withLogger } from '@/lib/logger';
import { Ride } from '@/models/Ride';

const schema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(500).optional(),
});

export const POST = withLogger(async function POST(req: NextRequest, context?: any) {
  try {
    await connectDb();
    let auth;
    try {
      ({ auth } = await requireActiveUser(req));
    } catch (err) {
      return fail(err instanceof Error ? err.message : 'Unauthorized', statusForAuthError(err));
    }
    if (auth.role !== 'passenger') return fail('Only passengers can rate rides', 403);

    const { rideId } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(rideId)) return fail('Invalid ride id', 400);

    const raw = await req.json().catch(() => null);
    if (!raw) return fail('Invalid body', 400);
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      return fail(parsed.error.issues.map(i => i.message).join(' '), 400);
    }
    const { rating, comment } = parsed.data;

    const ride = await Ride.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(rideId),
        passengerId: new mongoose.Types.ObjectId(auth.sub),
        status: 'completed',
        rideType: 'book',
        rating: { $exists: false }, // prevent re-rating
      },
      {
        rating,
        ratingComment: comment ?? '',
        ratedAt: new Date(),
      },
      { returnDocument: 'after' }
    ).lean();

    if (!ride) {
      // Distinguish already-rated from not-found
      const exists = await Ride.exists({
        _id: new mongoose.Types.ObjectId(rideId),
        passengerId: new mongoose.Types.ObjectId(auth.sub),
      });
      if (exists) return fail('This ride has already been rated', 409);
      return fail('Ride not found or cannot be rated', 404);
    }

    return ok({ rated: true, rating, rideId });
  } catch (err: unknown) {
    return fail(err instanceof Error ? err.message : 'Could not submit rating');
  }
});
