import mongoose from 'mongoose';
import { toPoint, type LatLng } from '@/lib/geo';
import { emitToUser } from '@/lib/realtime';
import { User } from '@/models/User';
import { Ride, type RideStatus } from '@/models/Ride';

const DUMMY_PHONE = '09000000000';
const DUMMY_NAME = 'Juan Demo Driver';

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const runningSimulations = new Set<string>();

export function dummyDriverEnabled() {
  return String(process.env.DUMMY_DRIVER_ENABLED || '').toLowerCase() === 'true';
}

function numberFromEnv(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function driverStartNearPickup(pickup: LatLng): LatLng {
  // Roughly 300-450 meters away, enough to visibly move on the map.
  return {
    lat: pickup.lat + 0.0028,
    lng: pickup.lng + 0.0028
  };
}

function bearing(from: LatLng, to: LatLng) {
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;
  const deltaLng = ((to.lng - from.lng) * Math.PI) / 180;
  const y = Math.sin(deltaLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);
  return (Math.atan2(y, x) * 180) / Math.PI;
}

function interpolate(from: LatLng, to: LatLng, step: number, totalSteps: number): LatLng {
  const ratio = step / totalSteps;
  return {
    lat: from.lat + (to.lat - from.lat) * ratio,
    lng: from.lng + (to.lng - from.lng) * ratio
  };
}

function publicDriver(driver: any) {
  return {
    _id: String(driver._id),
    id: String(driver._id),
    name: driver.name,
    phone: driver.phone,
    vehicleType: driver.vehicleType,
    plateNumber: driver.plateNumber,
    tricycleNumber: driver.tricycleNumber,
    currentLocation: driver.currentLocation,
    heading: driver.heading
  };
}

async function updateDummyLocation(driverId: mongoose.Types.ObjectId, location: LatLng, heading: number) {
  return User.findByIdAndUpdate(
    driverId,
    {
      online: true,
      currentLocation: toPoint(location),
      heading
    },
    { returnDocument: 'after' }
  ).select('name phone vehicleType plateNumber tricycleNumber currentLocation heading');
}

export async function ensureDummyDriverNearPickup(pickup: LatLng) {
  const start = driverStartNearPickup(pickup);

  const driver = await User.findOneAndUpdate(
    { phone: DUMMY_PHONE },
    {
      $setOnInsert: {
        name: DUMMY_NAME,
        phone: DUMMY_PHONE,
        passwordHash: 'dummy-driver-not-for-login',
        role: 'driver',
        vehicleType: 'Tricycle',
        plateNumber: 'DEMO-001',
        tricycleNumber: 'MSK-001'
      },
      $set: {
        online: true,
        currentLocation: toPoint(start),
        heading: bearing(start, pickup)
      }
    },
    { upsert: true, returnDocument: 'after' }
  ).select('name phone role vehicleType plateNumber tricycleNumber currentLocation heading');

  return driver;
}

async function latestRide(rideId: string) {
  if (!mongoose.Types.ObjectId.isValid(rideId)) return null;
  return Ride.findById(rideId);
}

async function emitRideUpdate(rideId: string, driver: any, extra: Record<string, unknown> = {}) {
  const ride = await latestRide(rideId);
  if (!ride) return null;

  console.log(`[dummy-driver] ride ${rideId} status -> ${status}`);

  emitToUser(String(ride.passengerId), 'ride:update', {
    ride,
    driver: publicDriver(driver),
    simulator: true,
    ...extra
  });

  return ride;
}

async function setRideStatus(rideId: string, status: RideStatus, driver: any) {
  const updates: Record<string, unknown> = { status };
  if (status === 'accepted') updates.acceptedAt = new Date();
  if (status === 'arrived') updates.arrivedAt = new Date();
  if (status === 'in_progress') updates.startedAt = new Date();
  if (status === 'completed') updates.completedAt = new Date();
  if (status === 'cancelled') updates.cancelledAt = new Date();

  const ride = await Ride.findByIdAndUpdate(rideId, updates, { returnDocument: 'after' });
  if (!ride) return null;

  console.log(`[dummy-driver] ride ${rideId} status -> ${status}`);

  emitToUser(String(ride.passengerId), 'ride:update', {
    ride,
    driver: publicDriver(driver),
    simulator: true
  });

  return ride;
}

async function shouldContinue(rideId: string) {
  const ride = await latestRide(rideId);
  return Boolean(ride && ['requested', 'accepted', 'arrived', 'in_progress'].includes(ride.status));
}

async function moveDriver(
  rideId: string,
  driverId: mongoose.Types.ObjectId,
  from: LatLng,
  to: LatLng,
  status: RideStatus,
  steps: number,
  delayMs: number
) {
  for (let step = 1; step <= steps; step += 1) {
    if (!(await shouldContinue(rideId))) return null;

    const location = interpolate(from, to, step, steps);
    const heading = bearing(from, to);
    const driver = await updateDummyLocation(driverId, location, heading);
    const ride = await latestRide(rideId);

    if (driver && ride) {
      emitToUser(String(ride.passengerId), 'ride:driver_location', {
        rideId: String(ride._id),
        lat: location.lat,
        lng: location.lng,
        heading,
        status
      });
    }

    await sleep(delayMs);
  }

  return to;
}


export async function prepareDummyDriverCandidate(rideId: string) {
  const ride = await latestRide(rideId);
  if (!ride) return null;
  if (ride.status === 'completed' || ride.status === 'cancelled') return null;

  const pickup = { lat: ride.pickup.lat, lng: ride.pickup.lng };
  const driver = await ensureDummyDriverNearPickup(pickup);
  const driverId = driver._id as mongoose.Types.ObjectId;

  const existing = (ride.candidateDriverIds || []).map(String);
  if (!existing.includes(String(driverId))) {
    ride.candidateDriverIds = [...existing, String(driverId)].map((id) => new mongoose.Types.ObjectId(id));
    await ride.save();
  }

  await emitRideUpdate(rideId, driver, { message: 'Dummy driver simulation is ready.' });
  return driver;
}

export function scheduleDummyRideSimulation(rideId: string, options: { force?: boolean } = {}) {
  if (!options.force && !dummyDriverEnabled()) return;
  if (runningSimulations.has(rideId)) return;

  runningSimulations.add(rideId);
  void runDummyRideSimulation(rideId)
    .catch((err) => {
      console.error('Dummy driver simulation failed:', err);
    })
    .finally(() => {
      runningSimulations.delete(rideId);
    });
}

async function runDummyRideSimulation(rideId: string) {
  const acceptDelayMs = numberFromEnv('DUMMY_DRIVER_ACCEPT_DELAY_MS', 2500);
  const statusDelayMs = numberFromEnv('DUMMY_DRIVER_STATUS_DELAY_MS', 1500);
  const moveDelayMs = numberFromEnv('DUMMY_DRIVER_MOVE_DELAY_MS', 900);
  const pickupSteps = numberFromEnv('DUMMY_DRIVER_PICKUP_STEPS', 10);
  const destinationSteps = numberFromEnv('DUMMY_DRIVER_DESTINATION_STEPS', 16);

  await sleep(acceptDelayMs);

  let ride = await latestRide(rideId);
  if (!ride || ride.status !== 'requested') return;

  const pickup = { lat: ride.pickup.lat, lng: ride.pickup.lng };
  const destination = { lat: ride.destination.lat, lng: ride.destination.lng };
  const start = driverStartNearPickup(pickup);
  let driver = await ensureDummyDriverNearPickup(pickup);
  const driverId = driver._id as mongoose.Types.ObjectId;

  ride.driverId = driverId;
  ride.status = 'accepted';
  ride.acceptedAt = new Date();
  ride.candidateDriverIds = [...new Set([...(ride.candidateDriverIds || []).map(String), String(driverId)])].map(
    (id) => new mongoose.Types.ObjectId(id)
  );
  await ride.save();
  console.log(`[dummy-driver] ride ${rideId} status -> accepted`);
  await emitRideUpdate(rideId, driver, { message: 'Dummy driver accepted the ride.' });

  await moveDriver(rideId, driverId, start, pickup, 'accepted', pickupSteps, moveDelayMs);
  if (!(await shouldContinue(rideId))) return;

  driver = await updateDummyLocation(driverId, pickup, bearing(start, pickup));
  if (!driver) return;
  ride = await setRideStatus(rideId, 'arrived', driver);
  if (!ride) return;

  await sleep(statusDelayMs);
  if (!(await shouldContinue(rideId))) return;

  ride = await setRideStatus(rideId, 'in_progress', driver);
  if (!ride) return;

  await moveDriver(rideId, driverId, pickup, destination, 'in_progress', destinationSteps, moveDelayMs);
  if (!(await shouldContinue(rideId))) return;

  driver = await updateDummyLocation(driverId, destination, bearing(pickup, destination));
  if (!driver) return;
  await setRideStatus(rideId, 'completed', driver);
}
