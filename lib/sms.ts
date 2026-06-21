/**
 * Notify.lk SMS Notification System
 * https://app.notify.lk/api/v1/send
 * Fire-and-forget: NEVER crashes checkout flow
 */

interface OrderSMSData {
  orderId: string;
  customerName: string;
  customerPhone: string;
  totalAmount: number;
  fulfillmentMethod: string;
  paymentMethod?: string;
  deliveryDate?: string | null;
  deliveryTime?: string | null;
}

function formatSMSMessage(data: OrderSMSData): string {
  const shortId = data.orderId.slice(0, 8).toUpperCase();

  const schedule = data.deliveryDate
    ? `${data.fulfillmentMethod === 'Delivery' ? 'Delivery' : 'Pickup'}: ${data.deliveryDate}${data.deliveryTime ? ` @ ${data.deliveryTime}` : ''}`
    : data.fulfillmentMethod;

  return `CHRISH FLORA - NEW ORDER!
ID: #${shortId}
Customer: ${data.customerName}
Phone: ${data.customerPhone}
Amount: LKR ${data.totalAmount.toLocaleString()}
Payment: ${data.paymentMethod || 'Cash'}
${schedule}
Time: ${new Date().toLocaleString('en-LK', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })}`;
}

export async function sendAdminSMS(data: OrderSMSData): Promise<void> {
  // Fire-and-forget: NEVER throws, NEVER blocks checkout
  try {
    const userId = process.env.NOTIFY_USER_ID;
    const apiKey = process.env.NOTIFY_API_KEY;
    const adminPhone = process.env.ADMIN_PHONE_NUMBER;

    if (!userId || !apiKey || !adminPhone) {
      console.log('SMS skipped: Notify.lk credentials not configured');
      return;
    }

    const message = formatSMSMessage(data);

    // Build URL with query params (Notify.lk HTTP GET API)
    const params = new URLSearchParams({
      user_id: userId,
      api_key: apiKey,
      sender_id: '',
      to: adminPhone,
      message: message,
    });
    const url = `https://app.notify.lk/api/v1/send?${params.toString()}`;

    // 8 second timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const result = await response.json().catch(() => ({}));

    if (response.ok && result.status === 'success') {
      console.log(`✅ SMS sent for order #${data.orderId.slice(0, 8).toUpperCase()}`);
    } else {
      console.warn(`⚠️ SMS failed:`, result);
    }

  } catch (error: any) {
    // NEVER re-throw — fire-and-forget
    if (error.name === 'AbortError') {
      console.warn('SMS timed out (non-critical)');
    } else {
      console.warn('SMS error (non-critical):', error.message);
    }
  }
}
