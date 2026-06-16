import { SignJWT, jwtVerify } from 'jose';
import type { NextRequest } from 'next/server';

const encoder = new TextEncoder();

export type AuthRole = 'passenger' | 'driver' | 'admin';

type JwtPayload = {
  sub: string;
  role: AuthRole;
  name: string;
  phone: string;
};

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('Missing JWT_SECRET');
  return encoder.encode(secret);
}

export async function signToken(payload: JwtPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(getSecret());
}

export async function verifyToken(token: string): Promise<JwtPayload> {
  const result = await jwtVerify(token, getSecret());
  const p = result.payload;
  if (!p.sub || !p.role || !p.name || !p.phone) throw new Error('Invalid token');
  return {
    sub: String(p.sub),
    role: p.role as AuthRole,
    name: String(p.name),
    phone: String(p.phone)
  };
}

export async function getAuthUser(req: NextRequest) {
  const header = req.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : null;
  if (!token) throw new Error('Missing bearer token');
  return verifyToken(token);
}

/**
 * Like getAuthUser but rejects anyone who is not an admin. Throws on failure;
 * callers should catch and map to a 401/403 via the standard fail() helper.
 */
export async function getAdminUser(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (auth.role !== 'admin') throw new Error('Admin access required');
  return auth;
}
