/**
 * Removes seeded test drivers from MongoDB and their live-location keys from Redis.
 *
 * Dry-run by default:
 *   npm run cleanup:test-drivers
 *
 * Actually delete:
 *   CLEAN_TEST_DRIVERS_CONFIRM=yes npm run cleanup:test-drivers
 *
 * This only targets drivers with the test seed naming/phone patterns below.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDb } from '../lib/db';
import redis, { deleteDriverLocation } from '../lib/redis';
import { User } from '../models/User';

const confirmDelete = String(process.env.CLEAN_TEST_DRIVERS_CONFIRM || '').toLowerCase() === 'yes';

const testDriverFilter = {
  role: 'driver',
  $or: [
    { name: /^Test Driver \d{3}$/ },
    { phone: /^099900\d{3}$/ },
    { plateNumber: /^TEST-\d{3}$/ },
    { tricycleNumber: /^TEST-\d{3}$/ }
  ]
};

async function main() {
  await connectDb();

  const drivers = await User.find(testDriverFilter)
    .select('_id name phone plateNumber tricycleNumber')
    .sort({ phone: 1 })
    .lean();

  console.log(`Found ${drivers.length} seeded test driver(s).`);

  if (drivers.length > 0) {
    for (const driver of drivers) {
      console.log(
        `- ${String(driver._id)} | ${driver.name} | ${driver.phone} | ${driver.plateNumber || ''}`
      );
    }
  }

  if (!confirmDelete) {
    console.log('\nDry run only. Set CLEAN_TEST_DRIVERS_CONFIRM=yes to delete these test drivers.');
    return;
  }

  const driverIds = drivers.map((driver) => String(driver._id));

  let redisCleanupOk = true;
  for (const driverId of driverIds) {
    try {
      await deleteDriverLocation(driverId);
    } catch (err) {
      redisCleanupOk = false;
      console.warn(
        `Could not remove Redis live-location for ${driverId}: ${
          err instanceof Error ? err.message : err
        }`
      );
    }
  }

  const result = await User.deleteMany({ _id: { $in: driverIds } });
  console.log(`\nDeleted ${result.deletedCount || 0} test driver user(s).`);
  console.log(redisCleanupOk ? 'Removed matching Redis live-location entries.' : 'Mongo cleanup finished; Redis cleanup had warnings.');
}

main()
  .catch((err) => {
    console.error('Cleanup failed:', err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await Promise.allSettled([mongoose.connection.close(), redis.quit()]);
  });
