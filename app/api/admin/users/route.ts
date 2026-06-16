import { NextRequest } from 'next/server';
import { connectDb } from '@/lib/db';
import { ok } from '@/lib/http';
import { withAdmin, parsePaging, publicUserForAdmin } from '@/lib/admin';
import { User } from '@/models/User';

export async function GET(req: NextRequest) {
  return withAdmin(req, async () => {
    await connectDb();

    const url = new URL(req.url);
    const search = (url.searchParams.get('search') || '').trim();
    const role = url.searchParams.get('role'); // passenger | driver | admin
    const status = url.searchParams.get('status'); // active | suspended | banned
    const { page, limit, skip } = parsePaging(req);

    const query: Record<string, unknown> = {};
    if (role && ['passenger', 'driver', 'admin'].includes(role)) query.role = role;
    if (status && ['active', 'suspended', 'banned'].includes(status)) query.status = status;
    if (search) {
      const safe = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { name: { $regex: safe, $options: 'i' } },
        { phone: { $regex: safe, $options: 'i' } }
      ];
    }

    const [docs, total] = await Promise.all([
      User.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      User.countDocuments(query)
    ]);

    return ok({
      users: docs.map(publicUserForAdmin),
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    });
  });
}
