/**
 * WayForPay Checkout Redirect Page
 *
 * GET /api/payments/wayforpay/checkout?ref=ORDER_REF
 *
 * Generates an auto-submitting HTML form that redirects to WayForPay payment page.
 * This intermediate step is needed because WayForPay requires a form POST (not a simple URL).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPaymentService } from '@/lib/PaymentService';
import { WayForPayProvider } from '@/lib/paymentProviders/wayforpay';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const orderReference = searchParams.get('ref');

  if (!orderReference) {
    return new NextResponse('Missing order reference', { status: 400 });
  }

  const paymentService = getPaymentService();
  const provider = paymentService.getProvider('wayforpay') as WayForPayProvider | undefined;

  if (!provider) {
    return new NextResponse('WayForPay not configured', { status: 503 });
  }

  const formData = provider.getCheckoutFormData(orderReference);

  if (!formData) {
    return new NextResponse('Order not found or expired. Please try again.', { status: 404 });
  }

  // Build form fields HTML
  const fields: string[] = [];

  // Simple string fields
  const simpleFields: Record<string, string | undefined> = {
    merchantAccount: formData.merchantAccount,
    merchantDomainName: formData.merchantDomainName,
    merchantTransactionSecureType: formData.merchantTransactionSecureType,
    merchantSignature: formData.merchantSignature,
    orderReference: formData.orderReference,
    orderDate: formData.orderDate,
    amount: formData.amount,
    currency: formData.currency,
    serviceUrl: formData.serviceUrl,
    returnUrl: formData.returnUrl,
    language: formData.language,
  };

  // Optional fields
  if (formData.clientEmail) simpleFields.clientEmail = formData.clientEmail;
  if (formData.regularMode) simpleFields.regularMode = formData.regularMode;
  if (formData.regularAmount) simpleFields.regularAmount = formData.regularAmount;
  if (formData.regularBehavior) simpleFields.regularBehavior = formData.regularBehavior;
  if (formData.dateNext) simpleFields.dateNext = formData.dateNext;
  if (formData.dateEnd) simpleFields.dateEnd = formData.dateEnd;

  for (const [name, value] of Object.entries(simpleFields)) {
    if (value !== undefined) {
      const escaped = value.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      fields.push(`<input type="hidden" name="${name}" value="${escaped}" />`);
    }
  }

  // Array fields (productName[], productCount[], productPrice[])
  for (const val of formData.productName) {
    const escaped = val.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    fields.push(`<input type="hidden" name="productName[]" value="${escaped}" />`);
  }
  for (const val of formData.productCount) {
    fields.push(`<input type="hidden" name="productCount[]" value="${val}" />`);
  }
  for (const val of formData.productPrice) {
    fields.push(`<input type="hidden" name="productPrice[]" value="${val}" />`);
  }

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Redirecting to payment...</title>
  <style>
    body {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      font-family: Arial, sans-serif;
      color: #fff;
    }
    .loader {
      text-align: center;
    }
    .spinner {
      width: 48px;
      height: 48px;
      border: 4px solid rgba(255,255,255,0.2);
      border-top: 4px solid #00d9ff;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 20px;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div class="loader">
    <div class="spinner"></div>
    <p>Redirecting to payment page...</p>
    <p style="font-size: 14px; color: rgba(255,255,255,0.6);">Please wait</p>
  </div>
  <form id="wayforpay-form" method="POST" action="https://secure.wayforpay.com/pay" style="display:none;">
    ${fields.join('\n    ')}
  </form>
  <script>
    document.getElementById('wayforpay-form').submit();
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
