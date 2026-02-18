import { NextResponse } from 'next/server';

// Track last check time to only fetch new orders
let lastCheckTime = new Date();
lastCheckTime.setHours(0, 0, 0, 0); // Start of today

export async function GET() {
    try {
        const storeHash = process.env.BIGCOMMERCE_UK_STORE_HASH;
        const accessToken = process.env.BIGCOMMERCE_UK_ACCESS_TOKEN;

        if (!storeHash || !accessToken) {
            return NextResponse.json({ 
                error: 'BigCommerce credentials not configured',
                orders: [] 
            });
        }

        // Format date for BigCommerce API (ISO 8601)
        const minDateCreated = lastCheckTime.toISOString();
        
        // Fetch orders from BigCommerce
        const url = `https://api.bigcommerce.com/stores/${storeHash}/v2/orders?min_date_created=${encodeURIComponent(minDateCreated)}&sort=date_created:desc&limit=50`;
        
        const response = await fetch(url, {
            headers: {
                'X-Auth-Token': accessToken,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            next: { revalidate: 0 } // Don't cache
        });

        if (!response.ok) {
            console.error('BigCommerce API error:', response.status);
            return NextResponse.json({ orders: [], error: 'API error' });
        }

        const orders = await response.json();
        
        // Update last check time
        lastCheckTime = new Date();
        
        // Return orders with relevant fields
        const processedOrders = (orders || []).map((order: {
            id: number;
            date_created: string;
            status: string;
            total_inc_tax: string;
            billing_address?: {
                zip?: string;
                city?: string;
                country?: string;
            };
        }) => ({
            id: order.id,
            date_created: order.date_created,
            status: order.status,
            total: order.total_inc_tax,
            billing_address: order.billing_address ? {
                zip: order.billing_address.zip,
                city: order.billing_address.city,
                country: order.billing_address.country
            } : null
        }));

        return NextResponse.json({ 
            orders: processedOrders,
            count: processedOrders.length,
            lastCheck: lastCheckTime.toISOString()
        });

    } catch (error) {
        console.error('Error fetching orders:', error);
        return NextResponse.json({ orders: [], error: String(error) });
    }
}
