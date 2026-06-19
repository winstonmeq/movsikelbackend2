import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';

const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

redis.on('error', (err) => {
  console.error('[Redis] connection error:', err.message);
});

export default redis;

export const DRIVER_LOCATION_TTL = 60; // seconds — stale if no ping for 60s

export async function setDriverLocation(
  driverId: string,
  lat: number,
  lng: number,
  heading?: number
) {
  const key = `driver:location:${driverId}`;
  await redis.setex(
    key,
    DRIVER_LOCATION_TTL,
    JSON.stringify({ lat, lng, heading: heading ?? null, updatedAt: Date.now() })
  );
}

export async function getDriverLocation(driverId: string) {
  const val = await redis.get(`driver:location:${driverId}`);
  return val ? (JSON.parse(val) as { lat: number; lng: number; heading: number | null; updatedAt: number }) : null;
}

export async function deleteDriverLocation(driverId: string) {
  await redis.del(`driver:location:${driverId}`);
}

export async function getAllDriverLocations(): Promise<
  { driverId: string; lat: number; lng: number; heading: number | null; updatedAt: number }[]
> {
  const keys = await redis.keys('driver:location:*');
  if (keys.length === 0) return [];
  const values = await redis.mget(...keys);
  return keys
    .map((key, i) => {
      const val = values[i];
      if (!val) return null;
      const data = JSON.parse(val);
      return { driverId: key.replace('driver:location:', ''), ...data };
    })
    .filter(Boolean) as any;
}
