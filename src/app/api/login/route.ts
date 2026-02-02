import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    const { password } = await request.json();

    const correctPassword = process.env.DASHBOARD_PASSWORD || 'gtse2026';

    if (password === correctPassword) {
        const response = NextResponse.json({ success: true });

        // Set auth cookie (expires in 7 days)
        response.cookies.set('gtse-auth', 'authenticated', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7, // 7 days
        });

        return response;
    }

    return NextResponse.json({ success: false, error: 'Invalid password' }, { status: 401 });
}
