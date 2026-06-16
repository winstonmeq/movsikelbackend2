import { ok } from '@/lib/http';
import { withLogger } from '@/lib/logger';

export const GET = withLogger(async () => {
  return ok({ service: 'movsikel-backend', status: 'healthy' });
});
