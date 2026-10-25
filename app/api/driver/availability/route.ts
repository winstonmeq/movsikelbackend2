import { NextRequest } from 'next/server';
import { z } from 'zod';
import { connectDb } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { fail, ok } from '@/lib/http';
import { requireActiveUser, statusForAuthError } from '@/lib/account';
import { isValidLatLng, toPoint } from '@/lib/geo';
import { withLogger } from '@/lib/logger';
import mongoose from 'mongoose';
import { setDriverLocation, deleteDriverLocation } from '@/lib/redis';
import { User } from '@/models/User';
import { DriverSession } from '@/models/DriverSession';

const schema = z.object({
  online: z.boolean(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  heading: z.number().optional()
});

export const GET = withLogger(async function GET(req: NextRequest) {
  try {
    await connectDb();
    const auth = await getAuthUser(req);
    if (auth.role !== 'driver') return fail('Only drivers can use this endpoint', 403);

    const driver = await User.findById(auth.sub).select('-passwordHash');
    if (!driver) return fail('Driver not found', 404);

    return ok({ driver });
  } catch (err: unknown) {
    return fail(err instanceof Error ? err.message : 'Could not load driver availability');
  }
});

export const POST = withLogger(async function POST(req: NextRequest) {
  try {
    await connectDb();

    let auth;
    try {
      ({ auth } = await requireActiveUser(req));
    } catch (err) {
      return fail(err instanceof Error ? err.message : 'Unauthorized', statusForAuthError(err));
    }
    if (auth.role !== 'driver') return fail('Only drivers can update availability', 403);

    const body = schema.parse(await req.json());

    const hasLocation = typeof body.lat === 'number' && typeof body.lng === 'number';

    // A driver going online MUST supply a location (or already have one on file).
    // Otherwise they'd be online but invisible to dispatch — the silent
    // "online but never offered a ride" failure. We check the existing record so
    // a driver who already has a recent location can re-toggle online without a
    // fresh fix in hand.
    //
    // Gated by REQUIRE_LOCATION_FOR_ONLINE (default ON) so this can be disabled
    // instantly via env — without a redeploy — if it ever locks out drivers
    // whose app toggles online before its first GPS fix.
    const requireLocationForOnline =
      String(process.env.REQUIRE_LOCATION_FOR_ONLINE ?? 'true').toLowerCase() !== 'false';

    if (requireLocationForOnline && body.online && !hasLocation) {
      const existing = await User.findById(auth.sub).select('currentLocation').lean();
      const existingCoords = (existing as any)?.currentLocation?.coordinates;
      if (!Array.isArray(existingCoords) || existingCoords.length < 2) {
        return fail('Waiting for your location. Enable GPS and try going online again.', 409);
      }
    }

    const update: Record<string, unknown> = {
      online: body.online,
      lastSeenAt: body.online ? new Date() : null
    };

    if (hasLocation) {
      if (!isValidLatLng({ lat: body.lat!, lng: body.lng! })) return fail('Invalid driver location');
      update.currentLocation = toPoint({ lat: body.lat!, lng: body.lng! });
    }
    if (typeof body.heading === 'number') update.heading = body.heading;

    const driver = await User.findByIdAndUpdate(auth.sub, update, {
      returnDocument: 'after'
    }).select('-passwordHash');

    if (!driver) return fail('Driver not found', 404);

    // Track shift session in DriverSession collection
    const driverObjectId = new mongoose.Types.ObjectId(auth.sub);
    const now = new Date();

    if (body.online) {
      // Check if an open session already exists
      const activeSession = await DriverSession.findOne({
        driverId: driverObjectId,
        endedAt: null
      });

      if (!activeSession) {
        await DriverSession.create({
          driverId: driverObjectId,
          startedAt: now,
          lastHeartbeatAt: now
        });
      } else {
        await DriverSession.updateOne(
          { _id: activeSession._id },
          { $set: { lastHeartbeatAt: now } }
        );
      }
    } else {
      // Driver toggled offline: close any active open session and compute duration
      const openSessions = await DriverSession.find({
        driverId: driverObjectId,
        endedAt: null
      });

      for (const s of openSessions) {
        const durationSeconds = Math.max(0, Math.round((now.getTime() - s.startedAt.getTime()) / 1000));
        await DriverSession.updateOne(
          { _id: s._id },
          { $set: { endedAt: now, durationSeconds, lastHeartbeatAt: now } }
        );
      }
    }

    // Sync the live-map cache: going offline removes the driver immediately;
    // going online with a location seeds the cache right away.
    if (!body.online) {
      await deleteDriverLocation(auth.sub);
    } else if (typeof body.lat === 'number' && typeof body.lng === 'number') {
      await setDriverLocation(auth.sub, body.lat, body.lng, body.heading);
    }

    return ok({ driver });
  } catch (err: unknown) {
    return fail(err instanceof Error ? err.message : 'Could not update availability');
  }
});
