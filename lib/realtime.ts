import { App, initializeApp, getApps, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { connectDb } from './db';
import { User } from '@/models/User';

let _app: App | null = null;

function getApp(): App | null {
  if (_app) return _app;
  if (getApps().length > 0) {
    _app = getApps()[0]!;
    return _app;
  }

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    console.warn('[realtime] FIREBASE_SERVICE_ACCOUNT_JSON not set — FCM disabled');
    return null;
  }

  try {
    const serviceAccount = JSON.parse(raw);
    _app = initializeApp({ credential: cert(serviceAccount) });
    return _app;
  } catch (err) {
    console.error('[realtime] Failed to initialize Firebase Admin:', err);
    return null;
  }
}

export function setRealtimeServer(_server: unknown) {
  // No-op — FCM does not need a server reference.
}

/**
 * Optional heads-up notification attached to a push. When present, the OS shows
 * a tray notification (with sound) even if the app is killed/backgrounded — the
 * `data` block alone is silent and only wakes a running app. Pass this for
 * events the user must see immediately (e.g. a new ride request), and omit it
 * for purely in-app state syncs.
 */
export type PushNotification = { title: string; body: string };

export async function emitToUser(
  userId: string,
  event: string,
  payload: unknown,
  notification?: PushNotification
) {
  const app = getApp();
  if (!app) return;

  try {
    await connectDb();
    const user = await User.findById(userId).select('fcmToken').lean();
    const token = (user as any)?.fcmToken as string | undefined;
    if (!token) return;

    await getMessaging(app).send({
      token,
      ...(notification ? { notification } : {}),
      data: {
        event,
        payload: JSON.stringify(payload),
      },
      android: {
        priority: 'high',
        ...(notification
          ? { notification: { channelId: 'ride_alerts', sound: 'default' } }
          : {}),
      },
      apns: {
        headers: { 'apns-priority': '10' },
        ...(notification ? { payload: { aps: { sound: 'default' } } } : {}),
      },
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

export async function emitToUsers(
  userIds: string[],
  event: string,
  payload: unknown,
  notification?: PushNotification
) {
  await Promise.all(userIds.map((id) => emitToUser(id, event, payload, notification)));
}
