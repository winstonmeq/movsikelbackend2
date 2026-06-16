import { NextRequest, NextResponse } from 'next/server';

type RouteHandler = (req: NextRequest, context?: any) => Promise<NextResponse | Response>;

export function withLogger(handler: RouteHandler, label?: string): RouteHandler {
  return async (req: NextRequest, context?: any) => {
    const start = Date.now();
    const tag = label || `${req.method} ${req.nextUrl.pathname}`;

    console.log(`[api] --> ${tag}`);

    let res: NextResponse | Response;
    try {
      res = await handler(req, context);
    } catch (err) {
      const ms = Date.now() - start;
      console.error(`[api] !! ${tag} threw after ${ms}ms`, err);
      throw err;
    }

    const ms = Date.now() - start;
    console.log(`[api] <-- ${tag} ${res.status} (${ms}ms)`);
    return res;
  };
}
