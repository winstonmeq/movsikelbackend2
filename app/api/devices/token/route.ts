import { NextRequest } from 'next/server';
import { z } from 'zod';
import { connectDb } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { fail, ok } from '@/lib/http';
import { withLogger } from '@/lib/logger';
import { User } from '@/models/User';

const schema = z.object({
  token: z.string().min(1, 'FCM token is required')
});

export const POST = withLogger(async function POST(req: NextRequest) {
  try {
    await connectDb();
    const auth = await getAuthUser(req);

    const raw = await req.json().catch(() => null);
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return fail('Invalid request body', 400);
    }

    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      return fail(parsed.error.issues.map((i) => i.message).join(' '), 400);
    }

    await User.findByIdAndUpdate(auth.sub, { fcmToken: parsed.data.token });
    return ok({ registered: true });
  } catch (err: unknown) {
    return fail(err instanceof Error ? err.message : 'Could not register device token');
  }
});
