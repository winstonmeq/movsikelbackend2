/**
 * Creates fake online drivers for dispatch/live-map testing.
 *
 * Dry-run by default:
 *   npm run seed:test-drivers
 *
 * Actually create/update 50 fake drivers around Kidapawan:
 *   SEED_TEST_DRIVERS_CONFIRM=yes npm run seed:test-drivers
 *
 * Useful options:
 *   TEST_DRIVER_COUNT=50
 *   TEST_DRIVER_CENTER_LAT=7.0156
 *   TEST_DRIVER_CENTER_LNG=125.089964
 *   TEST_DRIVER_RADIUS_METERS=1500
 *   TEST_DRIVER_REDIS_TTL_SECONDS=3600
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDb } from '../lib/db';
import redis from '../lib/redis';
import { User } from '../models/User';

const confirmSeed = String(process.env.SEED_TEST_DRIVERS_CONFIRM || '').toLowerCase() === 'yes';
const count = Math.max(1, Math.min(Number(process.env.TEST_DRIVER_COUNT || 50), 500));
const centerLat = Number(process.env.TEST_DRIVER_CENTER_LAT || 7.0156);
const centerLng = Number(process.env.TEST_DRIVER_CENTER_LNG || 125.089964);
const radiusMeters = Math.max(10, Number(process.env.TEST_DRIVER_RADIUS_METERS || 1500));
const redisTtlSeconds = Math.max(60, Number(process.env.TEST_DRIVER_REDIS_TTL_SECONDS || 3600));
const password = process.env.TEST_DRIVER_PASSWORD || 'testdriver123';

const DRIVER_GEO_KEY = 'drivers:geo';
const DRIVER_LOCATION_PREFIX = 'driver:location:';

function driverLocationKey(driverId: string) {
  return `${DRIVER_LOCATION_PREFIX}${driverId}`;
}

function offsetLatLng(index: number) {
  const angle = (index / count) * Math.PI * 2;
  const ring = 0.35 + ((index % 10) / 10) * 0.65;
  const distanceMeters = radiusMeters * ring;
  const latOffset = (Math.cos(angle) * distanceMeters) / 111_320;
  const lngOffset = (Math.sin(angle) * distanceMeters) / (111_320 * Math.cos((centerLat * Math.PI) / 180));
  return {
    lat: centerLat + latOffset,
    lng: centerLng + lngOffset,
    heading: Math.round((angle * 180) / Math.PI) % 360
  };
}

async function upsertDriver(index: number, passwordHash: string) {
  const suffix = String(index).padStart(3, '0');
  const phone = `099900${suffix}`;
  const plateNumber = `TEST-${suffix}`;
  const location = offsetLatLng(index - 1);
  const now = new Date();

  const driver = await User.findOneAndUpdate(
    { phone },
    {
      $set: {
        name: `Test Driver ${suffix}`,
        phone,
        passwordHash,
        role: 'driver',
        status: 'active',
        vehicleType: 'Tricycle',
        plateNumber,
        tricycleNumber: plateNumber,
        online: true,
        lastSeenAt: now,
        currentLocation: {
          type: 'Point',
          coordinates: [location.lng, location.lat]
        },
        heading: location.heading
      }
    },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  ).select('_id name phone plateNumber');

  const payload = {
    lat: location.lat,
    lng: location.lng,
    heading: location.heading,
    updatedAt: Date.now()
  };

  await redis
    .multi()
    .setex(driverLocationKey(String(driver._id)), redisTtlSeconds, JSON.stringify(payload))
    .call('GEOADD', DRIVER_GEO_KEY, location.lng, location.lat, String(driver._id))
    .exec();

  return driver;
}

async function main() {
  console.log(`Preparing ${count} fake online driver(s).`);
  console.log(`Center: ${centerLat}, ${centerLng}`);
  console.log(`Radius: ${radiusMeters}m`);
  console.log(`Redis TTL: ${redisTtlSeconds}s`);

  if (!confirmSeed) {
    console.log('\nDry run only. Set SEED_TEST_DRIVERS_CONFIRM=yes to create/update fake drivers.');
    return;
  }

  await redis.ping();
  await connectDb();
  const passwordHash = await bcrypt.hash(password, 12);

  const seeded = [];
  for (let index = 1; index <= count; index++) {
    seeded.push(await upsertDriver(index, passwordHash));
  }

  console.log(`\nSeeded ${seeded.length} fake online driver(s).`);
  console.log('They should appear on the admin live map until their Redis TTL expires.');
  console.log('Cleanup with: CLEAN_TEST_DRIVERS_CONFIRM=yes npm run cleanup:test-drivers');
}

main()
  .catch((err) => {
    console.error('Seed failed:', err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await Promise.allSettled([mongoose.connection.close(), redis.quit()]);
  });
