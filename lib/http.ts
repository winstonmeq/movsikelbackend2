import { NextResponse } from 'next/server';

export function ok(data: unknown, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
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
