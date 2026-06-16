import { NextRequest } from 'next/server';
import { z } from 'zod';
import { connectDb } from '@/lib/db';
import { fail, ok } from '@/lib/http';
import { requireActiveUser, statusForAuthError } from '@/lib/account';
import { isValidLatLng, toPoint } from '@/lib/geo';
import { emitToUser } from '@/lib/realtime';
import { User } from '@/models/User';
import { Ride } from '@/models/Ride';

const schema = z.object({
  lat: z.number(),
  lng: z.number(),
  heading: z.number().optional()
});

export async function POST(req: NextRequest) {
  try {
    await connectDb();

    let auth;
    try {
      ({ auth } = await requireActiveUser(req));
    } catch (err) {
      return fail(err instanceof Error ? err.message : 'Unauthorized', statusForAuthError(err));
    }
    if (auth.role !== 'driver') return fail('Only drivers can update location', 403);

    const body = schema.parse(await req.json());
    if (!isValidLatLng(body)) return fail('Invalid driver location');

    // Update position + freshness, but DO NOT force `online: true`. Availability
    // is owned by the availability route (the driver's online/offline toggle).
    // A location ping only refreshes lastSeenAt, so a driver who never went
    // online won't appear online, and online is treated as fresh (see the
    // 2-minute window applied in admin/dispatch queries).
    const driver = await User.findByIdAndUpdate(
      auth.sub,
      {
        currentLocation: toPoint({ lat: body.lat, lng: body.lng }),
        heading: body.heading,
        lastSeenAt: new Date()
      },
      { returnDocument: 'after' }
    ).select('name phone vehicleType plateNumber tricycleNumber currentLocation heading online');

    const activeRide = await Ride.findOne({
      driverId: auth.sub,
      status: { $in: ['accepted', 'arrived', 'in_progress'] }
    }).select('passengerId status');

    if (activeRide) {
      emitToUser(String(activeRide.passengerId), 'ride:driver_location', {
        rideId: String(activeRide._id),
        lat: body.lat,
        lng: body.lng,
        heading: body.heading,
        status: activeRide.status
      });
    }

    return ok({ driver });
  } catch (err: unknown) {
    return fail(err instanceof Error ? err.message : 'Could not update driver location');
  }
}
