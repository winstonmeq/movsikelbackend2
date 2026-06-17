import { NextRequest } from 'next/server';
import { fail, ok } from '@/lib/http';
import { isInsideKidapawan } from '@/lib/kidapawan';

function cleanSessionToken(value: string | null) {
  const token = (value || '').trim();
  return token.length > 0 && token.length <= 128 ? token : null;
}

export async function GET(req: NextRequest) {
  try {
    const key = process.env.GOOGLE_MAPS_API_KEY;
    if (!key) return fail('Missing GOOGLE_MAPS_API_KEY', 500);

    const { searchParams } = new URL(req.url);
    const placeId = searchParams.get('placeId');
    const sessionToken = cleanSessionToken(searchParams.get('sessionToken'));
    if (!placeId) return fail('placeId is required');

    const params = new URLSearchParams({
      place_id: placeId,
      // Cost guard: request only fields required by MovSikel passenger booking.
      fields: 'place_id,name,formatted_address,geometry/location',
      key
    });

    if (sessionToken) params.set('sessiontoken', sessionToken);

    const response = await fetch(`https://maps.googleapis.com/maps/api/place/details/json?${params.toString()}`);
    const json = await response.json();

    if (json.status !== 'OK') {
      return fail(json.error_message || `Place details error: ${json.status}`, 502);
    }

    const place = json.result;
    const lat = place.geometry.location.lat;
    const lng = place.geometry.location.lng;

    // Hard service-area limit: reject destinations outside Kidapawan City.
    if (!isInsideKidapawan(lat, lng)) {
      return fail('That location is outside the Kidapawan City service area.', 422);
    }

    return ok({
      place: {
        placeId: place.place_id,
        name: place.name,
        address: place.formatted_address,
        lat,
        lng
      }
    });
  } catch (err: unknown) {
    return fail(err instanceof Error ? err.message : 'Place details failed');
  }
}
