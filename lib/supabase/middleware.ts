// lib/supabase/middleware.ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet: any[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { pathname } = request.nextUrl;

  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, is_active')
        .eq('id', user.id)
        .single();

      if (profile) {
        // If profile is deactivated, sign out and redirect to login
        if (profile.is_active === false && !pathname.startsWith('/auth')) {
          await supabase.auth.signOut();
          const url = request.nextUrl.clone();
          url.pathname = '/auth/login';
          url.searchParams.set('error', 'Account deactivated');
          const redirectResponse = NextResponse.redirect(url);
          // Transfer cookies so the signed-out session is persisted
          supabaseResponse.cookies.getAll().forEach(cookie => {
            redirectResponse.cookies.set(cookie.name, cookie.value);
          });
          return redirectResponse;
        }

        // Protect admin routes
        if (pathname.startsWith('/admin')) {
          if (profile.role === 'customer') {
            const url = request.nextUrl.clone();
            url.pathname = '/storefront';
            return NextResponse.redirect(url);
          }

          if (profile.role === 'staff') {
            const allowed = 
              pathname.startsWith('/admin/pos') || 
              pathname.startsWith('/admin/orders') || 
              pathname.startsWith('/admin/dashboard');
            
            if (!allowed) {
              const url = request.nextUrl.clone();
              url.pathname = '/admin/pos';
              return NextResponse.redirect(url);
            }
          }
          // admins can access all /admin routes
        }
      } else {
        // Logged in but profile doesn't exist
        if (pathname.startsWith('/admin')) {
          const url = request.nextUrl.clone();
          url.pathname = '/auth/login';
          return NextResponse.redirect(url);
        }
      }
    } else {
      // Not logged in
      if (pathname.startsWith('/admin')) {
        const url = request.nextUrl.clone();
        url.pathname = '/auth/login';
        return NextResponse.redirect(url);
      }
    }
  } catch (e) {
    // If Supabase is unreachable, redirect admin routes to login
    if (pathname.startsWith('/admin')) {
      const url = request.nextUrl.clone();
      url.pathname = '/auth/login';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
