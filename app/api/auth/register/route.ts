import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { connectDb } from '@/lib/db';
import { fail, ok, tooManyRequests } from '@/lib/http';
import { rateLimitByIp } from '@/lib/rateLimit';
import { signToken } from '@/lib/auth';
import { normalizePhone, isValidPhone } from '@/lib/phone';
import { User } from '@/models/User';
import { creditWallet } from '@/lib/wallet';
import { WALLET_WELCOME_BONUS } from '@/lib/fareScheme';
import { withLogger } from '@/lib/logger';

const schema = z.object({
  name: z.string().trim().min(2, 'Full name must be at least 2 characters.'),
  phone: z.string().trim().min(6, 'Phone number must be at least 6 digits.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
  role: z.enum(['passenger', 'driver'], { error: 'Role must be passenger or driver.' }),
  vehicleType: z.string().trim().optional(),
  plateNumber: z.string().trim().optional(),
  tricycleNumber: z.string().trim().optional(),
  referralCode: z.string().trim().toUpperCase().optional(),
});

function formatValidationError(error: z.ZodError) {
  return error.issues
    .map((issue) => issue.message || `${issue.path.join('.') || 'field'} is invalid.`)
    .join(' ');
}

/** Generates a unique 6-character alphanumeric referral code. */
async function generateReferralCode(): Promise<string> {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let attempt = 0; attempt < 10; attempt++) {
    let code = '';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    const exists = await User.exists({ referralCode: code });
    if (!exists) return code;
  }
  throw new Error('Could not generate unique referral code');
}

export const POST = withLogger(async function POST(req: NextRequest) {
  try {
    // Throttle signups: 5 per 10 minutes per IP (curbs spam/bot account creation).
    const rl = await rateLimitByIp(req, 'register', 5, 600);
    if (!rl.allowed) {
      return tooManyRequests('Too many sign-up attempts. Please wait a few minutes and try again.', rl.retryAfterSeconds);
    }

    await connectDb();

    const raw = await req.json().catch(() => null);
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return fail('Invalid request body. Send JSON with name, phone, password, and role.', 400);
    }

    const parsed = schema.safeParse({
      ...raw,
      phone: normalizePhone((raw as Record<string, unknown>).phone)
    });

    if (!parsed.success) return fail(formatValidationError(parsed.error), 400);
    const body = parsed.data;

    if (!isValidPhone(body.phone)) {
      return fail('Please enter a valid PH mobile number (e.g. 09171234567).', 400);
    }

    const existing = await User.findOne({ phone: body.phone });
    if (existing) return fail('Phone number already registered. Please log in instead.', 409);

    // Validate referral code if provided (only meaningful for drivers)
    let referrerId: string | undefined;
    if (body.role === 'driver' && body.referralCode) {
      const referrer = await User.findOne({ referralCode: body.referralCode, role: 'driver' })
        .select('_id').lean();
      if (!referrer) return fail('Invalid referral code.', 400);
      referrerId = String(referrer._id);
    }

    const passwordHash = await bcrypt.hash(body.password, 12);
    const referralCode = body.role === 'driver' ? await generateReferralCode() : undefined;

    const user = await User.create({
      name: body.name,
      phone: body.phone,
      passwordHash,
      role: body.role,
      status: 'active',
      vehicleType: body.role === 'driver' ? body.vehicleType || 'Tricycle' : undefined,
      plateNumber: body.role === 'driver' ? body.plateNumber : undefined,
      tricycleNumber: body.role === 'driver' ? body.tricycleNumber : undefined,
      referralCode,
      referredBy: referrerId ?? undefined,
    });

    // Credit ₱15 welcome balance for new drivers
    if (body.role === 'driver') {
      await creditWallet({
        driverId: String(user._id),
        amount: WALLET_WELCOME_BONUS,
        type: 'topup',
        description: 'Welcome bonus — new driver registration',
      });
    }

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
        tricycleNumber: user.tricycleNumber,
        referralCode: user.referralCode,
      }
    }, 201);
  } catch (err: unknown) {
    console.error('Registration failed:', err);
    return fail('Registration failed. Check the backend terminal for details.', 500);
  }
});
