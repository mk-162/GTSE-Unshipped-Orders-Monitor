import { NextResponse } from 'next/server';
import { getOrdersExceedingThreshold, getIncompleteOrdersExceedingMinutes, fetchAwaitingShipmentOrders, fetchRecentOrders, fetchIncompleteOrders, StoreRegion } from '@/lib/bigcommerce';
import { sendAlertEmail, sendIncompleteOrdersEmail, sendCustomerCommentsEmail } from '@/lib/email';

const STORES: StoreRegion[] = ['uk', 'us'];

// This endpoint is called by Vercel Cron
export async function GET(request: Request) {
    // Verify cron secret in production (optional but recommended)
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        console.log('Cron endpoint called - checking for overdue orders...');
    }

    try {
        const results = [];

        for (const store of STORES) {
            const [overdueOrders, incompleteOrders, awaitingOrders, recentOrders, allIncomplete] = await Promise.all([
                getOrdersExceedingThreshold(store),
                getIncompleteOrdersExceedingMinutes(store, 15),
                fetchAwaitingShipmentOrders(store),
                fetchRecentOrders(store),
                fetchIncompleteOrders(store)
            ]);

            // Find orders with customer comments
            const allOrders = [...awaitingOrders, ...recentOrders, ...allIncomplete];
            const seenIds = new Set<number>();
            const ordersWithComments = allOrders.filter(o => {
                if (seenIds.has(o.id)) return false;
                seenIds.add(o.id);
                return o.customer_message && o.customer_message.trim() !== '';
            });

            const storeLabel = store.toUpperCase();
            let overdueEmailSent = false;
            let incompleteEmailSent = false;
            let commentsEmailSent = false;

            if (overdueOrders.length > 0) {
                console.log(`[${storeLabel}] Found ${overdueOrders.length} overdue orders, sending alert...`);
                overdueEmailSent = await sendAlertEmail(overdueOrders, store);
            }

            if (incompleteOrders.length > 0) {
                console.log(`[${storeLabel}] Found ${incompleteOrders.length} incomplete orders (15+ min), sending alert...`);
                incompleteEmailSent = await sendIncompleteOrdersEmail(incompleteOrders, store);
            }

            if (ordersWithComments.length > 0) {
                console.log(`[${storeLabel}] Found ${ordersWithComments.length} orders with customer comments, sending alert...`);
                commentsEmailSent = await sendCustomerCommentsEmail(ordersWithComments, store);
            }

            results.push({
                store,
                overdueOrders: overdueOrders.length,
                incompleteOrders: incompleteOrders.length,
                ordersWithComments: ordersWithComments.length,
                overdueEmailSent,
                incompleteEmailSent,
                commentsEmailSent,
            });
        }

        return NextResponse.json({
            success: true,
            results,
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
