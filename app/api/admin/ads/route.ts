import { NextRequest } from 'next/server';
import { z } from 'zod';
import { connectDb } from '@/lib/db';
import { fail, ok } from '@/lib/http';
import { withAdmin } from '@/lib/admin';
import { Ad } from '@/models/Ad';

/** Serializes an ad document for admin views. */
export function publicAd(ad: any) {
  if (!ad) return null;
  return {
    id: String(ad._id),
    title: ad.title,
    imageUrl: ad.imageUrl,
    linkUrl: ad.linkUrl,
    active: Boolean(ad.active),
    order: typeof ad.order === 'number' ? ad.order : 0,
    createdAt: ad.createdAt,
    updatedAt: ad.updatedAt
  };
}

const createSchema = z.object({
  title: z.string().trim().min(1, 'Title is required.').max(120),
  imageUrl: z.string().trim().url('Image URL must be a valid URL.'),
  linkUrl: z.string().trim().url('Link URL must be a valid URL (Facebook page or website).'),
  active: z.boolean().optional(),
  order: z.number().int().optional()
});

export async function GET(req: NextRequest) {
  return withAdmin(req, async () => {
    await connectDb();
    const ads = await Ad.find({}).sort({ order: 1, createdAt: -1 }).lean();
    return ok({ ads: ads.map(publicAd) });
  });
}

export async function POST(req: NextRequest) {
  return withAdmin(req, async () => {
    await connectDb();

    const raw = await req.json().catch(() => null);
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return fail('Invalid request body', 400);

    const parsed = createSchema.safeParse(raw);
    if (!parsed.success) {
      return fail(parsed.error.issues.map((i) => i.message).join(' '), 400);
    }
    const data = parsed.data;

    const ad = await Ad.create({
      title: data.title,
      imageUrl: data.imageUrl,
      linkUrl: data.linkUrl,
      active: data.active ?? true,
      order: data.order ?? 0
    });

    return ok({ ad: publicAd(ad.toObject()) }, 201);
  });
}
