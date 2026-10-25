import { Ride } from '@/models/Ride';
import { connectDb } from '@/lib/db';
import { progressDispatchIfNeeded } from '@/lib/dispatch';
import redis from '@/lib/redis';

/**
 * Background dispatch progression worker.
 *
 * Runs periodically on long-lived server processes (VPS/PM2) to advance
 * unaccepted ride offers on a timer instead of waiting for a driver to poll.
 *
 * In multi-process / cluster mode (4 CPU cores), a lightweight Redis lock ensures
 * only one worker ticks per interval so processes do not duplicate DB scans.
 */

const TICK_MS = Number(process.env.DISPATCH_WORKER_TICK_MS || 4000);

// Guard against double-start across HMR / multiple imports in the same process.
const GLOBAL_KEY = '__movsikel_dispatch_worker__';
type GlobalWithWorker = typeof globalThis & { [GLOBAL_KEY]?: NodeJS.Timeout };

async function tick() {
  try {
    // Cluster de-duplication: only one worker process across the 4 CPU cores
    // runs this tick per interval.
    const tickLockKey = 'lock:dispatchWorker:tick';
    const acquired = await redis.set(tickLockKey, '1', 'PX', Math.max(1000, TICK_MS - 500), 'NX');
    if (!acquired) return; // Another cluster worker is handling this tick

    await connectDb();

    // Find requested rides whose current offer window has lapsed (or never got an expiry date)
    const expired = await Ride.find({
      status: 'requested',
      $or: [
        { offerExpiresAt: { $lte: new Date() } },
        { offerExpiresAt: { $exists: false } },
        { offerExpiresAt: null }
      ]
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
