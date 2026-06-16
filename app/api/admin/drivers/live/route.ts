import { NextRequest } from 'next/server';
import { connectDb } from '@/lib/db';
import { ok } from '@/lib/http';
import { withAdmin } from '@/lib/admin';
import { onlineDriverFilter } from '@/lib/account';
import { User } from '@/models/User';

/**
 * Returns online drivers that have a known location, for the admin live map.
 * Lightweight on purpose (lean + minimal fields) since the map polls this
 * every ~10s while open.
 */
export async function GET(req: NextRequest) {
  return withAdmin(req, async () => {
    await connectDb();

    const docs = await User.find({
      role: 'driver',
      ...onlineDriverFilter(),
      'currentLocation.coordinates': { $exists: true, $ne: [] }
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
          updatedAt: d.updatedAt
        };
      })
      .filter(Boolean);

    return ok({ drivers, count: drivers.length });
  });
}
