import { NextRequest } from 'next/server';
import { fail, ok } from '@/lib/http';

const MIN_QUERY_LENGTH = 3;
const MAX_RESULTS = 5;

// --- Kidapawan City service area ---------------------------------------------
// Pilot is limited to Kidapawan City, Cotabato. We bias the Places search hard
// toward the city center with a city-sized radius so results are local. (The
// legacy Places Autocomplete endpoint supports location+radius BIASING but not
// strict rectangle restriction, so this strongly prefers — but cannot 100%
// guarantee exclusion of — nearby out-of-city results.)
const KIDAPAWAN_CENTER = { lat: 7.0083, lng: 125.0894 };
const KIDAPAWAN_RADIUS_METERS = 15000; // ~covers the 358 km² city + small buffer

function cleanSessionToken(value: string | null) {
  const token = (value || '').trim();
  return token.length > 0 && token.length <= 128 ? token : null;
}

export async function GET(req: NextRequest) {
  try {
    const key = process.env.GOOGLE_MAPS_API_KEY;
    if (!key) return fail('Missing GOOGLE_MAPS_API_KEY', 500);

    const { searchParams } = new URL(req.url);
    const input = (searchParams.get('input') || '').trim();
    const sessionToken = cleanSessionToken(searchParams.get('sessionToken'));

    // Cost guard: do not call Google Places for very short input.
    if (input.length < MIN_QUERY_LENGTH) return ok({ predictions: [] });

    const params = new URLSearchParams({
      input,
      key,
      components: 'country:ph',
      // Always bias to Kidapawan center with a city-sized radius. We ignore any
      // lat/lng the client sends so the search stays locked to the service area
      // regardless of where the user's GPS actually is.
      location: `${KIDAPAWAN_CENTER.lat},${KIDAPAWAN_CENTER.lng}`,
      radius: String(KIDAPAWAN_RADIUS_METERS)
    });

    // Session tokens group autocomplete + place details into one search session.
    if (sessionToken) params.set('sessiontoken', sessionToken);

    const response = await fetch(`https://maps.googleapis.com/maps/api/place/autocomplete/json?${params.toString()}`);
    const json = await response.json();

    if (json.status !== 'OK' && json.status !== 'ZERO_RESULTS') {
      return fail(json.error_message || `Places error: ${json.status}`, 502);
    }

    return ok({
      predictions: (json.predictions || []).slice(0, MAX_RESULTS).map((p: any) => ({
        placeId: p.place_id,
        description: p.description,
        mainText: p.structured_formatting?.main_text,
        secondaryText: p.structured_formatting?.secondary_text
      })),
      minQueryLength: MIN_QUERY_LENGTH,
      maxResults: MAX_RESULTS
    });
  } catch (err: unknown) {
    return fail(err instanceof Error ? err.message : 'Places autocomplete failed');
  }
}
