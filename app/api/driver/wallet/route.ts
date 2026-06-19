import { NextRequest } from 'next/server';
import { connectDb } from '@/lib/db';
import { requireActiveUser, statusForAuthError } from '@/lib/account';
import { fail, ok } from '@/lib/http';
import { withLogger } from '@/lib/logger';
import { DriverWallet } from '@/models/DriverWallet';
import { WalletTransaction } from '@/models/WalletTransaction';
import { getOrCreateWallet } from '@/lib/wallet';
import { WALLET_MINIMUM_ACCEPT } from '@/lib/fareScheme';

export const GET = withLogger(async function GET(req: NextRequest) {
  try {
    await connectDb();
    let auth;
    try {
      ({ auth } = await requireActiveUser(req));
    } catch (err) {
      return fail(err instanceof Error ? err.message : 'Unauthorized', statusForAuthError(err));
    }
    if (auth.role !== 'driver') return fail('Only drivers can access the wallet', 403);

    const wallet = await getOrCreateWallet(auth.sub);
    const recent = await WalletTransaction.find({ driverId: wallet.driverId })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    return ok({
      wallet: {
        balance: wallet.balance,
        lifetimeDebits: wallet.lifetimeDebits,
        lifetimeRewards: wallet.lifetimeRewards,
        lifetimeTopUps: wallet.lifetimeTopUps,
        lifetimeReferralBonus: wallet.lifetimeReferralBonus,
        minimumAccept: WALLET_MINIMUM_ACCEPT,
        canAcceptBooking: wallet.balance >= WALLET_MINIMUM_ACCEPT,
      },
      transactions: recent.map(t => ({
        id: String(t._id),
        type: t.type,
        direction: t.direction,
        amount: t.amount,
        balanceAfter: t.balanceAfter,
        description: t.description,
        rideId: t.rideId ? String(t.rideId) : null,
        createdAt: t.createdAt,
      })),
    });
  } catch (err: unknown) {
    return fail(err instanceof Error ? err.message : 'Could not load wallet');
  }
});
