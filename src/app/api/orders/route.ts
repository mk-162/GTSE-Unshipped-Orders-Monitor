import { NextResponse } from 'next/server';
import { fetchAwaitingShipmentOrders, fetchRecentOrders } from '@/lib/bigcommerce';

export async function GET() {
    try {
        const [orders, recentOrders] = await Promise.all([
            fetchAwaitingShipmentOrders(),
            fetchRecentOrders()
        ]);

        // Sort overdue by hours_open descending (most overdue first)
        orders.sort((a, b) => b.hours_open - a.hours_open);

        const thresholdHours = parseInt(process.env.THRESHOLD_HOURS || '24', 10);
        const overdueCount = orders.filter(o => o.is_overdue).length;

        return NextResponse.json({
            orders,
            recentOrders,
            total: orders.length,
            overdue: overdueCount,
            thresholdHours,
            lastChecked: new Date().toISOString(),
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        return NextResponse.json(
            { error: 'Failed to fetch orders' },
            { status: 500 }
        );
    }
}
