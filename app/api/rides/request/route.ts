import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { z } from 'zod';
import { connectDb } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { fail, ok } from '@/lib/http';
import { isValidLatLng } from '@/lib/geo';
import { emitToUsers } from '@/lib/realtime';
import { dummyDriverEnabled, ensureDummyDriverNearPickup, scheduleDummyRideSimulation } from '@/lib/dummyDriver';
import { User } from '@/models/User';
import { Ride } from '@/models/Ride';

const DUMMY_DRIVER_PHONE = '09000000000';

const locSchema = z.object({
  label: z.string().optional(),
  name: z.string().optional(),
  placeId: z.string().optional(),
  address: z.string().min(1),
  lat: z.number(),
  lng: z.number()
});

const schema = z.object({
  pickup: locSchema,
  destination: locSchema,
  rideType: z.enum(['shared', 'book']).default('book'),
  offeredFare: z.number().positive().optional(),
  distanceMeters: z.number().optional(),
  durationSeconds: z.number().optional(),
  searchRadiusMeters: z.number().min(500).max(50000).optional()
});

function estimateFare(distanceMeters?: number) {
  const perKm = Number(process.env.PER_KM_FARE_PHP || 2);
  const km = Math.max((distanceMeters || 0) / 1000, 0.1);
  return Math.round(km * perKm * 100) / 100;
}

function cleanMoney(value: number) {
  return Math.round(value * 100) / 100;
}

async function findNearbyRealDrivers(pickup: { lat: number; lng: number }, radiusMeters: number) {
  return User.find({
    role: 'driver',
    online: true,
    phone: { $ne: DUMMY_DRIVER_PHONE },
    currentLocation: {
      $near: {
        $geometry: { type: 'Point', coordinates: [pickup.lng, pickup.lat] },
        $maxDistance: radiusMeters
      }
    }
  })
    .select('name phone vehicleType plateNumber tricycleNumber currentLocation heading')
    .limit(10);
}

async function findAnyOnlineRealDrivers() {
  return User.find({
    role: 'driver',
    online: true,
    phone: { $ne: DUMMY_DRIVER_PHONE },
    currentLocation: { $exists: true }
  })
    .select('name phone vehicleType plateNumber tricycleNumber currentLocation heading')
    .sort({ updatedAt: -1 })
    .limit(10);
}

export async function POST(req: NextRequest) {
  try {
    await connectDb();
    const auth = await getAuthUser(req);
    if (auth.role !== 'passenger') return fail('Only passengers can request rides', 403);

    const body = schema.parse(await req.json());
    if (!isValidLatLng(body.pickup) || !isValidLatLng(body.destination)) {
      return fail('Invalid pickup or destination coordinates');
    }

    const simulatorEnabled = dummyDriverEnabled();
    const radiusMeters = body.searchRadiusMeters || Number(process.env.DRIVER_SEARCH_RADIUS_METERS || 15000);

    const driversForRequest = [...(await findNearbyRealDrivers(body.pickup, radiusMeters))];
    let searchExpanded = false;

    // Development/testing fallback: if your emulator phone location is not close to the pickup,
    // still send the request to online real drivers. Disable with DISPATCH_ALL_ONLINE_DRIVERS_IF_NONE_NEARBY=false.
    if (
      !simulatorEnabled &&
      driversForRequest.length === 0 &&
      String(process.env.DISPATCH_ALL_ONLINE_DRIVERS_IF_NONE_NEARBY || 'true').toLowerCase() === 'true'
    ) {
      const onlineDrivers = await findAnyOnlineRealDrivers();
      driversForRequest.push(...onlineDrivers);
      searchExpanded = onlineDrivers.length > 0;
    }

    if (simulatorEnabled) {
      const dummyDriver = await ensureDummyDriverNearPickup(body.pickup);
      const alreadyIncluded = driversForRequest.some((driver) => String(driver._id) === String(dummyDriver._id));
      if (!alreadyIncluded) driversForRequest.unshift(dummyDriver as any);
    }

    const candidateDriverIds = driversForRequest.map((driver) => driver._id);

    const fareEstimate = estimateFare(body.distanceMeters);
    if (body.rideType === 'book' && (!body.offeredFare || body.offeredFare <= 0)) {
      return fail('Fare offer is required for Booking Ride.');
    }
    const offeredFare = body.rideType === 'book' && body.offeredFare ? cleanMoney(body.offeredFare) : undefined;

    const ride = await Ride.create({
      passengerId: new mongoose.Types.ObjectId(auth.sub),
      pickup: body.pickup,
      destination: body.destination,
      status: 'requested',
      rideType: body.rideType,
      fareEstimate,
      offeredFare,
      distanceMeters: body.distanceMeters,
      durationSeconds: body.durationSeconds,
      candidateDriverIds
    });

    const payload = {
      ride,
      passenger: { id: auth.sub, name: auth.name, phone: auth.phone },
      nearbyDrivers: driversForRequest,
      simulator: simulatorEnabled,
      searchExpanded
    };

    emitToUsers(candidateDriverIds.map(String), 'ride:request', payload);

    if (simulatorEnabled) {
      scheduleDummyRideSimulation(String(ride._id));
    }

    return ok(
      {
        ride,
        notifiedDrivers: driversForRequest.length,
        searchExpanded,
        simulator: simulatorEnabled
          ? {
              enabled: true,
              message: 'Dummy driver will accept this ride automatically.'
            }
          : { enabled: false }
      },
      201
    );
  } catch (err: unknown) {
    return fail(err instanceof Error ? err.message : 'Ride request failed');
  }
}
