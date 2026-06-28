import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const ALLOWED_DOMAINS = ['@maju.edu.pk', '@jinnah.edu', '@gmail.com'];

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();

      if (user?.email) {
        // Domain gate — only MAJU community emails
        if (!ALLOWED_DOMAINS.some((d) => user.email!.endsWith(d))) {
          await supabase.auth.signOut();
          return NextResponse.redirect(`${origin}/login?error=domain`);
        }

        // New Google OAuth user: profile exists (trigger created it) but role is null
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, department')
          .eq('id', user.id)
          .single();

        if (!profile?.role || !profile?.department) {
          return NextResponse.redirect(`${origin}/auth/setup`);
        }

        return NextResponse.redirect(`${origin}/dashboard`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=oauth`);
}
