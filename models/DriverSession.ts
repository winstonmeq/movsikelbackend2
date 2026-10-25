import mongoose from 'mongoose';

export interface IDriverSession {
  driverId: mongoose.Types.ObjectId;
  startedAt: Date;
  endedAt?: Date;
  durationSeconds?: number;
  lastHeartbeatAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const driverSessionSchema = new mongoose.Schema<IDriverSession>(
  {
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    startedAt: {
      type: Date,
      required: true,
      index: true
    },
    endedAt: {
      type: Date,
      index: true
    },
    durationSeconds: {
      type: Number,
      default: 0
    },
    lastHeartbeatAt: {
      type: Date
    }
  },
  { timestamps: true }
);

// Compound index for querying driver sessions within date ranges
driverSessionSchema.index({ driverId: 1, startedAt: -1 });
driverSessionSchema.index({ startedAt: -1 });

export const DriverSession =
  (mongoose.models.DriverSession as mongoose.Model<IDriverSession>) ||
  mongoose.model<IDriverSession>('DriverSession', driverSessionSchema);
