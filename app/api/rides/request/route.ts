import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { z } from 'zod';
import { connectDb } from '@/lib/db';
import { requireActiveUser, statusForAuthError } from '@/lib/account';
import { fail, ok } from '@/lib/http';
import { isValidLatLng } from '@/lib/geo';
import { onlineDriverFilter } from '@/lib/account';
import { emitToUsers } from '@/lib/realtime';
import { startDispatch } from '@/lib/dispatch';
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
  passengerCount: z.number().int().min(1, 'Number of passengers must be at least 1.').optional(),
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
    ...onlineDriverFilter(),
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
    ...onlineDriverFilter(),
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
    let auth;
    try {
      ({ auth } = await requireActiveUser(req));
    } catch (err) {
      return fail(err instanceof Error ? err.message : 'Unauthorized', statusForAuthError(err));
    }
    if (auth.role !== 'passenger') return fail('Only passengers can request rides', 403);

    const body = schema.parse(await req.json());
    if (!isValidLatLng(body.pickup) || !isValidLatLng(body.destination)) {
      return fail('Invalid pickup or destination coordinates');
    }

    const simulatorEnabled = dummyDriverEnabled();
    const radiusMeters = body.searchRadiusMeters || Number(process.env.DRIVER_SEARCH_RADIUS_METERS || 15000);

    const driversForRequest = [...(await findNearbyRealDrivers(body.pickup, radiusMeters))];
    let searchExpanded = false;

    // Development/testing fallback: opt in only when emulator phones are not close to the pickup.
    if (
      !simulatorEnabled &&
      driversForRequest.length === 0 &&
      String(process.env.DISPATCH_ALL_ONLINE_DRIVERS_IF_NONE_NEARBY || 'false').toLowerCase() === 'true'
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
    if (!body.passengerCount || body.passengerCount < 1) {
      return fail('Number of passengers is required (at least 1).');
    }
    const offeredFare = body.rideType === 'book' && body.offeredFare ? cleanMoney(body.offeredFare) : undefined;
    const passengerCount = body.passengerCount;

    // Staged dispatch: the full nearest-first queue is stored, but only the
    // first batch is offered initially (startDispatch sets candidateDriverIds
    // to that batch and notifies them). With the simulator on, keep the dummy
    // driver first so it can auto-accept.
    const dispatchQueue = candidateDriverIds;

    const ride = await Ride.create({
      passengerId: new mongoose.Types.ObjectId(auth.sub),
      pickup: body.pickup,
      destination: body.destination,
      status: 'requested',
      rideType: body.rideType,
      passengerCount,
      fareEstimate,
      offeredFare,
      distanceMeters: body.distanceMeters,
      durationSeconds: body.durationSeconds,
      candidateDriverIds: [],
      dispatchQueue,
      dispatchIndex: 0,
      currentOfferDriverIds: []
    });

    // Offer to the first batch (or mark no_drivers if the queue is empty).
    const dispatched = await startDispatch(String(ride._id));
    const offeredRide = dispatched || ride;

    const payload = {
      ride: offeredRide,
      passenger: { id: auth.sub, name: auth.name, phone: auth.phone },
      nearbyDrivers: driversForRequest,
      simulator: simulatorEnabled,
      searchExpanded
    };

    // startDispatch already notified the currently-offered drivers; this keeps
    // the richer payload (passenger info) flowing to them too.
    const offeredNow = (offeredRide as any).currentOfferDriverIds || [];
    if (offeredNow.length > 0) {
      emitToUsers(offeredNow.map(String), 'ride:request', payload);
    }

    if (simulatorEnabled) {
      scheduleDummyRideSimulation(String(ride._id));
    }

    return ok(
      {
        ride: offeredRide,
        notifiedDrivers: offeredNow.length,
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
