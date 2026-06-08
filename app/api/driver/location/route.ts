import { NextRequest } from 'next/server';
import { z } from 'zod';
import { connectDb } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { fail, ok } from '@/lib/http';
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
    const auth = await getAuthUser(req);
    if (auth.role !== 'driver') return fail('Only drivers can update location', 403);

    const body = schema.parse(await req.json());
    if (!isValidLatLng(body)) return fail('Invalid driver location');

    const driver = await User.findByIdAndUpdate(
      auth.sub,
      {
        online: true,
        currentLocation: toPoint({ lat: body.lat, lng: body.lng }),
        heading: body.heading
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
