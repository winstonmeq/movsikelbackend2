import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { connectDb } from '@/lib/db';
import { requireActiveUser, statusForAuthError } from '@/lib/account';
import { fail, ok } from '@/lib/http';
import { withLogger } from '@/lib/logger';
import { User } from '@/models/User';
import { WalletTransaction } from '@/models/WalletTransaction';

/**
 * GET /api/driver/referral
 * Returns the driver's referral code, list of drivers they referred,
 * and total referral bonus earned.
 */
export const GET = withLogger(async function GET(req: NextRequest) {
  try {
    await connectDb();
    let auth;
    try {
      ({ auth } = await requireActiveUser(req));
    } catch (err) {
      return fail(err instanceof Error ? err.message : 'Unauthorized', statusForAuthError(err));
    }
    if (auth.role !== 'driver') return fail('Only drivers can access referral info', 403);

    const driver = await User.findById(auth.sub)
      .select('referralCode')
      .lean();
    if (!driver) return fail('Driver not found', 404);

    const referralCode = (driver as any).referralCode as string | undefined;

    // Drivers who joined using this driver's code
    const referrals = await User.find({ referredBy: new mongoose.Types.ObjectId(auth.sub) })
      .select('name phone createdAt referralBonusPaid')
      .sort({ createdAt: -1 })
      .lean();

    // Total referral bonus paid to this driver
    const bonusTxns = await WalletTransaction.find({
      driverId: new mongoose.Types.ObjectId(auth.sub),
      type: 'referral_bonus',
    }).lean();
    const totalBonus = bonusTxns.reduce((sum, t) => sum + t.amount, 0);

    return ok({
      referralCode: referralCode ?? null,
      totalReferrals: referrals.length,
      totalBonusEarned: totalBonus,
      referrals: referrals.map(r => ({
        name: (r as any).name,
        phone: (r as any).phone,
        joinedAt: (r as any).createdAt,
        bonusPaid: (r as any).referralBonusPaid ?? false,
      })),
    });
  } catch (err: unknown) {
    return fail(err instanceof Error ? err.message : 'Could not load referral info');
  }
});
