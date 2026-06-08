import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { connectDb } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { fail, ok } from '@/lib/http';
import { prepareDummyDriverCandidate, scheduleDummyRideSimulation, dummyDriverEnabled } from '@/lib/dummyDriver';
import { Ride } from '@/models/Ride';

export async function POST(req: NextRequest, context: { params: Promise<{ rideId: string }> }) {
  try {
    await connectDb();
    const auth = await getAuthUser(req);
    if (auth.role !== 'passenger') return fail('Only passengers can start a dummy ride simulation', 403);

    if (!dummyDriverEnabled()) {
      return fail('Dummy driver simulation is disabled. Set DUMMY_DRIVER_ENABLED=true only when you want demo mode.', 409);
    }

    const { rideId } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(rideId)) return fail('Invalid ride id');

    const ride = await Ride.findById(rideId);
    if (!ride) return fail('Ride not found', 404);
    if (String(ride.passengerId) !== auth.sub) return fail('Forbidden', 403);
    if (ride.status === 'completed' || ride.status === 'cancelled') {
      return ok({ ride, simulator: { started: false, message: 'Ride is already finished.' } });
    }

    await prepareDummyDriverCandidate(rideId);
    scheduleDummyRideSimulation(rideId, { force: true });

    const updatedRide = await Ride.findById(rideId).populate(
      'driverId',
      'name phone vehicleType plateNumber tricycleNumber currentLocation heading'
    );

    return ok({
      ride: updatedRide,
      simulator: {
        started: true,
        message: 'Dummy driver simulation started.'
      }
    });
  } catch (err: unknown) {
    return fail(err instanceof Error ? err.message : 'Could not start dummy driver simulation');
  }
}
