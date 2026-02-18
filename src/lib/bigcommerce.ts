// BigCommerce API client for fetching orders from US and UK stores

export type StoreRegion = 'us' | 'uk';

interface StoreConfig {
    storeHash: string;
    accessToken: string;
    currency: string;
    adminUrl: string;
}

function getStoreConfig(region: StoreRegion): StoreConfig {
    if (region === 'uk') {
        const storeHash = process.env.BIGCOMMERCE_UK_STORE_HASH;
        const accessToken = process.env.BIGCOMMERCE_UK_ACCESS_TOKEN;
        if (!storeHash || !accessToken) {
            throw new Error('UK BigCommerce credentials not configured');
        }
        return {
            storeHash,
            accessToken,
            currency: 'GBP',
            adminUrl: `https://store-${storeHash}.mybigcommerce.com/manage/orders`,
        };
    }

    const storeHash = process.env.BIGCOMMERCE_STORE_HASH;
    const accessToken = process.env.BIGCOMMERCE_ACCESS_TOKEN;
    if (!storeHash || !accessToken) {
        throw new Error('US BigCommerce credentials not configured');
    }
    return {
        storeHash,
        accessToken,
        currency: 'USD',
        adminUrl: `https://store-${storeHash}.mybigcommerce.com/manage/orders`,
    };
}

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
    customer_message: string;
}

export interface OrderWithAge extends Order {
    hours_open: number;
    minutes_open: number;
    is_overdue: boolean;
    store_region: StoreRegion;
    store_hash: string;
}

async function fetchOrdersByStatus(region: StoreRegion, statusId: number, limit = 250): Promise<Order[]> {
    const config = getStoreConfig(region);

    const response = await fetch(
        `https://api.bigcommerce.com/stores/${config.storeHash}/v2/orders?status_id=${statusId}&limit=${limit}`,
        {
            headers: {
                'X-Auth-Token': config.accessToken,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            cache: 'no-store',
        }
    );

    if (response.status === 204) return [];
    if (!response.ok) {
        throw new Error(`BigCommerce API error (${region.toUpperCase()}): ${response.status} ${response.statusText}`);
    }

    const text = await response.text();
    if (!text || text.trim() === '') return [];

    return JSON.parse(text);
}

function addAgeFields(orders: Order[], region: StoreRegion): OrderWithAge[] {
    const thresholdHours = parseInt(process.env.THRESHOLD_HOURS || '24', 10);
    const now = new Date();
    const config = getStoreConfig(region);

    return orders.map((order) => {
        const createdAt = new Date(order.date_created);
        const diffMs = now.getTime() - createdAt.getTime();
        const hoursOpen = Math.floor(diffMs / (1000 * 60 * 60));
        const minutesOpen = Math.floor(diffMs / (1000 * 60));

        return {
            ...order,
            customer_message: order.customer_message || '',
            hours_open: hoursOpen,
            minutes_open: minutesOpen,
            is_overdue: hoursOpen >= thresholdHours,
            store_region: region,
            store_hash: config.storeHash,
        };
    });
}

export async function fetchAwaitingShipmentOrders(region: StoreRegion): Promise<OrderWithAge[]> {
    const orders = await fetchOrdersByStatus(region, 11);
    return addAgeFields(orders, region);
}

export async function fetchIncompleteOrders(region: StoreRegion): Promise<OrderWithAge[]> {
    // BigCommerce status_id 0 = Incomplete
    const orders = await fetchOrdersByStatus(region, 0);
    return addAgeFields(orders, region);
}

export async function getOrdersExceedingThreshold(region: StoreRegion): Promise<OrderWithAge[]> {
    const orders = await fetchAwaitingShipmentOrders(region);
    return orders.filter((order) => order.is_overdue);
}

export async function getIncompleteOrdersExceedingMinutes(region: StoreRegion, minutes = 15): Promise<OrderWithAge[]> {
    const orders = await fetchIncompleteOrders(region);
    return orders.filter((order) => order.minutes_open >= minutes);
}

export async function fetchRecentOrders(region: StoreRegion): Promise<OrderWithAge[]> {
    const config = getStoreConfig(region);

    const response = await fetch(
        `https://api.bigcommerce.com/stores/${config.storeHash}/v2/orders?limit=20&sort=date_created:desc`,
        {
            headers: {
                'X-Auth-Token': config.accessToken,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            cache: 'no-store',
        }
    );

    if (response.status === 204) return [];
    if (!response.ok) throw new Error(`BigCommerce API error (${region.toUpperCase()}): ${response.status}`);

    const text = await response.text();
    if (!text || text.trim() === '') return [];

    const orders: Order[] = JSON.parse(text);
    return addAgeFields(orders, region);
}
