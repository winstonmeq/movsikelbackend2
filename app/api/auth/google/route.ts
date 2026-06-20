import { NextRequest } from 'next/server';
import { z } from 'zod';
import { connectDb } from '@/lib/db';
import { signToken } from '@/lib/auth';
import { fail, ok, tooManyRequests } from '@/lib/http';
import { rateLimitByIp } from '@/lib/rateLimit';
import { User } from '@/models/User';
import { withLogger } from '@/lib/logger';

const schema = z.object({
  idToken: z.string().min(1, 'Google ID token is required'),
});

interface GoogleTokenPayload {
  sub: string;
  email: string;
  name: string;
  picture?: string;
  email_verified?: boolean;
}

async function verifyGoogleToken(idToken: string): Promise<GoogleTokenPayload> {
  const res = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`
  );
  if (!res.ok) throw new Error('Invalid Google token');

  const data = await res.json();

  // Accept tokens issued for any OAuth client in this project.
  // GOOGLE_CLIENT_ID is the web client; GOOGLE_ANDROID_CLIENT_ID is the Android client.
  // If neither env var is set we skip the audience check entirely.
  const allowedAudiences = [
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_ANDROID_CLIENT_ID,
  ].filter(Boolean);

  if (allowedAudiences.length > 0 && !allowedAudiences.includes(data.aud)) {
    throw new Error(`Token audience mismatch: ${data.aud}`);
  }

  if (!data.sub || !data.email) throw new Error('Incomplete Google token payload');

  return {
    sub: data.sub,
    email: data.email,
    name: data.name ?? data.email,
    picture: data.picture,
    email_verified: data.email_verified === 'true' || data.email_verified === true,
  };
}

export const POST = withLogger(async function POST(req: NextRequest) {
  try {
    // Throttle Google sign-in: 10 per minute per IP.
    const rl = await rateLimitByIp(req, 'google', 10, 60);
    if (!rl.allowed) {
      return tooManyRequests('Too many sign-in attempts. Please wait a moment and try again.', rl.retryAfterSeconds);
    }

    await connectDb();

    const raw = await req.json().catch(() => null);
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return fail('Invalid request body.', 400);
    }

    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      return fail(parsed.error.issues.map((i) => i.message).join(' '), 400);
    }

    const { idToken } = parsed.data;

    let googleUser: GoogleTokenPayload;
    try {
      googleUser = await verifyGoogleToken(idToken);
    } catch {
      return fail('Google authentication failed. Please try again.', 401);
    }

    // Find existing user by googleId or email, or create a new one
    let user = await User.findOne({ googleId: googleUser.sub });

    if (!user) {
      user = await User.findOne({ email: googleUser.email });
    }

    if (!user) {
      // Create new passenger account via Google
      user = await User.create({
        name: googleUser.name,
        email: googleUser.email,
        googleId: googleUser.sub,
        passwordHash: '',
        role: 'passenger',
        status: 'active',
        phone: `google_${googleUser.sub}`, // placeholder — no phone for Google-only accounts
        online: false,
      });
    } else {
      // Link googleId if not yet linked
      if (!user.googleId) {
        user.googleId = googleUser.sub;
        await user.save();
      }
    }

    if (user.status === 'banned') return fail('This account has been banned. Contact support.', 403);
    if (user.status === 'suspended') return fail('This account is suspended. Contact support.', 403);
    if (user.role !== 'passenger') return fail('Account role does not match this app', 403);

    const token = await signToken({
      sub: String(user._id),
      role: user.role,
      name: user.name,
      phone: user.phone,
    });

    return ok({
      token,
      user: {
        id: String(user._id),
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        status: user.status,
        homeBarangay: user.homeBarangay,
        homeAddress: user.homeAddress,
      },
    });
  } catch (err: unknown) {
    console.error('Google login failed:', err);
    return fail('Google login failed. Check the backend terminal for details.', 500);
  }
});
