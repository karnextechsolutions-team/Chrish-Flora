import { NextRequest, NextResponse } from 'next/server';
import { sendAdminSMS } from '@/lib/sms';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();

    // Fire-and-forget - respond immediately, SMS sends in background
    sendAdminSMS({
      orderId:           data.orderId,
      customerName:      data.customerName,
      customerPhone:     data.customerPhone,
      totalAmount:       data.totalAmount,
      fulfillmentMethod: data.fulfillmentMethod,
      paymentMethod:     data.paymentMethod || 'Cash on Delivery',
      deliveryDate:      data.deliveryDate || null,
      deliveryTime:      data.deliveryTime || null,
    }).catch(() => {});

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false });
  }
}
