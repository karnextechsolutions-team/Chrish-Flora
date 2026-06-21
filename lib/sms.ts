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
    ? `${data.fulfillmentMethod === 'Delivery' ? 'Delivery' : 'Pickup'}: ${data.deliveryDate}${
        data.deliveryTime ? ` @ ${data.deliveryTime}` : ''
      }`
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
  console.log('[SMS] ===== sendAdminSMS CALLED =====');
  console.log('[SMS] Order ID:', data.orderId);
  console.log('[SMS] Customer:', data.customerName);

  try {
    const userId    = process.env.NOTIFY_USER_ID;
    const apiKey    = process.env.NOTIFY_API_KEY;
    const adminPhone = process.env.ADMIN_PHONE_NUMBER;

    console.log('[SMS] Env check → NOTIFY_USER_ID:', userId ? `set (${userId.slice(0, 4)}...)` : 'MISSING ❌');
    console.log('[SMS] Env check → NOTIFY_API_KEY:', apiKey ? `set (${apiKey.slice(0, 4)}...)` : 'MISSING ❌');
    console.log('[SMS] Env check → ADMIN_PHONE_NUMBER:', adminPhone ?? 'MISSING ❌');

    if (!userId || !apiKey || !adminPhone) {
      console.error('[SMS] ❌ ABORT: One or more env vars are missing. SMS will NOT be sent.');
      return;
    }

    const message = formatSMSMessage(data);
    console.log('[SMS] Message formatted. Length:', message.length);

    const payload = {
      user_id:   userId,
      api_key:   apiKey,
      sender_id: '',
      to:        adminPhone,
      message:   message,
    };

    console.log('[SMS] POST → https://app.notify.lk/api/v1/send');
    console.log('[SMS] Payload (redacted):', JSON.stringify({
      ...payload,
      api_key: payload.api_key.slice(0, 4) + '...',
      message: payload.message.slice(0, 40) + '...',
    }));

    // 15 second timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch('https://app.notify.lk/api/v1/send', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    clearTimeout(timeout);

    console.log('[SMS] HTTP status:', response.status, response.statusText);

    const result = await response.json().catch(() => ({}));
    console.log('[SMS] Response body:', JSON.stringify(result));

    if (response.ok && result.status === 'success') {
      console.log(`[SMS] ✅ SUCCESS — SMS sent for order #${data.orderId.slice(0, 8).toUpperCase()}`);
    } else {
      console.warn(`[SMS] ⚠️ FAILED — HTTP ${response.status}. Body:`, result);
    }

  } catch (error: any) {
    // NEVER re-throw — fire-and-forget guarantee
    if (error.name === 'AbortError') {
      console.error('[SMS] ❌ TIMEOUT after 15s — Notify.lk did not respond in time.');
    } else {
      console.error('[SMS] ❌ ERROR (non-critical):', error.message);
    }
  }

  console.log('[SMS] ===== sendAdminSMS DONE =====');
}
