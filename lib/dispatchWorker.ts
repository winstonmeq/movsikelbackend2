import { Ride } from '@/models/Ride';
import { connectDb } from '@/lib/db';
import { progressDispatchIfNeeded } from '@/lib/dispatch';

/**
 * Background dispatch progression.
 *
 * On a long-lived Node process (the VPS deployment) we can advance unaccepted
 * ride offers on a timer instead of relying on a driver happening to poll
 * /requests. This closes the gap where a ride could stall on an expired offer
 * simply because no driver hit the poll route in that window.
 *
 * The route-level lazy calls to `progressDispatchIfNeeded` stay as a safety net;
 * both paths are idempotent (each re-reads ride state and is keyed on ride id),
 * so running both is safe.
 *
 * Self-starts once per process on first import (guarded). Serverless deployments
 * that import this module simply get one short-lived interval per cold start,
 * which is harmless — but the intended target is `next start` on a VPS.
 */

const TICK_MS = Number(process.env.DISPATCH_WORKER_TICK_MS || 4000);

// Guard against double-start across HMR / multiple imports in the same process.
const GLOBAL_KEY = '__movsikel_dispatch_worker__';
type GlobalWithWorker = typeof globalThis & { [GLOBAL_KEY]?: NodeJS.Timeout };

async function tick() {
  try {
    await connectDb();
    // Find requested rides whose current offer window has lapsed. Bounded so a
    // single tick can't do unbounded work under a backlog.
    const expired = await Ride.find({
      status: 'requested',
      offerExpiresAt: { $lte: new Date() }
    })
      .select('_id')
      .limit(50)
      .lean();

    for (const r of expired) {
      try {
        await progressDispatchIfNeeded(String(r._id));
      } catch (err) {
        console.error('[dispatchWorker] progress failed for ride', String(r._id), err);
      }
    }
  } catch (err) {
    console.error('[dispatchWorker] tick failed:', err);
  }
}

export function startDispatchWorker() {
  const g = globalThis as GlobalWithWorker;
  if (g[GLOBAL_KEY]) return; // already running in this process
  const handle = setInterval(() => {
    void tick();
  }, TICK_MS);
  // Don't keep the event loop alive solely for this timer.
  if (typeof handle.unref === 'function') handle.unref();
  g[GLOBAL_KEY] = handle;
  console.log(`[dispatchWorker] started (tick ${TICK_MS}ms)`);
}

// Lazy self-start on import.
startDispatchWorker();
