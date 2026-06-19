import mongoose from 'mongoose';
import { DriverWallet } from '@/models/DriverWallet';
import { WalletTransaction, TxType, TxDirection } from '@/models/WalletTransaction';

interface CreditOpts {
  driverId: string | mongoose.Types.ObjectId;
  amount: number;
  type: TxType;
  description: string;
  rideId?: string | mongoose.Types.ObjectId;
  session?: mongoose.ClientSession;
}

interface DebitOpts extends CreditOpts {}

/**
 * Atomically credit a driver's wallet and record the transaction.
 * Creates the wallet document if it doesn't exist yet.
 */
export async function creditWallet(opts: CreditOpts) {
  const { driverId, amount, type, description, rideId, session } = opts;
  const id = typeof driverId === 'string' ? new mongoose.Types.ObjectId(driverId) : driverId;

  const field =
    type === 'topup' ? 'lifetimeTopUps' :
    type === 'reward' ? 'lifetimeRewards' :
    type === 'referral_bonus' ? 'lifetimeReferralBonus' : undefined;

  const inc: Record<string, number> = { balance: amount };
  if (field) inc[field] = amount;

  const wallet = await DriverWallet.findOneAndUpdate(
    { driverId: id },
    { $inc: inc },
    { upsert: true, returnDocument: 'after', session }
  );

  await WalletTransaction.create(
    [{
      driverId: id,
      type,
      direction: 'credit' as TxDirection,
      amount,
      balanceAfter: wallet!.balance,
      rideId: rideId ? new mongoose.Types.ObjectId(rideId as string) : undefined,
      description,
    }],
    { session }
  );

  return wallet!;
}

/**
 * Atomically debit a driver's wallet and record the transaction.
 * Wallet CAN go negative (driver is blocked from next accept — not from completion).
 */
export async function debitWallet(opts: DebitOpts) {
  const { driverId, amount, type, description, rideId, session } = opts;
  const id = typeof driverId === 'string' ? new mongoose.Types.ObjectId(driverId) : driverId;

  const inc: Record<string, number> = { balance: -amount };
  if (type === 'fee') inc['lifetimeDebits'] = amount;

  const wallet = await DriverWallet.findOneAndUpdate(
    { driverId: id },
    { $inc: inc },
    { upsert: true, returnDocument: 'after', session }
  );

  await WalletTransaction.create(
    [{
      driverId: id,
      type,
      direction: 'debit' as TxDirection,
      amount,
      balanceAfter: wallet!.balance,
      rideId: rideId ? new mongoose.Types.ObjectId(rideId as string) : undefined,
      description,
    }],
    { session }
  );

  return wallet!;
}

/** Get or create a driver's wallet. */
export async function getOrCreateWallet(driverId: string | mongoose.Types.ObjectId) {
  const id = typeof driverId === 'string' ? new mongoose.Types.ObjectId(driverId) : driverId;
  const wallet = await DriverWallet.findOneAndUpdate(
    { driverId: id },
    { $setOnInsert: { driverId: id, balance: 0 } },
    { upsert: true, returnDocument: 'after' }
  );
  return wallet!;
}
