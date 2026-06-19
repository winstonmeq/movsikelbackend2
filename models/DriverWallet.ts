import mongoose from 'mongoose';

export interface IDriverWallet {
  driverId: mongoose.Types.ObjectId;
  balance: number;
  lifetimeDebits: number;
  lifetimeRewards: number;
  lifetimeTopUps: number;
  lifetimeReferralBonus: number;
  updatedAt: Date;
  createdAt: Date;
}

const schema = new mongoose.Schema<IDriverWallet>(
  {
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    balance: { type: Number, default: 0 },
    lifetimeDebits: { type: Number, default: 0 },
    lifetimeRewards: { type: Number, default: 0 },
    lifetimeTopUps: { type: Number, default: 0 },
    lifetimeReferralBonus: { type: Number, default: 0 }
  },
  { timestamps: true }
);

export const DriverWallet =
  (mongoose.models.DriverWallet as mongoose.Model<IDriverWallet>) ||
  mongoose.model<IDriverWallet>('DriverWallet', schema);
