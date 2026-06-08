import { NextRequest } from 'next/server';
import { z } from 'zod';
import { connectDb } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { fail, ok } from '@/lib/http';
import { User } from '@/models/User';

const schema = z.object({
  name: z.string().trim().min(2, 'Full name must be at least 2 characters.').optional(),
  homeBarangay: z.string().trim().max(120).optional().or(z.literal('')),
  homeAddress: z.string().trim().max(240).optional().or(z.literal(''))
});

function toPassengerProfile(user: any) {
  return {
    id: String(user._id),
    name: user.name,
    phone: user.phone,
    role: user.role,
    homeBarangay: user.homeBarangay || '',
    homeAddress: user.homeAddress || ''
  };
}

export async function GET(req: NextRequest) {
  try {
    await connectDb();
    const auth = await getAuthUser(req);
    const user = await User.findById(auth.sub).select('name phone role homeBarangay homeAddress');
    if (!user) return fail('User not found', 404);
    if (user.role !== 'passenger') return fail('Only passenger profiles are available here', 403);
    return ok({ user: toPassengerProfile(user) });
  } catch (err: unknown) {
    return fail(err instanceof Error ? err.message : 'Could not load profile');
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await connectDb();
    const auth = await getAuthUser(req);
    const raw = await req.json().catch(() => null);
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return fail('Invalid request body', 400);
    }

    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      return fail(parsed.error.issues.map((issue) => issue.message).join(' '), 400);
    }

    const updates: Record<string, string> = {};
    if (parsed.data.name !== undefined) updates.name = parsed.data.name;
    if (parsed.data.homeBarangay !== undefined) updates.homeBarangay = parsed.data.homeBarangay;
    if (parsed.data.homeAddress !== undefined) updates.homeAddress = parsed.data.homeAddress;

    const user = await User.findOneAndUpdate(
      { _id: auth.sub, role: 'passenger' },
      updates,
      { new: true }
    ).select('name phone role homeBarangay homeAddress');

    if (!user) return fail('User not found', 404);
    return ok({ user: toPassengerProfile(user) });
  } catch (err: unknown) {
    return fail(err instanceof Error ? err.message : 'Could not update profile');
  }
}
