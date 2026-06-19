import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { connectDb } from '@/lib/db';
import { fail, ok } from '@/lib/http';
import { withAdmin } from '@/lib/admin';
import { withLogger } from '@/lib/logger';
import { WalletTransaction } from '@/models/WalletTransaction';
import { User } from '@/models/User';
void User;

/**
 * GET /api/admin/wallet/transactions
 * Paginated ledger — filterable by driverId, type, date range.
 */
export const GET = withLogger(async function GET(req: NextRequest) {
  return withAdmin(req, async () => {
    await connectDb();

    const url = new URL(req.url);
    const driverId = url.searchParams.get('driverId');
    const type = url.searchParams.get('type');
    const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
    const limit = Math.min(100, Number(url.searchParams.get('limit') ?? 30));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (driverId && mongoose.Types.ObjectId.isValid(driverId)) {
      filter.driverId = new mongoose.Types.ObjectId(driverId);
    }
    if (type) filter.type = type;

    const [transactions, total] = await Promise.all([
      WalletTransaction.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('driverId', 'name phone')
        .lean(),
      WalletTransaction.countDocuments(filter),
    ]);

    return ok({
      transactions: transactions.map(t => ({
        id: String(t._id),
        driver: {
          id: String((t as any).driverId?._id ?? t.driverId),
          name: (t as any).driverId?.name ?? '—',
          phone: (t as any).driverId?.phone ?? '—',
        },
        type: t.type,
        direction: t.direction,
        amount: t.amount,
        balanceAfter: t.balanceAfter,
        description: t.description,
        rideId: t.rideId ? String(t.rideId) : null,
        createdAt: t.createdAt,
      })),
      page, limit, total,
      pages: Math.ceil(total / limit),
    });
  });
});
