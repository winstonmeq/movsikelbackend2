# Backend

Next.js API plus Socket.IO realtime server for the MovSikel passenger and MovSikel Driver apps.

## Features included

- Passenger and driver registration/login
- JWT auth
- MongoDB Atlas via Mongoose
- Google Places autocomplete and place details proxy
- Google Directions proxy for route polyline
- Ride request creation
- Nearby online driver lookup using a MongoDB 2dsphere index
- Realtime driver notification
- Driver accepts ride
- Passenger receives accepted, arrived, in_progress, completed, cancelled status updates
- Passenger receives driver live location during an active ride

## Run locally

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

The API and Socket.IO server run at:

```text
http://localhost:4000
```

## Deployment note

Because realtime Socket.IO is running in `server.ts`, deploy this backend to a Node server/VPS/container platform. Do not deploy this version as pure Vercel serverless functions.

## API endpoints

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/places/autocomplete?input=market&lat=14.1&lng=121.0`
- `GET /api/places/details?placeId=...`
- `GET /api/directions?originLat=...&originLng=...&destLat=...&destLng=...`
- `POST /api/rides/request`
- `GET /api/rides/:rideId`

## Socket events

Client emits:

- `driver:location` `{ lat, lng, heading }`
- `driver:accept_ride` `{ rideId }`
- `ride:status` `{ rideId, status }` where status is `arrived`, `in_progress`, `completed`, or `cancelled`

Server emits:

- `ride:request`
- `ride:update`
- `ride:driver_location`
- `error_message`

## Environment setup

Create a `.env` file inside this `backend` folder before running the server:

```env
MONGODB_URI=mongodb+srv://YOUR_USER:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/db?retryWrites=true&w=majority
JWT_SECRET=change-this-to-a-long-random-secret
GOOGLE_MAPS_API_KEY=your-google-maps-api-key
PORT=4000
CORS_ORIGIN=*
```

The custom server loads this file via `dotenv/config`.
