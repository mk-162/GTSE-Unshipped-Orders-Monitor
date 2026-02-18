'use client';

import { useState, useEffect, useCallback } from 'react';

type StoreRegion = 'us' | 'uk';

interface Order {
  id: number;
  date_created: string;
  total_inc_tax: string;
  status: string;
  hours_open: number;
  minutes_open: number;
  is_overdue: boolean;
  customer_message: string;
  store_region: StoreRegion;
  store_hash: string;
  billing_address: {
    first_name: string;
    last_name: string;
    company: string;
    email: string;
  };
}

interface OrdersResponse {
  store: StoreRegion;
  orders: Order[];
  recentOrders?: Order[];
  incompleteOrders?: Order[];
  incompleteAlerts: number;
  ordersWithComments?: Order[];
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
  const [activeTab, setActiveTab] = useState<'awaiting' | 'recent' | 'incomplete' | 'comments'>('awaiting');
  const [store, setStore] = useState<StoreRegion>('uk');

  const fetchOrders = useCallback(async (isRefresh = false, region?: StoreRegion) => {
    const targetStore = region || store;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    setError(null);

    try {
      const response = await fetch(`/api/orders?store=${targetStore}`);
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
  }, [store]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const switchStore = (region: StoreRegion) => {
    if (region === store) return;
    setStore(region);
    setData(null);
    fetchOrders(false, region);
  };

  const getCurrencySymbol = (): string => {
    return store === 'uk' ? '\u00A3' : '$';
  };

  const getStoreHash = (order?: Order): string => {
    if (order?.store_hash) return order.store_hash;
    if (store === 'uk') return process.env.NEXT_PUBLIC_BIGCOMMERCE_UK_STORE_HASH || 'v8oj4rfmzr';
    return process.env.NEXT_PUBLIC_BIGCOMMERCE_STORE_HASH || 'usnceuurb6';
  };

  const getHoursBadgeClass = (hours: number, threshold: number): string => {
    if (hours >= threshold * 2) return 'hours-badge danger';
    if (hours >= threshold) return 'hours-badge warning';
    return 'hours-badge ok';
  };

  const getStatusBadgeClass = (status: string): string => {
    const s = status.toLowerCase();
    if (s === 'shipped' || s === 'completed') return 'status-badge success';
    if (s === 'cancelled' || s === 'refunded') return 'status-badge neutral';
    if (s === 'incomplete') return 'status-badge danger';
    if (s.includes('awaiting shipment') || s.includes('awaiting fulfillment')) return 'status-badge warning';
    return 'status-badge info';
  };

  const getMinutesBadgeClass = (minutes: number): string => {
    if (minutes >= 60) return 'hours-badge danger';
    if (minutes >= 15) return 'hours-badge warning';
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

  const getCustomerName = (order: Order): string => {
    return order.billing_address?.company ||
      `${order.billing_address?.first_name || ''} ${order.billing_address?.last_name || ''}`.trim() ||
      'N/A';
  };

  const incompleteCount = data?.incompleteOrders?.length || 0;
  const commentsCount = data?.ordersWithComments?.length || 0;
  const incompleteAlertCount = data?.incompleteAlerts || 0;
  const currency = getCurrencySymbol();

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
        <div className="store-toggle">
          <button
            className={`store-toggle-btn ${store === 'uk' ? 'active' : ''}`}
            onClick={() => switchStore('uk')}
          >
            UK
          </button>
          <button
            className={`store-toggle-btn ${store === 'us' ? 'active' : ''}`}
            onClick={() => switchStore('us')}
          >
            US
          </button>
        </div>
      </header>

      <main className="main-content">
        {error && (
          <div className="error">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Alert Banners */}
        {data && incompleteAlertCount > 0 && (
          <div className="alert-banner alert-danger" onClick={() => setActiveTab('incomplete')} style={{ cursor: 'pointer' }}>
            <strong>{incompleteAlertCount} Incomplete Order{incompleteAlertCount > 1 ? 's' : ''}</strong> — stuck for 15+ minutes. Customer may have had a checkout issue.
          </div>
        )}

        {data && commentsCount > 0 && (
          <div className="alert-banner alert-info" onClick={() => setActiveTab('comments')} style={{ cursor: 'pointer' }}>
            <strong>{commentsCount} Order{commentsCount > 1 ? 's have' : ' has'} Customer Comments</strong> — click to review.
          </div>
        )}

        {loading ? (
          <div className="loading">Loading {store.toUpperCase()} orders...</div>
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
              <div className={`stat-card ${incompleteAlertCount > 0 ? 'danger' : ''}`}>
                <div className="stat-label">Incomplete (15+ min)</div>
                <div className={`stat-value ${incompleteAlertCount > 0 ? 'danger' : ''}`}>
                  {incompleteAlertCount}
                </div>
              </div>
              <div className={`stat-card ${commentsCount > 0 ? 'info' : ''}`}>
                <div className="stat-label">With Comments</div>
                <div className={`stat-value ${commentsCount > 0 ? 'info' : ''}`}>
                  {commentsCount}
                </div>
              </div>
            </div>

            <div className="orders-table-container">
              <div className="table-header">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
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
                  <button
                    className={`tab-btn ${activeTab === 'incomplete' ? 'active' : ''}`}
                    onClick={() => setActiveTab('incomplete')}
                  >
                    Incomplete
                    {incompleteAlertCount > 0 && (
                      <span className="tab-count danger">{incompleteAlertCount}</span>
                    )}
                  </button>
                  <button
                    className={`tab-btn ${activeTab === 'comments' ? 'active' : ''}`}
                    onClick={() => setActiveTab('comments')}
                  >
                    Comments
                    {commentsCount > 0 && (
                      <span className="tab-count info">{commentsCount}</span>
                    )}
                  </button>
                </div>
                <button
                  className="refresh-btn"
                  onClick={() => fetchOrders(true)}
                  disabled={refreshing}
                >
                  {refreshing ? (
                    <>
                      <span>&#8635;</span> Refreshing...
                    </>
                  ) : (
                    <>
                      <span>&#8635;</span> Refresh
                    </>
                  )}
                </button>
              </div>

              {activeTab === 'awaiting' ? (
                data.orders.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">&#10003;</div>
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
                            {order.customer_message && (
                              <span className="comment-indicator" title={order.customer_message}>&#128172;</span>
                            )}
                          </td>
                          <td>{getCustomerName(order)}</td>
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
                          <td>{currency}{parseFloat(order.total_inc_tax).toFixed(2)}</td>
                          <td>
                            <a
                              href={`https://store-${getStoreHash(order)}.mybigcommerce.com/manage/orders/${order.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="view-link"
                            >
                              View &rarr;
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              ) : activeTab === 'recent' ? (
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
                            {order.customer_message && (
                              <span className="comment-indicator" title={order.customer_message}>&#128172;</span>
                            )}
                          </td>
                          <td>
                            <span className={getStatusBadgeClass(order.status)}>
                              {order.status}
                            </span>
                          </td>
                          <td>{getCustomerName(order)}</td>
                          <td>{formatDate(order.date_created)}</td>
                          <td>{currency}{parseFloat(order.total_inc_tax).toFixed(2)}</td>
                          <td>
                            <a
                              href={`https://store-${getStoreHash(order)}.mybigcommerce.com/manage/orders/${order.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="view-link"
                            >
                              View &rarr;
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              ) : activeTab === 'incomplete' ? (
                !data.incompleteOrders || data.incompleteOrders.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">&#10003;</div>
                    <div className="empty-state-text">
                      No incomplete orders
                    </div>
                  </div>
                ) : (
                  <table className="orders-table">
                    <thead>
                      <tr>
                        <th>Order</th>
                        <th>Customer</th>
                        <th>Email</th>
                        <th>Date Started</th>
                        <th>Time Incomplete</th>
                        <th>Total</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.incompleteOrders.map((order) => (
                        <tr key={order.id} className={order.minutes_open >= 15 ? 'row-alert' : ''}>
                          <td>
                            <span className="order-id">#{order.id}</span>
                          </td>
                          <td>{getCustomerName(order)}</td>
                          <td style={{ fontSize: '13px' }}>{order.billing_address?.email || 'N/A'}</td>
                          <td>{formatDate(order.date_created)}</td>
                          <td>
                            <span className={getMinutesBadgeClass(order.minutes_open)}>
                              {order.minutes_open >= 60
                                ? `${Math.floor(order.minutes_open / 60)}h ${order.minutes_open % 60}m`
                                : `${order.minutes_open}m`}
                            </span>
                          </td>
                          <td>{currency}{parseFloat(order.total_inc_tax).toFixed(2)}</td>
                          <td>
                            <a
                              href={`https://store-${getStoreHash(order)}.mybigcommerce.com/manage/orders/${order.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="view-link"
                            >
                              View &rarr;
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              ) : (
                !data.ordersWithComments || data.ordersWithComments.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">&#10003;</div>
                    <div className="empty-state-text">
                      No orders with customer comments
                    </div>
                  </div>
                ) : (
                  <table className="orders-table">
                    <thead>
                      <tr>
                        <th>Order</th>
                        <th>Status</th>
                        <th>Customer</th>
                        <th>Comment</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.ordersWithComments.map((order) => (
                        <tr key={order.id}>
                          <td>
                            <span className="order-id">#{order.id}</span>
                          </td>
                          <td>
                            <span className={getStatusBadgeClass(order.status)}>
                              {order.status}
                            </span>
                          </td>
                          <td>{getCustomerName(order)}</td>
                          <td>
                            <div className="customer-comment">
                              &ldquo;{order.customer_message}&rdquo;
                            </div>
                          </td>
                          <td>
                            <a
                              href={`https://store-${getStoreHash(order)}.mybigcommerce.com/manage/orders/${order.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="view-link"
                            >
                              View &rarr;
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
                  Emails are sent automatically for both UK and US stores if any orders exceed the {data?.thresholdHours || 24}h threshold, if there are incomplete orders for 15+ minutes, or if any orders have customer comments. Checks run daily at:
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
                    <tr style={{ backgroundColor: '#fff8e6' }}>
                      <td><strong>15:55</strong></td>
                      <td>15:55</td>
                      <td>Pre-4pm alert</td>
                    </tr>
                  </tbody>
                </table>
                <p style={{ color: '#999', marginTop: '12px', fontSize: '12px' }}>
                  Note: Times shown are GMT. During BST (British Summer Time), email will send at 16:55.
                </p>
              </div>
            </div>
          </>
        ) : null}
      </main>
    </>
  );
}
