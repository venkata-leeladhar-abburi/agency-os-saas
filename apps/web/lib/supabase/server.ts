// Server only: route handlers, server components and server actions.
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseEnv } from './env';

export async function supabaseServer() {
  // Read cookies first: it marks the page as dynamic, so signed-in routes are rendered per request
  // and never prerendered at build time (where the Supabase variables may not exist, as in CI).
  const store = await cookies();
  const { url, anonKey } = supabaseEnv();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (items) => {
        try {
          for (const { name, value, options } of items) store.set(name, value, options);
        } catch {
          // Called from a server component, where cookies are read-only; the proxy refreshes them.
        }
      },
    },
  });
}
