import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    // Skip auth for cron endpoint (Vercel crons need access)
    if (request.nextUrl.pathname === '/api/check') {
        return NextResponse.next();
    }

    // Check for auth cookie
    const authCookie = request.cookies.get('gtse-auth');

    if (authCookie?.value === 'authenticated') {
        return NextResponse.next();
    }

    // Check if this is a login attempt
    if (request.nextUrl.pathname === '/api/login') {
        return NextResponse.next();
    }

    // Redirect to login page
    if (request.nextUrl.pathname !== '/login') {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
