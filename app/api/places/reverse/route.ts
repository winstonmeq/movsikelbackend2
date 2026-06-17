import { NextRequest } from 'next/server';
import { fail, ok } from '@/lib/http';
import { isInsideKidapawan } from '@/lib/kidapawan';

export async function GET(req: NextRequest) {
  try {
    const key = process.env.GOOGLE_MAPS_API_KEY;
    if (!key) return fail('Missing GOOGLE_MAPS_API_KEY', 500);

    const { searchParams } = new URL(req.url);
    const rawLat = searchParams.get('lat');
    const rawLng = searchParams.get('lng');
    if (rawLat === null || rawLng === null) return fail('lat and lng are required', 400);
    const lat = Number(rawLat);
    const lng = Number(rawLng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return fail('lat and lng must be valid numbers', 400);

    if (!isInsideKidapawan(lat, lng)) {
      return fail('That location is outside the Kidapawan City service area.', 422);
    }

    const params = new URLSearchParams({ latlng: `${lat},${lng}`, key });
    const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`);
    const json = await response.json();

    if (json.status !== 'OK' && json.status !== 'ZERO_RESULTS') {
      return fail(json.error_message || `Reverse geocode error: ${json.status}`, 502);
    }

    // Fall back to coordinates if Google can't name the spot — the exact lat/lng
    // is what the driver actually navigates to, so a missing address is fine.
    const first = Array.isArray(json.results) && json.results.length > 0 ? json.results[0] : null;
    const address = first?.formatted_address || `Pinned location (${lat.toFixed(6)}, ${lng.toFixed(6)})`;

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
