import { Resend } from 'resend';
import { OrderWithAge, StoreRegion } from './bigcommerce';

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

const EMAIL_WRAPPER_START = `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background: #4A4A4A; padding: 20px; text-align: center;">
      <img src="https://cdn11.bigcommerce.com/s-v8oj4rfmzr/images/stencil/250x100/gtse_logo_1612977822__44777.original.png" alt="GTSE" style="height: 40px;">
    </div>
    <div style="padding: 30px; background: #fff;">`;

function getEmailWrapperEnd(storeHash: string) {
  return `
      <a href="https://store-${storeHash}.mybigcommerce.com/manage/orders"
         style="display: inline-block; background: #E8A33C; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: 500;">
        View in BigCommerce
      </a>
    </div>
    <div style="background: #4A4A4A; padding: 15px; text-align: center; color: #999; font-size: 12px;">
      GTSE Unshipped Orders Monitor
    </div>
  </div>`;
}

function getStoreHash(region: StoreRegion): string {
  if (region === 'uk') return process.env.BIGCOMMERCE_UK_STORE_HASH || '';
  return process.env.BIGCOMMERCE_STORE_HASH || '';
}

function getAlertEmail(): string | null {
  const email = process.env.ALERT_EMAIL;
  if (!email) {
    console.error('ALERT_EMAIL not configured');
    return null;
  }
  return email;
}

function storeLabel(region: StoreRegion): string {
  return region.toUpperCase();
}

function currencySymbol(region: StoreRegion): string {
  return region === 'uk' ? '&pound;' : '$';
}

export async function sendAlertEmail(overdueOrders: OrderWithAge[], region: StoreRegion): Promise<boolean> {
  const alertEmail = getAlertEmail();
  if (!alertEmail || overdueOrders.length === 0) return !alertEmail ? false : true;

  const label = storeLabel(region);
  const sym = currencySymbol(region);

  const orderRows = overdueOrders
    .map(
      (order) =>
        `<tr>
          <td style="padding: 12px; border-bottom: 1px solid #eee;">#${order.id}</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee;">${order.billing_address?.company || `${order.billing_address?.first_name} ${order.billing_address?.last_name}`}</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee;">${new Date(order.date_created).toLocaleDateString('en-GB')}</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; color: #E8A33C; font-weight: bold;">${order.hours_open}h</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee;">${sym}${order.total_inc_tax}</td>
        </tr>`
    )
    .join('');

  const html = `${EMAIL_WRAPPER_START}
      <h1 style="color: #4A4A4A; margin: 0 0 10px 0; font-size: 24px;">[${label}] Unshipped Orders Alert</h1>
      <p style="color: #666; margin: 0 0 20px 0;">
        ${overdueOrders.length} order${overdueOrders.length > 1 ? 's have' : ' has'} exceeded the ${process.env.THRESHOLD_HOURS || 24} hour shipping threshold on the <strong>${label}</strong> store.
      </p>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <thead>
          <tr style="background: #F5F5F5;">
            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #E8A33C;">Order</th>
            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #E8A33C;">Customer</th>
            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #E8A33C;">Date</th>
            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #E8A33C;">Hours Open</th>
            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #E8A33C;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${orderRows}
        </tbody>
      </table>
    ${getEmailWrapperEnd(getStoreHash(region))}`;

  try {
    await getResend().emails.send({
      from: 'GTSE Orders <onboarding@resend.dev>',
      to: alertEmail,
      subject: `[${label}] ${overdueOrders.length} Unshipped Order${overdueOrders.length > 1 ? 's' : ''} Require Attention`,
      html,
    });
    return true;
  } catch (error) {
    console.error(`Failed to send overdue email (${label}):`, error);
    return false;
  }
}

export async function sendIncompleteOrdersEmail(incompleteOrders: OrderWithAge[], region: StoreRegion): Promise<boolean> {
  const alertEmail = getAlertEmail();
  if (!alertEmail || incompleteOrders.length === 0) return !alertEmail ? false : true;

  const label = storeLabel(region);
  const sym = currencySymbol(region);

  const orderRows = incompleteOrders
    .map(
      (order) =>
        `<tr>
          <td style="padding: 12px; border-bottom: 1px solid #eee;">#${order.id}</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee;">${order.billing_address?.company || `${order.billing_address?.first_name} ${order.billing_address?.last_name}`}</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee;">${order.billing_address?.email || 'N/A'}</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee;">${new Date(order.date_created).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; color: #c62828; font-weight: bold;">${order.minutes_open} min</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee;">${sym}${order.total_inc_tax}</td>
        </tr>`
    )
    .join('');

  const html = `${EMAIL_WRAPPER_START}
      <h1 style="color: #c62828; margin: 0 0 10px 0; font-size: 24px;">[${label}] Incomplete Orders Alert</h1>
      <p style="color: #666; margin: 0 0 20px 0;">
        ${incompleteOrders.length} order${incompleteOrders.length > 1 ? 's have' : ' has'} been in <strong>Incomplete</strong> status for more than 15 minutes on the <strong>${label}</strong> store. These may need attention — the customer may have had a problem at checkout.
      </p>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <thead>
          <tr style="background: #F5F5F5;">
            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #c62828;">Order</th>
            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #c62828;">Customer</th>
            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #c62828;">Email</th>
            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #c62828;">Date</th>
            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #c62828;">Time Incomplete</th>
            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #c62828;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${orderRows}
        </tbody>
      </table>
    ${getEmailWrapperEnd(getStoreHash(region))}`;

  try {
    await getResend().emails.send({
      from: 'GTSE Orders <onboarding@resend.dev>',
      to: alertEmail,
      subject: `[${label}] ${incompleteOrders.length} Incomplete Order${incompleteOrders.length > 1 ? 's' : ''} - Checkout May Have Failed`,
      html,
    });
    return true;
  } catch (error) {
    console.error(`Failed to send incomplete orders email (${label}):`, error);
    return false;
  }
}

export async function sendCustomerCommentsEmail(ordersWithComments: OrderWithAge[], region: StoreRegion): Promise<boolean> {
  const alertEmail = getAlertEmail();
  if (!alertEmail || ordersWithComments.length === 0) return !alertEmail ? false : true;

  const label = storeLabel(region);

  const orderRows = ordersWithComments
    .map(
      (order) =>
        `<tr>
          <td style="padding: 12px; border-bottom: 1px solid #eee; vertical-align: top;">#${order.id}</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; vertical-align: top;">${order.billing_address?.company || `${order.billing_address?.first_name} ${order.billing_address?.last_name}`}</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; vertical-align: top;">
            <span style="display: inline-block; padding: 4px 8px; background: #e3f2fd; border-radius: 4px; font-size: 12px;">${order.status}</span>
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; vertical-align: top;">
            <div style="background: #fffde7; padding: 8px 12px; border-left: 3px solid #E8A33C; border-radius: 2px; font-style: italic; color: #555;">
              "${order.customer_message}"
            </div>
          </td>
        </tr>`
    )
    .join('');

  const html = `${EMAIL_WRAPPER_START}
      <h1 style="color: #4A4A4A; margin: 0 0 10px 0; font-size: 24px;">[${label}] Orders With Customer Comments</h1>
      <p style="color: #666; margin: 0 0 20px 0;">
        ${ordersWithComments.length} order${ordersWithComments.length > 1 ? 's have' : ' has'} comments from the customer on the <strong>${label}</strong> store that may need attention.
      </p>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <thead>
          <tr style="background: #F5F5F5;">
            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #E8A33C;">Order</th>
            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #E8A33C;">Customer</th>
            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #E8A33C;">Status</th>
            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #E8A33C;">Comment</th>
          </tr>
        </thead>
        <tbody>
          ${orderRows}
        </tbody>
      </table>
    ${getEmailWrapperEnd(getStoreHash(region))}`;

  try {
    await getResend().emails.send({
      from: 'GTSE Orders <onboarding@resend.dev>',
      to: alertEmail,
      subject: `[${label}] ${ordersWithComments.length} Order${ordersWithComments.length > 1 ? 's Have' : ' Has'} Customer Comments`,
      html,
    });
    return true;
  } catch (error) {
    console.error(`Failed to send customer comments email (${label}):`, error);
    return false;
  }
}
