// BigCommerce API client for fetching orders
const STORE_HASH = process.env.BIGCOMMERCE_STORE_HASH;
const ACCESS_TOKEN = process.env.BIGCOMMERCE_ACCESS_TOKEN;

export interface Order {
    id: number;
    customer_id: number;
    date_created: string;
    status: string;
    status_id: number;
    total_inc_tax: string;
    billing_address: {
        first_name: string;
        last_name: string;
        company: string;
        email: string;
    };
    items_total: number;
}

export interface OrderWithAge extends Order {
    hours_open: number;
    is_overdue: boolean;
}

export async function fetchAwaitingShipmentOrders(): Promise<OrderWithAge[]> {
    if (!STORE_HASH || !ACCESS_TOKEN) {
        throw new Error('BigCommerce credentials not configured');
    }

    const response = await fetch(
        `https://api.bigcommerce.com/stores/${STORE_HASH}/v2/orders?status_id=9&limit=250`,
        {
            headers: {
                'X-Auth-Token': ACCESS_TOKEN,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            cache: 'no-store',
        }
    );

    // BigCommerce returns 204 No Content when there are no orders
    if (response.status === 204) {
        return [];
    }

    if (!response.ok) {
        throw new Error(`BigCommerce API error: ${response.status} ${response.statusText}`);
    }

    // Read as text first to handle empty responses
    const text = await response.text();
    if (!text || text.trim() === '') {
        return [];
    }

    const orders: Order[] = JSON.parse(text);
    const thresholdHours = parseInt(process.env.THRESHOLD_HOURS || '24', 10);

    return orders.map((order) => {
        const createdAt = new Date(order.date_created);
        const now = new Date();
        const hoursOpen = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60));

        return {
            ...order,
            hours_open: hoursOpen,
            is_overdue: hoursOpen >= thresholdHours,
        };
    });
}

export async function getOrdersExceedingThreshold(): Promise<OrderWithAge[]> {
    const orders = await fetchAwaitingShipmentOrders();
    return orders.filter((order) => order.is_overdue);
}
