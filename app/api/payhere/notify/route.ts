import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { sendAdminSMS } from '@/lib/sms';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const merchant_id      = formData.get('merchant_id')      as string;
    const order_id         = formData.get('order_id')         as string;
    const payment_id       = formData.get('payment_id')       as string;
    const payhere_amount   = formData.get('payhere_amount')   as string;
    const payhere_currency = formData.get('payhere_currency') as string;
    const status_code      = formData.get('status_code')      as string;
    const md5sig           = formData.get('md5sig')           as string;

    // Verify signature
    const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET!;
    const hashedSecret = crypto
      .createHash('md5')
      .update(merchantSecret)
      .digest('hex')
      .toUpperCase();

    const expectedSig = crypto
      .createHash('md5')
      .update(merchant_id + order_id + payhere_amount + payhere_currency + status_code + hashedSecret)
      .digest('hex')
      .toUpperCase();

    if (md5sig !== expectedSig) {
      console.error('PayHere: Invalid signature');
      return new NextResponse('Invalid signature', { status: 400 });
    }

    // Use service role for DB update
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let orderStatus = 'Pending';
    let paymentStatus = 'pending';

    switch (status_code) {
      case '2':  // Success
        orderStatus = 'Confirmed';
        paymentStatus = 'paid';
        break;
      case '0':  // Pending
        orderStatus = 'Pending';
        paymentStatus = 'pending';
        break;
      case '-1': // Cancelled
        orderStatus = 'Cancelled';
        paymentStatus = 'cancelled';
        break;
      case '-2': // Failed
      case '-3': // Chargedback
        orderStatus = 'Cancelled';
        paymentStatus = 'failed';
        break;
    }

    await supabase
      .from('orders')
      .update({
        status:         orderStatus,
        payment_status: paymentStatus,
        payment_id:     payment_id,
        payment_method: 'PayHere',
        updated_at:     new Date().toISOString(),
      })
      .eq('id', order_id);

    console.log(`PayHere notify: Order ${order_id} → ${orderStatus}`);

    // If payment confirmed, send SMS alert (fire-and-forget)
    if (status_code === '2') {
      const { data: orderForSMS } = await supabase
        .from('orders')
        .select('*')
        .eq('id', order_id)
        .single();

      if (orderForSMS) {
        // Do NOT await — never block the PayHere response
        sendAdminSMS({
          orderId:           orderForSMS.id,
          customerName:      orderForSMS.customer_name,
          customerPhone:     orderForSMS.customer_phone,
          totalAmount:       orderForSMS.total,
          fulfillmentMethod: orderForSMS.fulfillment_method,
          paymentMethod:     'PayHere',
          deliveryDate:      orderForSMS.requested_delivery_date || null,
          deliveryTime:      orderForSMS.requested_delivery_time || null,
        }).catch(() => {}); // Extra safety
      }
    }

    // Always return OK to PayHere immediately (don't wait for SMS)
    return new NextResponse('OK', { status: 200 });

  } catch (error) {
    console.error('PayHere notify error:', error);
    return new NextResponse('Error', { status: 500 });
  }
}
