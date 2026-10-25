# MovSikel Backend

Next.js App Router API, Redis geo/dispatch engine, and Firebase Cloud Messaging (FCM) realtime notification server for the MovSikel passenger and MovSikel Driver apps.

## Architecture & Features

- **Auth & Access Control**: JWT authentication (jose/bcrypt) with instant suspension/ban enforcement.
- **Database**: MongoDB Atlas via Mongoose with connection pooling and cached reconnection recovery.
- **Presence & Dispatch (Redis)**:
  - High-precision Redis GEO indexing (`GEOADD` / `GEOSEARCH`) for live driver presence with 60s TTL.
  - Staged sequential dispatch with distributed reservation locking to prevent concurrent double-booking.
  - Background progression worker (`lib/dispatchWorker.ts`) advancing offer stages every 4 seconds.
- **Push & Realtime Notifications**: Firebase Cloud Messaging (FCM HTTP v1) for tray and in-app event notifications.
- **Google Maps Proxies**: Places autocomplete/details and Directions route polyline caching with IP rate limiting.
- **Driver Wallet & Ledger**: Double-entry ledger (`WalletTransaction`) with atomic booking fee deduction, driver minimum balance gating, and single-credit referral bonuses.

## Run Locally

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

The Next.js API server runs at:

```text
http://localhost:3000
```

## Key API Endpoints

### Authentication
- `POST /api/auth/register` — Register passenger or driver (with optional referral code)
- `POST /api/auth/login` — Phone & password login with IP rate limiting
- `POST /api/auth/google` — Google OAuth sign-in (with verified email & audience check)

### Passenger Rides
- `POST /api/rides/request` — Create ride request & launch staged sequential dispatch
- `GET /api/rides/:rideId` — Get ride status and driver location overlay
- `POST /api/rides/:rideId/cancel` — Atomically cancel ride before trip start
- `POST /api/rides/:rideId/rate` — Submit passenger 1-5 star driver rating

### Driver Operations
- `GET /api/driver/requests` — Poll incoming ride offers for current dispatch stage
- `POST /api/driver/rides/:rideId/accept` — Accept currently offered ride (wallet balance gated)
- `POST /api/driver/rides/:rideId/decline` — Decline offer and immediately advance to next driver
- `POST /api/driver/rides/:rideId/status` — Advance status (`arrived` -> `in_progress` -> `completed`) with atomic wallet fee deduction
- `POST /api/driver/location` — Broadcast live GPS position (updates Redis & MongoDB)
- `POST /api/driver/availability` — Toggle online/offline status
- `GET /api/driver/wallet` — Driver balance, transaction history, and fee rates

### Admin Dashboard & Management
- `GET /api/admin/overview` — Platform KPI summary and estimated revenue
- `GET /api/admin/rides` — Ride logs with filter by status/type
- `GET /api/admin/users` — User management (suspend, ban, search)
- `GET /api/admin/wallet` — System-wide driver wallet overview & top-up ledger

## Environment Setup

Create a `.env` file inside the `backend` folder:

```env
MONGODB_URI=mongodb+srv://YOUR_USER:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/movsikel?retryWrites=true&w=majority
JWT_SECRET=change-this-to-a-long-random-secret
REDIS_URL=redis://localhost:6379
GOOGLE_MAPS_API_KEY=your-google-maps-api-key
GOOGLE_CLIENT_ID=your-google-web-client-id
GOOGLE_ANDROID_CLIENT_ID=your-google-android-client-id
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
CORS_ORIGIN=*
PORT=3000
```
