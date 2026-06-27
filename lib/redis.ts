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

/**
 * Live presence for dispatch: every driver currently in the Redis location set
 * (i.e. pinged within the {@link DRIVER_LOCATION_TTL} window) within
 * `radiusMeters` of `pickup`, **nearest first**.
 *
 * This is the SAME source the admin Live Map reads, so "online on the map"
 * means "eligible for dispatch" — no drift between a Mongo freshness window and
 * the Redis TTL. Identity/ban checks are layered on top in the dispatch layer;
 * this only answers "who is physically near and recently seen".
 *
 * Returns `null` (not `[]`) when Redis has no presence data at all, so callers
 * can distinguish "Redis empty → fall back to Mongo" from "Redis has drivers,
 * none nearby".
 */
export async function getNearbyOnlineDriverIds(
  pickup: { lat: number; lng: number },
  radiusMeters: number
): Promise<string[] | null> {
  const all = await getAllDriverLocations();
  if (all.length === 0) return null;

  const withDistance = all
    .map((d) => ({
      driverId: d.driverId,
      distance: haversineMeters(pickup, { lat: d.lat, lng: d.lng }),
    }))
    .filter((d) => Number.isFinite(d.distance) && d.distance <= radiusMeters)
    .sort((a, b) => a.distance - b.distance);

  return withDistance.map((d) => d.driverId);
}

/**
 * Local haversine to keep this module free of a cross-import cycle with
 * lib/geo.ts (geo imports nothing from redis, but dispatch imports both).
 */
function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
