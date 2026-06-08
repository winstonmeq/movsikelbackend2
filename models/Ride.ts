import mongoose from 'mongoose';

export type RideType = 'shared' | 'book';

export type RideStatus =
  | 'requested'
  | 'accepted'
  | 'arrived'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface IRideLocation {
  label?: string;
  name?: string;
  placeId?: string;
  address: string;
  lat: number;
  lng: number;
}

export interface IRide {
  passengerId: mongoose.Types.ObjectId;
  driverId?: mongoose.Types.ObjectId;
  pickup: IRideLocation;
  destination: IRideLocation;
  status: RideStatus;
  rideType: RideType;
  fareEstimate: number;
  offeredFare?: number;
  distanceMeters?: number;
  durationSeconds?: number;
  candidateDriverIds: mongoose.Types.ObjectId[];
  acceptedAt?: Date;
  arrivedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const locationSchema = new mongoose.Schema<IRideLocation>(
  {
    label: { type: String },
    name: { type: String },
    placeId: { type: String },
    address: { type: String, required: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  { _id: false }
);

const rideSchema = new mongoose.Schema<IRide>(
  {
    passengerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    pickup: { type: locationSchema, required: true },
    destination: { type: locationSchema, required: true },
    status: {
      type: String,
      enum: ['requested', 'accepted', 'arrived', 'in_progress', 'completed', 'cancelled'],
      default: 'requested',
      index: true
    },
    rideType: {
      type: String,
      enum: ['shared', 'book'],
      default: 'book',
      index: true
    },
    fareEstimate: { type: Number, required: true },
    offeredFare: { type: Number },
    distanceMeters: { type: Number },
    durationSeconds: { type: Number },
    candidateDriverIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    acceptedAt: { type: Date },
    arrivedAt: { type: Date },
    startedAt: { type: Date },
    completedAt: { type: Date },
    cancelledAt: { type: Date }
  },
  { timestamps: true }
);

export const Ride = mongoose.models.Ride || mongoose.model<IRide>('Ride', rideSchema);
export type RideDocument = mongoose.HydratedDocument<IRide>;
