// The Next.js route handlers that let Inngest run the jobs (app/api/inngest).
import { serve } from 'inngest/next';
import { inngest, jobFunctions } from './inngest';

export function serveJobs(deps: Parameters<typeof jobFunctions>[0]) {
  return serve({ client: inngest, functions: jobFunctions(deps) });
}
