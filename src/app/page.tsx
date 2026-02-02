'use client';

import { useState, useEffect, useCallback } from 'react';

interface Order {
  id: number;
  date_created: string;
  total_inc_tax: string;
  status: string;
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
  recentOrders?: Order[];
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
  const [activeTab, setActiveTab] = useState<'awaiting' | 'recent'>('awaiting');

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

  const getStatusBadgeClass = (status: string): string => {
    const s = status.toLowerCase();
    if (s === 'shipped' || s === 'completed') return 'status-badge success';
    if (s === 'cancelled' || s === 'refunded') return 'status-badge neutral';
    if (s.includes('awaiting shipment') || s.includes('awaiting fulfillment')) return 'status-badge warning';
    return 'status-badge info';
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
                <div>
                  <button
                    className={`tab-btn ${activeTab === 'awaiting' ? 'active' : ''}`}
                    onClick={() => setActiveTab('awaiting')}
                  >
                    Awaiting Shipment
                  </button>
                  <button
                    className={`tab-btn ${activeTab === 'recent' ? 'active' : ''}`}
                    onClick={() => setActiveTab('recent')}
                  >
                    Recent Orders
                  </button>
                </div>
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

              {activeTab === 'awaiting' ? (
                /* Awaiting Shipment View */
                data.orders.length === 0 ? (
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
                )
              ) : (
                /* Recent Orders View */
                !data.recentOrders || data.recentOrders.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-text">
                      No recent orders found
                    </div>
                  </div>
                ) : (
                  <table className="orders-table">
                    <thead>
                      <tr>
                        <th>Order</th>
                        <th>Status</th>
                        <th>Customer</th>
                        <th>Date Placed</th>
                        <th>Total</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recentOrders.map((order) => (
                        <tr key={order.id}>
                          <td>
                            <span className="order-id">#{order.id}</span>
                          </td>
                          <td>
                            <span className={getStatusBadgeClass(order.status)}>
                              {order.status}
                            </span>
                          </td>
                          <td>
                            {order.billing_address?.company ||
                              `${order.billing_address?.first_name || ''} ${order.billing_address?.last_name || ''}`.trim() ||
                              'N/A'}
                          </td>
                          <td>{formatDate(order.date_created)}</td>
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
                )
              )}

              {data.lastChecked && (
                <div className="last-updated">
                  Last updated: {formatDate(data.lastChecked)}
                </div>
              )}
            </div>

            {/* Schedule Info */}
            <div className="orders-table-container" style={{ marginTop: '24px' }}>
              <div className="table-header">
                <h2 className="table-title">Automatic Check Schedule</h2>
              </div>
              <div style={{ padding: '20px' }}>
                <p style={{ color: '#666', marginBottom: '16px', fontSize: '14px' }}>
                  Emails are sent automatically if any orders exceed the {data?.thresholdHours || 24}h threshold at these times:
                </p>
                <table className="orders-table">
                  <thead>
                    <tr>
                      <th>Time (UK)</th>
                      <th>Time (UTC)</th>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>00:55</strong></td>
                      <td>00:55</td>
                      <td>Overnight check</td>
                    </tr>
                    <tr>
                      <td><strong>03:55</strong></td>
                      <td>03:55</td>
                      <td>Early morning</td>
                    </tr>
                    <tr>
                      <td><strong>06:55</strong></td>
                      <td>06:55</td>
                      <td>Morning check</td>
                    </tr>
                    <tr>
                      <td><strong>09:55</strong></td>
                      <td>09:55</td>
                      <td>Mid-morning</td>
                    </tr>
                    <tr>
                      <td><strong>12:55</strong></td>
                      <td>12:55</td>
                      <td>Lunchtime check</td>
                    </tr>
                    <tr style={{ backgroundColor: '#fff8e6' }}>
                      <td><strong>15:55</strong></td>
                      <td>15:55</td>
                      <td>⚡ Pre-4pm alert</td>
                    </tr>
                    <tr>
                      <td><strong>18:55</strong></td>
                      <td>18:55</td>
                      <td>End of day</td>
                    </tr>
                    <tr>
                      <td><strong>21:55</strong></td>
                      <td>21:55</td>
                      <td>Evening check</td>
                    </tr>
                  </tbody>
                </table>
                <p style={{ color: '#999', marginTop: '12px', fontSize: '12px' }}>
                  Note: Times shown are GMT. During BST (British Summer Time), add 1 hour.
                </p>
              </div>
            </div>
          </>
        ) : null}
      </main>
    </>
  );
}
