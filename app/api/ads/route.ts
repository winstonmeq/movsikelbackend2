import { connectDb } from '@/lib/db';
import { ok, fail } from '@/lib/http';
import { Ad } from '@/models/Ad';

/**
 * Public list of active "Check this out" promos for the passenger dashboard.
 * No auth — these are display-only marketing cards. Returns active ads only,
 * in admin-defined order (then newest first).
 */
export async function GET() {
  try {
    await connectDb();
    const ads = await Ad.find({ active: true })
      .sort({ order: 1, createdAt: -1 })
      .limit(20)
      .lean();

    return ok({
      ads: ads.map((ad: any) => ({
        id: String(ad._id),
        title: ad.title,
        imageUrl: ad.imageUrl,
        linkUrl: ad.linkUrl
      }))
    });
  } catch (err: unknown) {
    return fail(err instanceof Error ? err.message : 'Could not load ads');
  }
}
