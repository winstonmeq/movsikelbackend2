import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { z } from 'zod';
import { connectDb } from '@/lib/db';
import { fail, ok } from '@/lib/http';
import { withAdmin } from '@/lib/admin';
import { publicAd } from '../route';
import { Ad } from '@/models/Ad';

const patchSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  imageUrl: z.string().trim().url('Image URL must be a valid URL.').optional(),
  linkUrl: z.string().trim().url('Link URL must be a valid URL.').optional(),
  active: z.boolean().optional(),
  order: z.number().int().optional()
});

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  return withAdmin(req, async () => {
    await connectDb();
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return fail('Invalid ad id', 400);

    const raw = await req.json().catch(() => null);
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return fail('Invalid request body', 400);

    const parsed = patchSchema.safeParse(raw);
    if (!parsed.success) {
      return fail(parsed.error.issues.map((i) => i.message).join(' '), 400);
    }

    const ad = await Ad.findByIdAndUpdate(id, parsed.data, { returnDocument: 'after' }).lean();
    if (!ad) return fail('Ad not found', 404);

    return ok({ ad: publicAd(ad) });
  });
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  return withAdmin(req, async () => {
    await connectDb();
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return fail('Invalid ad id', 400);

    const deleted = await Ad.findByIdAndDelete(id).lean();
    if (!deleted) return fail('Ad not found', 404);

    return ok({ deleted: true, id });
  });
}
