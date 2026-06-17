import { NextRequest } from 'next/server';
import { connectDb } from '@/lib/db';
import { ok } from '@/lib/http';
import { withAdmin, parsePaging } from '@/lib/admin';
import { Ride } from '@/models/Ride';
import { User } from '@/models/User';
void User; // register User schema for .populate()

const STATUSES = ['requested', 'accepted', 'arrived', 'in_progress', 'completed', 'cancelled', 'no_drivers'];

export async function GET(req: NextRequest) {
  return withAdmin(req, async () => {
    await connectDb();

    const url = new URL(req.url);
    const status = url.searchParams.get('status');
    const { page, limit, skip } = parsePaging(req);

    const query: Record<string, unknown> = {};
    if (status && STATUSES.includes(status)) query.status = status;

    const [rides, total] = await Promise.all([
      Ride.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('passengerId', 'name phone')
        .populate('driverId', 'name phone plateNumber')
        .lean(),
      Ride.countDocuments(query)
    ]);

    return ok({ rides, page, limit, total, pages: Math.ceil(total / limit) });
  });
}
