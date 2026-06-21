import { NextRequest, NextResponse } from 'next/server';
import { sendAdminSMS } from '@/lib/sms';

export async function POST(req: NextRequest) {
  console.log('[notify-admin] ===== Route hit =====');
  try {
    const data = await req.json();
    console.log('[notify-admin] Received payload for order:', data?.orderId ?? 'MISSING');
    console.log('[notify-admin] Customer:', data?.customerName);
    console.log('[notify-admin] Amount:', data?.totalAmount);

    // IMPORTANT: We AWAIT here so Netlify doesn't kill the function
    // before the SMS fetch completes. The route itself still responds fast
    // because the client already got its checkout response.
    console.log('[notify-admin] Calling sendAdminSMS...');
    await sendAdminSMS({
      orderId:           data.orderId,
      customerName:      data.customerName,
      customerPhone:     data.customerPhone,
      totalAmount:       data.totalAmount,
      fulfillmentMethod: data.fulfillmentMethod,
      paymentMethod:     data.paymentMethod || 'Cash on Delivery',
      deliveryDate:      data.deliveryDate || null,
      deliveryTime:      data.deliveryTime || null,
    });
    console.log('[notify-admin] sendAdminSMS completed.');

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[notify-admin] Route error:', err?.message ?? err);
    // Always return success — notification failure must never affect checkout
    return NextResponse.json({ success: false });
  }
}
