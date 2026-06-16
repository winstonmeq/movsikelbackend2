import type { NextRequest } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { User } from '@/models/User';

/** A driver counts as online only if online:true AND seen within this window. */
export function onlineFreshnessMs() {
  return Number(process.env.DRIVER_ONLINE_WINDOW_MS || 120000); // 2 minutes
}

/** A Mongo filter fragment matching drivers that are genuinely online now. */
export function onlineDriverFilter() {
  return {
    online: true,
    lastSeenAt: { $gte: new Date(Date.now() - onlineFreshnessMs()) }
  };
}

/** Thrown when a logged-in user's account is suspended or banned. */
export class AccountBlockedError extends Error {
  status: number;
  constructor(message: string) {
    super(message);
    this.name = 'AccountBlockedError';
    this.status = 403;
  }
}

/**
 * Authenticates the request AND re-checks the user's CURRENT status in the
 * database (not just the 30-day token). This is what makes suspend/ban take
 * effect immediately for already-logged-in users — without it, a banned user
 * keeps working until their token expires.
 *
 * Returns the live user document (lean). Throws AccountBlockedError (403) if
 * suspended/banned, or a generic Error (401) if the user no longer exists.
 */
export async function requireActiveUser(req: NextRequest) {
  const auth = await getAuthUser(req);
  const user = await User.findById(auth.sub).select('status role name phone').lean();
  if (!user) throw new Error('Account not found');
  if ((user as any).status === 'banned') {
    throw new AccountBlockedError('This account has been banned. Contact support.');
  }
  if ((user as any).status === 'suspended') {
    throw new AccountBlockedError('This account is suspended. Contact support.');
  }
  return { auth, user };
}

/**
 * Maps an error thrown by requireActiveUser to the right HTTP status for the
 * fail() helper: 403 for blocked accounts, 401 for everything auth-related.
 */
export function statusForAuthError(err: unknown): number {
  if (err instanceof AccountBlockedError) return err.status;
  return 401;
}
