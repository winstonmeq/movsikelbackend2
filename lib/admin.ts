import type { NextRequest } from 'next/server';
import { getAdminUser } from '@/lib/auth';
import { fail } from '@/lib/http';
import { onlineFreshnessMs } from '@/lib/account';

/** Serializes a user document for admin views (never exposes passwordHash). */
export function publicUserForAdmin(user: any) {
  if (!user) return null;
  const loc = user.currentLocation?.coordinates;
  const freshWindow = new Date(Date.now() - onlineFreshnessMs());
  const isOnline =
    user.online === true &&
    user.lastSeenAt != null &&
    new Date(user.lastSeenAt) >= freshWindow;
  return {
    id: String(user._id),
    name: user.name,
    phone: user.phone,
    role: user.role,
    status: user.status ?? 'active',
    homeBarangay: user.homeBarangay ?? '',
    homeAddress: user.homeAddress ?? '',
    vehicleType: user.vehicleType ?? '',
    plateNumber: user.plateNumber ?? '',
    tricycleNumber: user.tricycleNumber ?? '',
    online: isOnline,
    lat: Array.isArray(loc) ? loc[1] : null,
    lng: Array.isArray(loc) ? loc[0] : null,
    heading: typeof user.heading === 'number' ? user.heading : null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

/** Parses ?page= & ?limit= with sane bounds. */
export function parsePaging(req: NextRequest, defaultLimit = 50, maxLimit = 50) {
  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get('page') || 1) || 1);
  const limitRaw = Number(url.searchParams.get('limit') || defaultLimit) || defaultLimit;
  const limit = Math.min(maxLimit, Math.max(1, limitRaw));
  return { page, limit, skip: (page - 1) * limit };
}

/**
 * Wraps an admin route handler: authenticates as admin, maps auth failures to
 * the right status, and funnels unexpected errors to a 500.
 */
export async function withAdmin(
  req: NextRequest,
  handler: (admin: { sub: string }) => Promise<Response>
): Promise<Response> {
  let admin;
  try {
    admin = await getAdminUser(req);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unauthorized';
    if (message === 'Admin access required') return fail('Admin access required', 403);
    return fail('Authentication required', 401);
  }

  try {
    return await handler(admin);
  } catch (err: unknown) {
    return fail(err instanceof Error ? err.message : 'Request failed', 500);
  }
}
