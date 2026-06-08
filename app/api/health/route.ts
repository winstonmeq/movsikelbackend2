import { ok } from '@/lib/http';

export async function GET() {
  return ok({ service: 'movsikel-backend', status: 'healthy' });
}
