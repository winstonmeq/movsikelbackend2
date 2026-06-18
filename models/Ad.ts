import mongoose from 'mongoose';

/**
 * A "Check this out" promo shown in the passenger app dashboard carousel.
 * Managed by admins via the Ads CRUD. Tapping the image in the app opens
 * [linkUrl] (a Facebook page or website) in the external browser.
 */
export interface IAd {
  title: string;
  imageUrl: string;
  linkUrl: string;
  active: boolean;
  // Lower numbers show first. Ties break by createdAt (newest first).
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const adSchema = new mongoose.Schema<IAd>(
  {
    title: { type: String, required: true, trim: true },
    imageUrl: { type: String, required: true, trim: true },
    linkUrl: { type: String, required: true, trim: true },
    active: { type: Boolean, default: true, index: true },
    order: { type: Number, default: 0, index: true }
  },
  { timestamps: true }
);

export const Ad =
  (mongoose.models.Ad as mongoose.Model<IAd>) || mongoose.model<IAd>('Ad', adSchema);
export type AdDocument = mongoose.HydratedDocument<IAd>;
