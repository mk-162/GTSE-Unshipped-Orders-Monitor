import { NextResponse } from 'next/server';
import { getOrdersExceedingThreshold } from '@/lib/bigcommerce';
import { sendAlertEmail } from '@/lib/email';

// This endpoint is called by Vercel Cron every 3 hours
export async function GET(request: Request) {
    // Verify cron secret in production (optional but recommended)
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        console.log('Cron endpoint called - checking for overdue orders...');
    }

    try {
        const overdueOrders = await getOrdersExceedingThreshold();

        if (overdueOrders.length === 0) {
            console.log('No overdue orders found');
            return NextResponse.json({
                success: true,
                message: 'No overdue orders',
                checked: new Date().toISOString(),
            });
        }

        console.log(`Found ${overdueOrders.length} overdue orders, sending alert...`);

        const emailSent = await sendAlertEmail(overdueOrders);

        return NextResponse.json({
            success: true,
            overdueOrders: overdueOrders.length,
            emailSent,
            checked: new Date().toISOString(),
        });
    } catch (error) {
        console.error('Cron check failed:', error);
        return NextResponse.json(
            { error: 'Failed to check orders', details: String(error) },
            { status: 500 }
        );
    }
}
