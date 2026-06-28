import mongoose from 'mongoose';

export type RideType = 'shared' | 'book';

export type RideStatus =
  | 'requested'
  | 'accepted'
  | 'arrived'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_drivers';

export interface IRideLocation {
  label?: string;
  name?: string;
  placeId?: string;
  address: string;
  lat: number;
  lng: number;
}

export interface IRideDispatchMetrics {
  dispatchStartedAt?: Date;
  firstOfferedAt?: Date;
  lastOfferedAt?: Date;
  noDriversAt?: Date;
  firstOfferLatencyMs?: number;
  acceptLatencyMs?: number;
  dispatchStageCount?: number;
  offeredDriverCount?: number;
  acceptedStageIndex?: number;
  acceptDistanceMeters?: number;
}

export interface IRide {
  passengerId: mongoose.Types.ObjectId;
  driverId?: mongoose.Types.ObjectId;
  pickup: IRideLocation;
  destination: IRideLocation;
  status: RideStatus;
  rideType: RideType;
  passengerCount?: number;
  fareEstimate: number;
  offeredFare?: number;
  distanceMeters?: number;
  durationSeconds?: number;
  candidateDriverIds: mongoose.Types.ObjectId[];
  declinedDriverIds: mongoose.Types.ObjectId[];
  // Staged sequential dispatch: an ordered queue of drivers (nearest first),
  // how far we've offered, who is currently being offered, and when the
  // current offer lapses. Advanced lazily when routes are polled.
  dispatchQueue: mongoose.Types.ObjectId[];
  dispatchIndex: number;
  currentOfferDriverIds: mongoose.Types.ObjectId[];
  offerExpiresAt?: Date;
  dispatchMetrics?: IRideDispatchMetrics;
  acceptedAt?: Date;
  arrivedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  // Wallet: fee deducted and reward credited at completion (book rides only)
  feeCharged?: number;
  rewardGiven?: number;
  // Passenger rating submitted after completion (book rides only)
  rating?: number;         // 1–5 stars
  ratingComment?: string;  // optional free-text
  ratedAt?: Date;
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

const dispatchMetricsSchema = new mongoose.Schema<IRideDispatchMetrics>(
  {
    dispatchStartedAt: { type: Date },
    firstOfferedAt: { type: Date },
    lastOfferedAt: { type: Date },
    noDriversAt: { type: Date },
    firstOfferLatencyMs: { type: Number },
    acceptLatencyMs: { type: Number },
    dispatchStageCount: { type: Number },
    offeredDriverCount: { type: Number },
    acceptedStageIndex: { type: Number },
    acceptDistanceMeters: { type: Number }
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
      enum: ['requested', 'accepted', 'arrived', 'in_progress', 'completed', 'cancelled', 'no_drivers'],
      default: 'requested',
      index: true
    },
    rideType: {
      type: String,
      enum: ['shared', 'book'],
      default: 'book',
      index: true
    },
    passengerCount: { type: Number, min: 1 },
    fareEstimate: { type: Number, required: true },
    offeredFare: { type: Number },
    distanceMeters: { type: Number },
    durationSeconds: { type: Number },
    candidateDriverIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    declinedDriverIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true }],
    dispatchQueue: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    dispatchIndex: { type: Number, default: 0 },
    currentOfferDriverIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true }],
    offerExpiresAt: { type: Date },
    dispatchMetrics: { type: dispatchMetricsSchema, default: undefined },
    acceptedAt: { type: Date },
    arrivedAt: { type: Date },
    startedAt: { type: Date },
    completedAt: { type: Date },
    cancelledAt: { type: Date },
    feeCharged: { type: Number },
    rewardGiven: { type: Number },
    rating: { type: Number, min: 1, max: 5 },
    ratingComment: { type: String, trim: true, maxlength: 500 },
    ratedAt: { type: Date }
  },
  { timestamps: true }
);

rideSchema.index({ status: 1, offerExpiresAt: 1 });
rideSchema.index({ status: 1, currentOfferDriverIds: 1, createdAt: -1 });
rideSchema.index({ passengerId: 1, status: 1, createdAt: -1 });
rideSchema.index({ driverId: 1, status: 1 });

export const Ride =
  (mongoose.models.Ride as mongoose.Model<IRide>) ||
  mongoose.model<IRide>('Ride', rideSchema);
export type RideDocument = mongoose.HydratedDocument<IRide>;
