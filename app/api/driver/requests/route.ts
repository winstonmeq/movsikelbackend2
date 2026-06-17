import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { connectDb } from '@/lib/db';
import { fail, ok } from '@/lib/http';
import { requireActiveUser, statusForAuthError } from '@/lib/account';
import { progressDispatchIfNeeded } from '@/lib/dispatch';
import { withLogger } from '@/lib/logger';
import { Ride } from '@/models/Ride';
import { User } from '@/models/User';

export const GET = withLogger(async function GET(req: NextRequest) {
  try {
    await connectDb();
    let auth;
    try {
      ({ auth } = await requireActiveUser(req));
    } catch (err) {
      return fail(err instanceof Error ? err.message : 'Unauthorized', statusForAuthError(err));
    }
    if (auth.role !== 'driver') return fail('Only drivers can load ride requests', 403);

    const driverObjectId = new mongoose.Types.ObjectId(auth.sub);
    const driver = await User.findById(auth.sub).select('online currentLocation lastSeenAt');
    if (!driver) return fail('Driver not found', 404);

    // If the driver toggled themselves offline, respect that.
    if (driver.online !== true) return ok({ rides: [], online: false });

    // The driver is online AND actively polling right now — that IS the proof of
    // presence. Always refresh lastSeenAt here, even if it had gone stale. This
    // prevents the "stale trap" where a driver who briefly aged past the window
    // could never recover without manually toggling online again. The freshness
    // window's real job is to drop drivers whose app is CLOSED (not polling at
    // all) — not to lock out a driver who is clearly present and polling.
    await User.updateOne({ _id: auth.sub }, { $set: { lastSeenAt: new Date() } });

    // Lazy dispatch progression: advance any requested ride whose current offer
    // window has expired. This is what moves an unaccepted ride from one driver
    // to the next, one stage at a time, without a background worker. Bounded so
    // a single poll can't do unbounded work.
    const expired = await Ride.find({
      status: 'requested',
      offerExpiresAt: { $lte: new Date() }
    })
      .select('_id')
      .limit(20)
      .lean();
    for (const r of expired) {
      await progressDispatchIfNeeded(String(r._id));
    }

    // Only show rides this driver is CURRENTLY being offered (and hasn't declined).
    const rides = await Ride.find({
      status: 'requested',
      currentOfferDriverIds: driverObjectId,
      declinedDriverIds: { $ne: driverObjectId }
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('passengerId', 'name phone')
      .lean();

    return ok({ rides, online: driver.online });
  } catch (err: unknown) {
    return fail(err instanceof Error ? err.message : 'Could not load ride requests');
  }
});
