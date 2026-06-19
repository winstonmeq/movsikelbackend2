import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { z } from 'zod';
import { connectDb } from '@/lib/db';
import { fail, ok } from '@/lib/http';
import { withAdmin } from '@/lib/admin';
import { withLogger } from '@/lib/logger';
import { User } from '@/models/User';
import { DriverWallet } from '@/models/DriverWallet';
import { WalletTransaction } from '@/models/WalletTransaction';
import { creditWallet, debitWallet } from '@/lib/wallet';

const topupSchema = z.object({
  driverId: z.string().min(1),
  amount: z.number().positive('Amount must be positive'),
  note: z.string().trim().min(1, 'Note is required').max(200),
  direction: z.enum(['credit', 'debit']).default('credit'),
});

/**
 * GET /api/admin/wallet — list all driver wallets with balance summary
 */
export const GET = withLogger(async function GET(req: NextRequest) {
  return withAdmin(req, async () => {
    await connectDb();

    const url = new URL(req.url);
    const search = url.searchParams.get('search')?.trim() ?? '';
    const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
    const limit = Math.min(50, Number(url.searchParams.get('limit') ?? 20));
    const skip = (page - 1) * limit;

    // Match drivers by name/phone if search provided
    const userFilter: Record<string, unknown> = { role: 'driver' };
    if (search) {
      userFilter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const drivers = await User.find(userFilter)
      .select('_id name phone')
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await User.countDocuments(userFilter);

    const driverIds = drivers.map(d => d._id);
    const wallets = await DriverWallet.find({ driverId: { $in: driverIds } }).lean();
    const walletMap = new Map(wallets.map(w => [String(w.driverId), w]));

    // Platform summary stats
    const [feeSummary, rewardSummary, topupSummary, referralSummary] = await Promise.all([
      WalletTransaction.aggregate([{ $match: { type: 'fee' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      WalletTransaction.aggregate([{ $match: { type: 'reward' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      WalletTransaction.aggregate([{ $match: { type: 'topup' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      WalletTransaction.aggregate([{ $match: { type: 'referral_bonus' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    ]);

    return ok({
      drivers: drivers.map(d => {
        const w = walletMap.get(String(d._id));
        return {
          driverId: String(d._id),
          name: (d as any).name,
          phone: (d as any).phone,
          balance: w?.balance ?? 0,
          lifetimeDebits: w?.lifetimeDebits ?? 0,
          lifetimeRewards: w?.lifetimeRewards ?? 0,
          lifetimeTopUps: w?.lifetimeTopUps ?? 0,
          lifetimeReferralBonus: w?.lifetimeReferralBonus ?? 0,
        };
      }),
      page, limit, total,
      pages: Math.ceil(total / limit),
      summary: {
        totalFeesCollected: feeSummary[0]?.total ?? 0,
        totalRewardsPaid: rewardSummary[0]?.total ?? 0,
        totalTopUps: topupSummary[0]?.total ?? 0,
        totalReferralBonus: referralSummary[0]?.total ?? 0,
        netPlatformRevenue:
          (feeSummary[0]?.total ?? 0) -
          (rewardSummary[0]?.total ?? 0) -
          (referralSummary[0]?.total ?? 0),
      },
    });
  });
});

/**
 * POST /api/admin/wallet — top up or manually adjust a driver wallet
 */
export const POST = withLogger(async function POST(req: NextRequest) {
  return withAdmin(req, async () => {
    await connectDb();

    const raw = await req.json().catch(() => null);
    if (!raw || typeof raw !== 'object') return fail('Invalid body', 400);

    const parsed = topupSchema.safeParse(raw);
    if (!parsed.success) return fail(parsed.error.issues.map(i => i.message).join(' '), 400);
    const { driverId, amount, note, direction } = parsed.data;

    if (!mongoose.Types.ObjectId.isValid(driverId)) return fail('Invalid driver id', 400);

    const driver = await User.findOne({ _id: driverId, role: 'driver' }).select('_id name').lean();
    if (!driver) return fail('Driver not found', 404);

    const wallet = direction === 'credit'
      ? await creditWallet({ driverId, amount, type: 'topup', description: `Admin top-up: ${note}` })
      : await debitWallet({ driverId, amount, type: 'adjustment', description: `Admin adjustment: ${note}` });

    return ok({ wallet: { balance: wallet.balance }, driverId, amount, direction, note });
  });
});
