/**
 * Next.js Server Startup Hook.
 * Automatically runs once when the Node.js/Bun server boots up.
 * Starts background workers immediately upon server launch.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startDispatchWorker } = await import('@/lib/dispatchWorker');
    startDispatchWorker();
  }
}
