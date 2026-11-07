import { NextResponse, type NextRequest } from 'next/server';
import { supabaseServer } from '../../../lib/supabase/server';

/** POST only, so a link or image can't sign someone out. `scope=global` signs out every device. */
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const supabase = await supabaseServer();
  await supabase.auth.signOut({ scope: form.get('scope') === 'global' ? 'global' : 'local' });
  return NextResponse.redirect(new URL('/sign-in', request.url), 303);
}
