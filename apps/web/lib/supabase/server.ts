// Server only: route handlers, server components and server actions.
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseEnv } from './env';

export async function supabaseServer() {
  const { url, anonKey } = supabaseEnv();
  const store = await cookies();
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
