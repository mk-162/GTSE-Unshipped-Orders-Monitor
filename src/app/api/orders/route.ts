import { NextRequest, NextResponse } from 'next/server';
import { fetchAwaitingShipmentOrders, fetchRecentOrders, fetchIncompleteOrders, StoreRegion } from '@/lib/bigcommerce';

export async function GET(request: NextRequest) {
    const store = (request.nextUrl.searchParams.get('store') || 'uk') as StoreRegion;
    if (store !== 'us' && store !== 'uk') {
        return NextResponse.json({ error: 'Invalid store parameter' }, { status: 400 });
    }

    try {
        const [orders, recentOrders, incompleteOrders] = await Promise.all([
            fetchAwaitingShipmentOrders(store),
            fetchRecentOrders(store),
            fetchIncompleteOrders(store)
        ]);

        // Sort overdue by hours_open descending (most overdue first)
        orders.sort((a, b) => b.hours_open - a.hours_open);

        // Sort incomplete by minutes_open descending
        incompleteOrders.sort((a, b) => b.minutes_open - a.minutes_open);

        const thresholdHours = parseInt(process.env.THRESHOLD_HOURS || '24', 10);
        const overdueCount = orders.filter(o => o.is_overdue).length;

        // Find orders with customer comments across all order sets
        const allOrders = [...orders, ...recentOrders, ...incompleteOrders];
        const seenIds = new Set<number>();
        const ordersWithComments = allOrders.filter(o => {
            if (seenIds.has(o.id)) return false;
            seenIds.add(o.id);
            return o.customer_message && o.customer_message.trim() !== '';
        });

        // Incomplete orders that have been waiting 15+ minutes
        const incompleteAlerts = incompleteOrders.filter(o => o.minutes_open >= 15);

        return NextResponse.json({
            store,
            orders,
            recentOrders,
            incompleteOrders,
            incompleteAlerts: incompleteAlerts.length,
            ordersWithComments,
            total: orders.length,
            overdue: overdueCount,
            thresholdHours,
            lastChecked: new Date().toISOString(),
        });
    } catch (error) {
        console.error(`Error fetching orders (${store}):`, error);
        return NextResponse.json(
            { error: 'Failed to fetch orders' },
            { status: 500 }
        );
    }
}
