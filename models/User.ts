import mongoose from 'mongoose';

export type UserRole = 'passenger' | 'driver';

export interface IUser {
  name: string;
  phone: string;
  passwordHash: string;
  role: UserRole;
  homeBarangay?: string;
  homeAddress?: string;
  vehicleType?: string;
  plateNumber?: string;
  tricycleNumber?: string;
  online: boolean;
  currentLocation?: {
    type: 'Point';
    coordinates: [number, number];
  };
  heading?: number;
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
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['passenger', 'driver'], required: true, index: true },
    homeBarangay: { type: String, trim: true },
    homeAddress: { type: String, trim: true },
    vehicleType: { type: String, default: 'Tricycle' },
    plateNumber: { type: String },
    tricycleNumber: { type: String },
    online: { type: Boolean, default: false, index: true },
    currentLocation: { type: pointSchema },
    heading: { type: Number }
  },
  { timestamps: true }
);

userSchema.index({ currentLocation: '2dsphere' });

export const User = (mongoose.models.User as mongoose.Model<IUser>) || mongoose.model<IUser>('User', userSchema);
export type UserDocument = mongoose.HydratedDocument<IUser>;
