import { Resend } from 'resend';
import { OrderWithAge } from './bigcommerce';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendAlertEmail(overdueOrders: OrderWithAge[]): Promise<boolean> {
    const alertEmail = process.env.ALERT_EMAIL;

    if (!alertEmail) {
        console.error('ALERT_EMAIL not configured');
        return false;
    }

    if (overdueOrders.length === 0) {
        return true; // No alert needed
    }

    const orderRows = overdueOrders
        .map(
            (order) =>
                `<tr>
          <td style="padding: 12px; border-bottom: 1px solid #eee;">#${order.id}</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee;">${order.billing_address?.company || `${order.billing_address?.first_name} ${order.billing_address?.last_name}`}</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee;">${new Date(order.date_created).toLocaleDateString('en-GB')}</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; color: #E8A33C; font-weight: bold;">${order.hours_open}h</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee;">£${order.total_inc_tax}</td>
        </tr>`
        )
        .join('');

    const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #4A4A4A; padding: 20px; text-align: center;">
        <img src="https://cdn11.bigcommerce.com/s-v8oj4rfmzr/images/stencil/250x100/gtse_logo_1612977822__44777.original.png" alt="GTSE" style="height: 40px;">
      </div>
      <div style="padding: 30px; background: #fff;">
        <h1 style="color: #4A4A4A; margin: 0 0 10px 0; font-size: 24px;">⚠️ Unshipped Orders Alert</h1>
        <p style="color: #666; margin: 0 0 20px 0;">
          ${overdueOrders.length} order${overdueOrders.length > 1 ? 's have' : ' has'} exceeded the ${process.env.THRESHOLD_HOURS || 24} hour shipping threshold.
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
        <a href="https://store-${process.env.BIGCOMMERCE_STORE_HASH}.mybigcommerce.com/manage/orders" 
           style="display: inline-block; background: #E8A33C; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: 500;">
          View in BigCommerce
        </a>
      </div>
      <div style="background: #4A4A4A; padding: 15px; text-align: center; color: #999; font-size: 12px;">
        GTSE Unshipped Orders Monitor
      </div>
    </div>
  `;

    try {
        await resend.emails.send({
            from: 'GTSE Orders <onboarding@resend.dev>',
            to: alertEmail,
            subject: `⚠️ ${overdueOrders.length} Unshipped Order${overdueOrders.length > 1 ? 's' : ''} Require Attention`,
            html,
        });
        return true;
    } catch (error) {
        console.error('Failed to send email:', error);
        return false;
    }
}
