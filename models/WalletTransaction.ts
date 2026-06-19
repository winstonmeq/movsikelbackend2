import mongoose from 'mongoose';

export type TxType = 'topup' | 'fee' | 'reward' | 'referral_bonus' | 'adjustment';
export type TxDirection = 'credit' | 'debit';

export interface IWalletTransaction {
  driverId: mongoose.Types.ObjectId;
  type: TxType;
  direction: TxDirection;
  amount: number;
  balanceAfter: number;
  rideId?: mongoose.Types.ObjectId;
  description: string;
  createdAt: Date;
}

const schema = new mongoose.Schema<IWalletTransaction>(
  {
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['topup', 'fee', 'reward', 'referral_bonus', 'adjustment'], required: true },
    direction: { type: String, enum: ['credit', 'debit'], required: true },
    amount: { type: Number, required: true, min: 0 },
    balanceAfter: { type: Number, required: true },
    rideId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ride', index: true, sparse: true },
    description: { type: String, required: true, trim: true }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const WalletTransaction =
  (mongoose.models.WalletTransaction as mongoose.Model<IWalletTransaction>) ||
  mongoose.model<IWalletTransaction>('WalletTransaction', schema);
