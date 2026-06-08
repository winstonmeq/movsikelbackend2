// Socket.IO has been removed from the backend.
// These helpers are intentionally kept as safe no-ops so existing route files
// can keep calling emitToUser/emitToUsers until Firebase Cloud Messaging is wired in.
//
// Later, replace these functions with Firebase Admin SDK logic that sends FCM
// push notifications to the passenger/driver device tokens.

export function setRealtimeServer(_server: unknown) {
  // No-op. Socket.IO is disabled.
}

export function emitToUser(userId: string, event: string, payload: unknown) {
  if (process.env.REALTIME_DEBUG === 'true') {
    console.log('[realtime:no-socket]', { userId, event, payload });
  }
}

export function emitToUsers(userIds: string[], event: string, payload: unknown) {
  userIds.forEach((id) => emitToUser(id, event, payload));
}
