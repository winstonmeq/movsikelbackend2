import { NextRequest } from 'next/server';
import { fail, ok } from '@/lib/http';

const MIN_QUERY_LENGTH = 3;
const MAX_RESULTS = 5;

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
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const sessionToken = cleanSessionToken(searchParams.get('sessionToken'));

    // Cost guard: do not call Google Places for very short input.
    if (input.length < MIN_QUERY_LENGTH) return ok({ predictions: [] });

    const params = new URLSearchParams({
      input,
      key,
      components: 'country:ph'
    });

    // Session tokens group autocomplete + place details into one search session.
    if (sessionToken) params.set('sessiontoken', sessionToken);

    if (lat && lng) {
      params.set('location', `${lat},${lng}`);
      params.set('radius', '30000');
    }

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
