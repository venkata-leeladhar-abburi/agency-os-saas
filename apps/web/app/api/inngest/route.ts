import { serveJobs } from '@agency-os/jobs/next';
import { database } from '@/lib/server/db';
import { digestItems } from '@/lib/server/digest';
import { jobEnv } from '@/lib/server/jobs';

// Inngest calls this to run the jobs (signed with INNGEST_SIGNING_KEY).
export const { GET, POST, PUT } = serveJobs({
  db: () => {
    const db = database();
    if (!db) throw new Error('DATABASE_URL is not set');
    return db;
  },
  env: jobEnv,
  digestItems,
});
