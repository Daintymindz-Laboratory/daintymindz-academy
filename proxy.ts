import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const protectedRoutes = ['/dashboard', '/catalog', '/my-courses', '/lesson', '/certificate', '/certificates', '/admin']
  const isProtected = protectedRoutes.some(route => request.nextUrl.pathname.startsWith(route))
  const token = request.cookies.get('sb-mlvlbsyvmmcwatteimpy-auth-token')
  if (isProtected && !token) {
    return NextResponse.redirect(new URL('/signin', request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logo.png|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)'],
}