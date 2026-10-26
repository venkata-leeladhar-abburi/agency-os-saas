// Server only: the Supabase client for server components, actions and route handlers.
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseKey, supabaseUrl } from './url';

export async function supabaseServer() {
  const url = supabaseUrl();
  const key = supabaseKey();
  if (!url || !key) return undefined;
  const store = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll(list) {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // Called from a server component, which can't set cookies; the proxy refreshes the session instead.
        }
      },
    },
  });
}
