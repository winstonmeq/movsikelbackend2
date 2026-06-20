import { NextRequest } from 'next/server';
import { connectDb } from '@/lib/db';
import { ok } from '@/lib/http';
import { withAdmin } from '@/lib/admin';
import { onlineDriverFilter } from '@/lib/account';
import { getAllDriverLocations } from '@/lib/redis';
import { User } from '@/models/User';

/**
 * Returns online drivers with live locations from Redis (fast in-memory read).
 * Falls back to MongoDB if Redis has no data.
 */
export async function GET(req: NextRequest) {
  return withAdmin(req, async () => {
    await connectDb();

    const redisLocations = await getAllDriverLocations();

    if (redisLocations.length > 0) {
      const driverIds = redisLocations.map((d) => d.driverId);
      // Cross-check against the DB: only include drivers who are genuinely online
      // (online:true AND seen within the freshness window). A stale Redis key
      // for a driver who has since gone offline won't slip through.
      const users = await User.find({
        _id: { $in: driverIds },
        role: 'driver',
        ...onlineDriverFilter()
      })
        .select('name phone plateNumber tricycleNumber')
        .lean();

      const userMap = new Map(users.map((u: any) => [String(u._id), u]));

      const drivers = redisLocations
        .map((loc) => {
          const user = userMap.get(loc.driverId);
          if (!user) return null;
          return {
            id: loc.driverId,
            name: (user as any).name,
            phone: (user as any).phone,
            plateNumber: (user as any).plateNumber ?? '',
            tricycleNumber: (user as any).tricycleNumber ?? '',
            lat: loc.lat,
            lng: loc.lng,
            heading: loc.heading,
            updatedAt: new Date(loc.updatedAt).toISOString(),
          };
        })
        .filter(Boolean);

      return ok({ drivers, count: drivers.length });
    }

    // Fallback to MongoDB if Redis is empty. Must apply the SAME online +
    // freshness filter, otherwise every driver who ever shared a location once
    // would appear "online" forever.
    const docs = await User.find({
      role: 'driver',
      'currentLocation.coordinates': { $exists: true, $ne: [] },
      ...onlineDriverFilter()
    })
      .select('name phone plateNumber tricycleNumber currentLocation heading updatedAt')
      .limit(500)
      .lean();

    const drivers = docs
      .map((d: any) => {
        const coords = d.currentLocation?.coordinates;
        if (!Array.isArray(coords) || coords.length < 2) return null;
        return {
          id: String(d._id),
          name: d.name,
          phone: d.phone,
          plateNumber: d.plateNumber ?? '',
          tricycleNumber: d.tricycleNumber ?? '',
          lng: coords[0],
          lat: coords[1],
          heading: typeof d.heading === 'number' ? d.heading : null,
          updatedAt: d.updatedAt,
        };
      })
      .filter(Boolean);

    return ok({ drivers, count: drivers.length });
  });
}
