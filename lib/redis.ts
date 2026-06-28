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

export const DRIVER_LOCATION_TTL = 60;
const DRIVER_LOCATION_PREFIX = 'driver:location:';
const DRIVER_GEO_KEY = 'drivers:geo';
const DRIVER_RESERVATION_PREFIX = 'driver:reserved:';

type DriverLocation = {
  lat: number;
  lng: number;
  heading: number | null;
  updatedAt: number;
};

function driverLocationKey(driverId: string) {
  return `${DRIVER_LOCATION_PREFIX}${driverId}`;
}

function driverReservationKey(driverId: string) {
  return `${DRIVER_RESERVATION_PREFIX}${driverId}`;
}

function parseDriverLocation(value: string | null): DriverLocation | null {
  if (!value) return null;
  try {
    const data = JSON.parse(value) as DriverLocation;
    if (typeof data.lat !== 'number' || typeof data.lng !== 'number') return null;
    return data;
  } catch {
    return null;
  }
}

export async function setDriverLocation(
  driverId: string,
  lat: number,
  lng: number,
  heading?: number
) {
  await redis
    .multi()
    .setex(
      driverLocationKey(driverId),
      DRIVER_LOCATION_TTL,
      JSON.stringify({ lat, lng, heading: heading ?? null, updatedAt: Date.now() })
    )
    .call('GEOADD', DRIVER_GEO_KEY, lng, lat, driverId)
    .exec();
}

export async function getDriverLocation(driverId: string) {
  return parseDriverLocation(await redis.get(driverLocationKey(driverId)));
}

export async function deleteDriverLocation(driverId: string) {
  await redis.multi().del(driverLocationKey(driverId)).zrem(DRIVER_GEO_KEY, driverId).exec();
}

export async function reserveDriverForRide(driverId: string, rideId: string, ttlMs: number) {
  const result = await redis.set(driverReservationKey(driverId), rideId, 'PX', ttlMs, 'NX');
  return result === 'OK';
}

export async function reserveDriversForRide(driverIds: string[], rideId: string, ttlMs: number) {
  const reserved: string[] = [];
  for (const driverId of driverIds) {
    if (await reserveDriverForRide(driverId, rideId, ttlMs)) {
      reserved.push(driverId);
    }
  }
  return reserved;
}

export async function reservedDriverIdSet(driverIds: string[]) {
  if (driverIds.length === 0) return new Set<string>();

  const values = await redis.mget(...driverIds.map(driverReservationKey));
  return new Set(driverIds.filter((_, i) => Boolean(values[i])));
}

export async function releaseDriverReservations(driverIds: string[], rideId: string) {
  if (driverIds.length === 0) return;

  await Promise.all(
    driverIds.map((driverId) =>
      redis.eval(
        "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) else return 0 end",
        1,
        driverReservationKey(driverId),
        rideId
      )
    )
  );
}

export async function getAllDriverLocations(): Promise<
  { driverId: string; lat: number; lng: number; heading: number | null; updatedAt: number }[]
> {
  const driverIds = await redis.zrange(DRIVER_GEO_KEY, 0, -1);
  if (driverIds.length === 0) return [];

  const values = await redis.mget(...driverIds.map(driverLocationKey));
  const staleDriverIds: string[] = [];
  const locations = driverIds
    .map((driverId, i) => {
      const data = parseDriverLocation(values[i] ?? null);
      if (!data) {
        staleDriverIds.push(driverId);
        return null;
      }
      return { driverId, ...data };
    })
    .filter(Boolean) as {
      driverId: string;
      lat: number;
      lng: number;
      heading: number | null;
      updatedAt: number;
    }[];

  if (staleDriverIds.length > 0) {
    await redis.zrem(DRIVER_GEO_KEY, ...staleDriverIds);
  }

  return locations;
}

export async function getNearbyOnlineDriverIds(
  pickup: { lat: number; lng: number },
  radiusMeters: number
): Promise<string[] | null> {
  const driverIds = (await redis.call(
    'GEOSEARCH',
    DRIVER_GEO_KEY,
    'FROMLONLAT',
    pickup.lng,
    pickup.lat,
    'BYRADIUS',
    radiusMeters,
    'm',
    'ASC',
    'COUNT',
    100
  )) as string[];

  if (driverIds.length === 0) {
    const totalGeoDrivers = await redis.zcard(DRIVER_GEO_KEY);
    return totalGeoDrivers === 0 ? null : [];
  }

  const values = await redis.mget(...driverIds.map(driverLocationKey));
  const staleDriverIds: string[] = [];
  const freshDriverIds = driverIds.filter((driverId, i) => {
    const data = parseDriverLocation(values[i] ?? null);
    if (data) return true;
    staleDriverIds.push(driverId);
    return false;
  });

  if (staleDriverIds.length > 0) {
    await redis.zrem(DRIVER_GEO_KEY, ...staleDriverIds);
  }

  return freshDriverIds;
}
