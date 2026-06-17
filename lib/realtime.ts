import * as admin from 'firebase-admin';
import { connectDb } from './db';
import { User } from '@/models/User';

let _app: admin.app.App | null = null;

function getApp(): admin.app.App | null {
  if (_app) return _app;
  if (admin.apps.length > 0) {
    _app = admin.apps[0]!;
    return _app;
  }

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    console.warn('[realtime] FIREBASE_SERVICE_ACCOUNT_JSON not set — FCM disabled');
    return null;
  }

  try {
    const serviceAccount = JSON.parse(raw);
    _app = admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    return _app;
  } catch (err) {
    console.error('[realtime] Failed to initialize Firebase Admin:', err);
    return null;
  }
}

export function setRealtimeServer(_server: unknown) {
  // No-op — FCM does not need a server reference.
}

export async function emitToUser(userId: string, event: string, payload: unknown) {
  const app = getApp();
  if (!app) return;

  try {
    await connectDb();
    const user = await User.findById(userId).select('fcmToken').lean();
    const token = (user as any)?.fcmToken as string | undefined;
    if (!token) return;

    await admin.messaging(app).send({
      token,
      data: {
        event,
        payload: JSON.stringify(payload),
      },
      android: { priority: 'high' },
      apns: { headers: { 'apns-priority': '10' } },
    });
  } catch (err: any) {
    // Token is invalid/unregistered — clear it so we don't keep retrying
    if (err?.errorInfo?.code === 'messaging/registration-token-not-registered') {
      await User.findByIdAndUpdate(userId, { $unset: { fcmToken: 1 } });
    } else {
      console.error(`[realtime] FCM send failed for user ${userId} event ${event}:`, err);
    }
  }
}

export async function emitToUsers(userIds: string[], event: string, payload: unknown) {
  await Promise.all(userIds.map((id) => emitToUser(id, event, payload)));
}
