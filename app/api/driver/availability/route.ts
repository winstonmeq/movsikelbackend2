import { NextRequest } from 'next/server';
import { z } from 'zod';
import { connectDb } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { fail, ok } from '@/lib/http';
import { requireActiveUser, statusForAuthError } from '@/lib/account';
import { isValidLatLng, toPoint } from '@/lib/geo';
import { withLogger } from '@/lib/logger';
import { setDriverLocation, deleteDriverLocation } from '@/lib/redis';
import { User } from '@/models/User';

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
    const update: Record<string, unknown> = {
      online: body.online,
      lastSeenAt: body.online ? new Date() : null
    };

    if (typeof body.lat === 'number' && typeof body.lng === 'number') {
      if (!isValidLatLng({ lat: body.lat, lng: body.lng })) return fail('Invalid driver location');
      update.currentLocation = toPoint({ lat: body.lat, lng: body.lng });
    }
    if (typeof body.heading === 'number') update.heading = body.heading;

    const driver = await User.findByIdAndUpdate(auth.sub, update, {
      returnDocument: 'after'
    }).select('-passwordHash');

    if (!driver) return fail('Driver not found', 404);

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
