import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const { orderId, amount, currency = 'LKR' } = await req.json();

    const merchantId = process.env.NEXT_PUBLIC_PAYHERE_MERCHANT_ID!;
    const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET!;

    if (!merchantId || !merchantSecret) {
      return NextResponse.json(
        { error: 'PayHere credentials not configured' },
        { status: 500 }
      );
    }

    const amountFormatted = parseFloat(amount).toFixed(2);

    // Hash merchant secret
    const hashedSecret = crypto
      .createHash('md5')
      .update(merchantSecret)
      .digest('hex')
      .toUpperCase();

    // Generate payment hash
    const hash = crypto
      .createHash('md5')
      .update(merchantId + orderId + amountFormatted + currency + hashedSecret)
      .digest('hex')
      .toUpperCase();

    return NextResponse.json({
      hash,
      merchantId,
      amountFormatted,
      isSandbox: process.env.NEXT_PUBLIC_PAYHERE_SANDBOX === 'true',
    });
  } catch (error) {
    console.error('Hash error:', error);
    return NextResponse.json({ error: 'Hash generation failed' }, { status: 500 });
  }
}
