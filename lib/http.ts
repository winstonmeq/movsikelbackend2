import { NextResponse } from 'next/server';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0'
};

export function ok(data: unknown, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}

export function okNoStore(data: unknown, status = 200) {
  return NextResponse.json({ ok: true, data }, { status, headers: NO_STORE_HEADERS });
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

/** 429 Too Many Requests with a Retry-After header. */
export function tooManyRequests(message: string, retryAfterSeconds: number) {
  return NextResponse.json(
    { ok: false, error: message },
    { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
  );
}
