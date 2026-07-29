import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const sessionMode = request.cookies.get('dm-session-mode')?.value;
  const sessionActive = request.cookies.get('dm-session-active')?.value;
  if (user && sessionMode === 'session' && !sessionActive) {
    await supabase.auth.signOut();
    const redirect = NextResponse.redirect(new URL('/signin', request.url));
    response.cookies.getAll().forEach(cookie => redirect.cookies.set(cookie));
    return redirect;
  }

  // Protected routes: redirect to signin if not logged in
  const protectedRoutes = ['/dashboard', '/catalog', '/lesson', '/project', '/certificate', '/certificates', '/admin', '/my-courses', '/messages'];
  const isProtected = protectedRoutes.some(route => request.nextUrl.pathname.startsWith(route));

  let approvalStatus: string | null = null;
  if (user) {
    const { data: profile, error: approvalError } = await supabase
      .from('profiles')
      .select('approval_status')
      .eq('id', user.id)
      .maybeSingle();
    // If the migration has not reached Supabase yet, preserve existing access
    // instead of locking out the entire Academy during deployment.
    if (!approvalError) approvalStatus = profile?.approval_status || 'pending';
  }

  if (isProtected && !user) {
    return NextResponse.redirect(new URL('/signin', request.url));
  }

  if (isProtected && user && approvalStatus && approvalStatus !== 'approved') {
    return NextResponse.redirect(new URL('/pending-approval', request.url));
  }

  if (request.nextUrl.pathname === '/pending-approval' && user && approvalStatus === 'approved') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Auth routes: redirect to dashboard if already logged in
  if ((request.nextUrl.pathname === '/signin' || request.nextUrl.pathname === '/signup') && user) {
    return NextResponse.redirect(new URL(approvalStatus && approvalStatus !== 'approved' ? '/pending-approval' : '/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logo.png|logo-alt.png).*)'],
};
