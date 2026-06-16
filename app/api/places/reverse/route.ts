import { NextRequest } from 'next/server';
import { fail, ok } from '@/lib/http';

// Kidapawan service-area box (same as the places routes) — a pinned drop-off
// outside the city is rejected so it stays consistent with search.
const KIDAPAWAN_BOUNDS = {
  minLat: 6.86,
  maxLat: 7.16,
  minLng: 124.94,
  maxLng: 125.24
};

function isInsideKidapawan(lat: number, lng: number) {
  return (
    lat >= KIDAPAWAN_BOUNDS.minLat &&
    lat <= KIDAPAWAN_BOUNDS.maxLat &&
    lng >= KIDAPAWAN_BOUNDS.minLng &&
    lng <= KIDAPAWAN_BOUNDS.maxLng
  );
}

export async function GET(req: NextRequest) {
  try {
    const key = process.env.GOOGLE_MAPS_API_KEY;
    if (!key) return fail('Missing GOOGLE_MAPS_API_KEY', 500);

    const { searchParams } = new URL(req.url);
    const lat = Number(searchParams.get('lat'));
    const lng = Number(searchParams.get('lng'));
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return fail('lat and lng are required');

    if (!isInsideKidapawan(lat, lng)) {
      return fail('That location is outside the Kidapawan City service area.', 422);
    }

    const params = new URLSearchParams({ latlng: `${lat},${lng}`, key });
    const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`);
    const json = await response.json();

    // Fall back to coordinates if Google can't name the spot — the exact lat/lng
    // is what the driver actually navigates to, so a missing address is fine.
    const first = Array.isArray(json.results) && json.results.length > 0 ? json.results[0] : null;
    const address = first?.formatted_address || `Pinned location (${lat.toFixed(5)}, ${lng.toFixed(5)})`;

    return ok({
      place: {
        placeId: first?.place_id || `pin_${lat.toFixed(6)}_${lng.toFixed(6)}`,
        name: 'Pinned drop-off',
        address,
        lat,
        lng
      }
    });
  } catch (err: unknown) {
    return fail(err instanceof Error ? err.message : 'Reverse geocode failed');
  }
}
