/**
 * Format phone numbers for WhatsApp API compatibility.
 * Removes spaces, dashes, brackets, plus signs, and prepends Sri Lankan country code if needed.
 */
export const formatPhoneForWhatsApp = (phone: string): string => {
  // Remove all non-numeric characters
  let cleaned = phone.replace(/\D/g, '');
  
  // Handle Sri Lankan numbers
  if (cleaned.startsWith('0')) {
    cleaned = '94' + cleaned.slice(1);
  } else if (cleaned.startsWith('94')) {
    // already correct
  } else if (cleaned.length === 9) {
    // Missing leading 0: assume Sri Lanka
    cleaned = '94' + cleaned;
  }
  
  return cleaned;
};

/**
 * Generate a pre-formatted markdown receipt message for WhatsApp.
 */
export const generateReceiptMessage = (receiptData: {
  orderId: string;
  customerName: string;
  items: Array<{ name: string; quantity: number; unitPrice: number }>;
  subtotal: number;
  deliveryCharge: number;
  grandTotal: number;
  fulfillment: string;
  paymentMethod: string;
  cashierName: string;
  dateTime: string;
}) => {
  const itemLines = receiptData.items
    .map(item => 
      `  • ${item.name} × ${item.quantity} — LKR ${(item.quantity * item.unitPrice).toLocaleString()}`
    )
    .join('\n');

  return `🌸 *Chrish Flora* 🌸
_Luxury Floral Boutique, Colombo_

━━━━━━━━━━━━━━━
📋 *RECEIPT*
━━━━━━━━━━━━━━━

*Order ID:* ${receiptData.orderId.slice(0, 8).toUpperCase()}
*Date:* ${receiptData.dateTime}
*Cashier:* ${receiptData.cashierName}

👤 *Customer:* ${receiptData.customerName}
📦 *Fulfillment:* ${receiptData.fulfillment}
💳 *Payment:* ${receiptData.paymentMethod}

━━━━━━━━━━━━━━━
🛍️ *ITEMS*
━━━━━━━━━━━━━━━
${itemLines}

━━━━━━━━━━━━━━━
💰 *SUMMARY*
━━━━━━━━━━━━━━━
Subtotal:        LKR ${receiptData.subtotal.toLocaleString()}
Delivery:         LKR ${receiptData.deliveryCharge.toLocaleString()}

*TOTAL:  LKR ${receiptData.grandTotal.toLocaleString()}*
━━━━━━━━━━━━━━━

✅ *Payment Received. Thank you!*

🌸 Thank you for choosing Chrish Flora!
📍 Colombo, Sri Lanka
🌐 chrishflora.com
━━━━━━━━━━━━━━━`;
};

/**
 * Direct sharing handler to open WhatsApp on mobile or web depending on device.
 */
export const shareOnWhatsApp = (phone: string, message: string) => {
  const formattedPhone = formatPhoneForWhatsApp(phone);
  const encodedMessage = encodeURIComponent(message);
  
  // Detect if mobile device
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  
  let url: string;
  
  if (isMobile) {
    // Try native WhatsApp app first
    url = `whatsapp://send?phone=${formattedPhone}&text=${encodedMessage}`;
  } else {
    // WhatsApp Web for desktop
    url = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
  }
  
  window.open(url, '_blank');
};
