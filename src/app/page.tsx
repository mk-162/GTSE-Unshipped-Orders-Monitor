'use client';

import { useState, useEffect, useCallback } from 'react';

interface Order {
  id: number;
  date_created: string;
  total_inc_tax: string;
  hours_open: number;
  is_overdue: boolean;
  billing_address: {
    first_name: string;
    last_name: string;
    company: string;
    email: string;
  };
}

interface OrdersResponse {
  orders: Order[];
  total: number;
  overdue: number;
  thresholdHours: number;
  lastChecked: string;
  error?: string;
}

export default function Dashboard() {
  const [data, setData] = useState<OrdersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const storeHash = process.env.NEXT_PUBLIC_BIGCOMMERCE_STORE_HASH || 'usnceuurb6';

  const fetchOrders = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    setError(null);

    try {
      const response = await fetch('/api/orders');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch orders');
      }

      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const getHoursBadgeClass = (hours: number, threshold: number): string => {
    if (hours >= threshold * 2) return 'hours-badge danger';
    if (hours >= threshold) return 'hours-badge warning';
    return 'hours-badge ok';
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      <header className="header">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <img
            src="https://cdn11.bigcommerce.com/s-v8oj4rfmzr/images/stencil/250x100/gtse_logo_1612977822__44777.original.png"
            alt="GTSE"
            className="header-logo"
          />
          <span className="header-title">Unshipped Orders Monitor</span>
        </div>
      </header>

      <main className="main-content">
        {error && (
          <div className="error">
            <strong>Error:</strong> {error}
          </div>
        )}

        {loading ? (
          <div className="loading">Loading orders...</div>
        ) : data ? (
          <>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-label">Total Awaiting Shipment</div>
                <div className="stat-value">{data.total}</div>
              </div>
              <div className={`stat-card ${data.overdue > 0 ? 'warning' : ''}`}>
                <div className="stat-label">Over {data.thresholdHours}h Threshold</div>
                <div className={`stat-value ${data.overdue > 0 ? 'warning' : ''}`}>
                  {data.overdue}
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Threshold</div>
                <div className="stat-value">{data.thresholdHours}h</div>
              </div>
            </div>

            <div className="orders-table-container">
              <div className="table-header">
                <h2 className="table-title">Orders Awaiting Shipment</h2>
                <button
                  className="refresh-btn"
                  onClick={() => fetchOrders(true)}
                  disabled={refreshing}
                >
                  {refreshing ? (
                    <>
                      <span>↻</span> Refreshing...
                    </>
                  ) : (
                    <>
                      <span>↻</span> Refresh
                    </>
                  )}
                </button>
              </div>

              {data.orders.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">✓</div>
                  <div className="empty-state-text">
                    No orders awaiting shipment
                  </div>
                </div>
              ) : (
                <table className="orders-table">
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Customer</th>
                      <th>Date Placed</th>
                      <th>Hours Open</th>
                      <th>Total</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.orders.map((order) => (
                      <tr key={order.id}>
                        <td>
                          <span className="order-id">#{order.id}</span>
                        </td>
                        <td>
                          {order.billing_address?.company ||
                            `${order.billing_address?.first_name || ''} ${order.billing_address?.last_name || ''}`.trim() ||
                            'N/A'}
                        </td>
                        <td>{formatDate(order.date_created)}</td>
                        <td>
                          <span
                            className={getHoursBadgeClass(
                              order.hours_open,
                              data.thresholdHours
                            )}
                          >
                            {order.hours_open}h
                          </span>
                        </td>
                        <td>£{parseFloat(order.total_inc_tax).toFixed(2)}</td>
                        <td>
                          <a
                            href={`https://store-${storeHash}.mybigcommerce.com/manage/orders/${order.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="view-link"
                          >
                            View →
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {data.lastChecked && (
                <div className="last-updated">
                  Last updated: {formatDate(data.lastChecked)}
                </div>
              )}
            </div>
          </>
        ) : null}
      </main>
    </>
  );
}
