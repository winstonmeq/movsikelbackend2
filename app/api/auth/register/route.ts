import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { connectDb } from '@/lib/db';
import { fail, ok } from '@/lib/http';
import { signToken } from '@/lib/auth';
import { normalizePhone, isValidPhone } from '@/lib/phone';
import { User } from '@/models/User';

const schema = z.object({
  name: z.string().trim().min(2, 'Full name must be at least 2 characters.'),
  phone: z.string().trim().min(6, 'Phone number must be at least 6 digits.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
  role: z.enum(['passenger', 'driver'], {
    error: 'Role must be passenger or driver.'
  }),
  vehicleType: z.string().trim().optional(),
  plateNumber: z.string().trim().optional(),
  tricycleNumber: z.string().trim().optional()
});

function formatValidationError(error: z.ZodError) {
  return error.issues
    .map((issue) => issue.message || `${issue.path.join('.') || 'field'} is invalid.`)
    .join(' ');
}

export async function POST(req: NextRequest) {
  try {
    await connectDb();

    const raw = await req.json().catch(() => null);
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return fail('Invalid request body. Send JSON with name, phone, password, and role.', 400);
    }

    const parsed = schema.safeParse({
      ...raw,
      phone: normalizePhone((raw as Record<string, unknown>).phone)
    });

    if (!parsed.success) {
      return fail(formatValidationError(parsed.error), 400);
    }

    const body = parsed.data;
    if (!isValidPhone(body.phone)) {
      return fail('Please enter a valid PH mobile number (e.g. 09171234567).', 400);
    }

    const existing = await User.findOne({ phone: body.phone });
    if (existing) return fail('Phone number already registered. Please log in instead.', 409);

    const passwordHash = await bcrypt.hash(body.password, 12);
    const user = await User.create({
      name: body.name,
      phone: body.phone,
      passwordHash,
      role: body.role,
      status: 'active',
      vehicleType: body.role === 'driver' ? body.vehicleType || 'Tricycle' : undefined,
      plateNumber: body.role === 'driver' ? body.plateNumber : undefined,
      tricycleNumber: body.role === 'driver' ? body.tricycleNumber : undefined
    });

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
    }, 201);
  } catch (err: unknown) {
    console.error('Registration failed:', err);
    return fail('Registration failed. Check the backend terminal for details.', 500);
  }
}
