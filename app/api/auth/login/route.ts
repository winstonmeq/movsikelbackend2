import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { connectDb } from '@/lib/db';
import { signToken } from '@/lib/auth';
import { fail, ok } from '@/lib/http';
import { normalizePhone } from '@/lib/phone';
import { User } from '@/models/User';

import { withLogger } from '@/lib/logger';

const schema = z.object({
  phone: z.string().trim().min(6, 'Phone number must be at least 6 digits.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
  role: z.enum(['passenger', 'driver', 'admin']).optional()
});

function formatValidationError(error: z.ZodError) {
  return error.issues
    .map((issue) => issue.message || `${issue.path.join('.') || 'field'} is invalid.`)
    .join(' ');
}

export const POST = withLogger(async function POST(req: NextRequest) {
  try {
    await connectDb();

    const raw = await req.json().catch(() => null);

    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return fail('Invalid request body. Send JSON with phone and password.', 400);
    }

    const parsed = schema.safeParse({
      ...raw,
      phone: normalizePhone((raw as Record<string, unknown>).phone)
    });

    if (!parsed.success) {
      return fail(formatValidationError(parsed.error), 400);
    }

    const body = parsed.data;
    const user = await User.findOne({ phone: body.phone });
    if (!user) return fail('Invalid phone or password', 401);
    if (body.role && user.role !== body.role) return fail('Account role does not match this app', 403);

    const matches = await bcrypt.compare(body.password, user.passwordHash);
    if (!matches) return fail('Invalid phone or password', 401);

    if (user.status === 'banned') return fail('This account has been banned. Contact support.', 403);
    if (user.status === 'suspended') return fail('This account is suspended. Contact support.', 403);

    const token = await signToken({
      sub: String(user._id),
      role: user.role,
      name: user.name,
      phone: user.phone
    });

    return ok({
      token,
      user: {
        id: String(user._id),
        name: user.name,
        phone: user.phone,
        role: user.role,
        status: user.status,
        homeBarangay: user.homeBarangay,
        homeAddress: user.homeAddress,
        vehicleType: user.vehicleType,
        plateNumber: user.plateNumber,
        tricycleNumber: user.tricycleNumber
      }
    });
  } catch (err: unknown) {
    console.error('Login failed:', err);
    return fail('Login failed. Check the backend terminal for details.', 500);
  }
});
