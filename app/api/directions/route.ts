import { fail } from '@/lib/http';

export async function GET() {
  return fail(
    'Directions API is disabled in this MovSikel build. Use Places API for destination coordinates and straight-line estimates in the apps.',
    410
  );
}
