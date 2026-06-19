import mongoose from 'mongoose';

export type UserRole = 'passenger' | 'driver' | 'admin';
export type UserStatus = 'active' | 'suspended' | 'banned';

export interface IUser {
  name: string;
  phone: string;
  passwordHash: string;
  googleId?: string;
  email?: string;
  fcmToken?: string;
  role: UserRole;
  status: UserStatus;
  homeBarangay?: string;
  homeAddress?: string;
  vehicleType?: string;
  plateNumber?: string;
  tricycleNumber?: string;
  online: boolean;
  lastSeenAt?: Date;
  currentLocation?: {
    type: 'Point';
    coordinates: [number, number];
  };
  heading?: number;
  // Referral fields (drivers only)
  referralCode?: string;
  referredBy?: mongoose.Types.ObjectId;
  referralBonusPaid?: boolean; // true once the ₱10 bonus has been credited to referrer
  createdAt: Date;
  updatedAt: Date;
}

const pointSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true }
  },
  { _id: false }
);

const userSchema = new mongoose.Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, unique: true, index: true, trim: true },
    passwordHash: { type: String, default: '' },
    googleId: { type: String, sparse: true, index: true },
    email: { type: String, trim: true, sparse: true, index: true },
    fcmToken: { type: String },
    role: { type: String, enum: ['passenger', 'driver', 'admin'], required: true, index: true },
    status: { type: String, enum: ['active', 'suspended', 'banned'], default: 'active', index: true },
    homeBarangay: { type: String, trim: true },
    homeAddress: { type: String, trim: true },
    vehicleType: { type: String, default: 'Tricycle' },
    plateNumber: { type: String },
    tricycleNumber: { type: String },
    online: { type: Boolean, default: false, index: true },
    lastSeenAt: { type: Date, index: true },
    currentLocation: { type: pointSchema },
    heading: { type: Number },
    referralCode: { type: String, sparse: true, index: true, trim: true },
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    referralBonusPaid: { type: Boolean, default: false }
  },
  { timestamps: true }
);

userSchema.index({ currentLocation: '2dsphere' });

export const User = (mongoose.models.User as mongoose.Model<IUser>) || mongoose.model<IUser>('User', userSchema);
export type UserDocument = mongoose.HydratedDocument<IUser>;
