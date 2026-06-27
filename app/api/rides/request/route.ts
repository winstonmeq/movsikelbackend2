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
import '@/lib/dispatchWorker'; // self-starts the background progression timer (VPS)
import { User } from '@/models/User';
import { Ride } from '@/models/Ride';

import { withLogger } from '@/lib/logger';

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
    currentLocation: { $exists: true }
  })
    .select('name phone vehicleType plateNumber tricycleNumber currentLocation heading')
    .sort({ updatedAt: -1 })
    .limit(10);
}

export const POST = withLogger(async function POST(req: NextRequest) {
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

    const radiusMeters = body.searchRadiusMeters || Number(process.env.DRIVER_SEARCH_RADIUS_METERS || 15000);

    const driversForRequest = [...(await findNearbyRealDrivers(body.pickup, radiusMeters))];
    let searchExpanded = false;

    if (
      driversForRequest.length === 0 &&
      String(process.env.DISPATCH_ALL_ONLINE_DRIVERS_IF_NONE_NEARBY || 'false').toLowerCase() === 'true'
    ) {
      const onlineDrivers = await findAnyOnlineRealDrivers();
      driversForRequest.push(...onlineDrivers);
      searchExpanded = onlineDrivers.length > 0;
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
      searchExpanded
    };

    // startDispatch already notified the currently-offered drivers; this keeps
    // the richer payload (passenger info) flowing to them too.
    const offeredNow = (offeredRide as any).currentOfferDriverIds || [];
    if (offeredNow.length > 0) {
      emitToUsers(offeredNow.map(String), 'ride:request', payload);
    }

    return ok(
      {
        ride: offeredRide,
        notifiedDrivers: offeredNow.length,
        searchExpanded
      },
      201
    );
  } catch (err: unknown) {
    return fail(err instanceof Error ? err.message : 'Ride request failed');
  }
});
