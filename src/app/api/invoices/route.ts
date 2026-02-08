import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Invoice, { generateInvoiceNumber } from '@/models/Invoice';
import Client from '@/models/Client';
import { generateInvoiceHTML } from '@/lib/invoiceGenerator';
import { SUBSCRIPTION_AMOUNT } from '@/lib/paymentProviders/types';

/**
 * GET /api/invoices?clientId=xxx
 * Get list of invoices for a client
 *
 * GET /api/invoices?clientId=xxx&id=invoiceId&format=html
 * Get single invoice as HTML (for PDF generation via browser print)
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const invoiceId = searchParams.get('id');
    const format = searchParams.get('format');

    if (!clientId) {
      return NextResponse.json({ success: false, error: 'clientId is required' }, { status: 400 });
    }

    // Single invoice in HTML format
    if (invoiceId && format === 'html') {
      const invoice = await Invoice.findOne({ _id: invoiceId, clientId });
      if (!invoice) {
        return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 });
      }

      const client = await Client.findOne({ clientId }).select('username email website phone addresses');
      if (!client) {
        return NextResponse.json({ success: false, error: 'Client not found' }, { status: 404 });
      }

      const html = generateInvoiceHTML({
        invoice,
        client: {
          username: client.username,
          email: client.email,
          website: client.website,
          phone: client.phone,
          addresses: client.addresses,
        },
        company: {
          name: 'WinBix AI',
          email: process.env.SMTP_FROM || 'billing@winbix.ai',
          website: process.env.NEXT_PUBLIC_BASE_URL || 'https://winbix.ai',
        },
      });

      return new NextResponse(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // List invoices
    const invoices = await Invoice.find({ clientId }).sort({ createdAt: -1 }).lean();

    return NextResponse.json({ success: true, invoices });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch invoices' }, { status: 500 });
  }
}

/**
 * POST /api/invoices
 * Create a new invoice (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const { clientId, periodStart, periodEnd, description } = await request.json();

    if (!clientId || !periodStart || !periodEnd) {
      return NextResponse.json(
        { success: false, error: 'clientId, periodStart, and periodEnd are required' },
        { status: 400 }
      );
    }

    const client = await Client.findOne({ clientId });
    if (!client) {
      return NextResponse.json({ success: false, error: 'Client not found' }, { status: 404 });
    }

    const invoiceNumber = await generateInvoiceNumber();

    const invoice = await Invoice.create({
      clientId,
      invoiceNumber,
      amount: SUBSCRIPTION_AMOUNT,
      currency: 'USD',
      status: 'pending',
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      description: description || 'WinBix AI Subscription',
      metadata: {
        tokensUsed: client.monthlyTokensInput + client.monthlyTokensOutput,
        requestsCount: client.requests,
        costBreakdown: {
          apiCost: client.monthlyCostUsd || 0,
          subscriptionFee: SUBSCRIPTION_AMOUNT,
        },
      },
    });

    return NextResponse.json({ success: true, invoice }, { status: 201 });
  } catch (error) {
    console.error('Error creating invoice:', error);
    return NextResponse.json({ success: false, error: 'Failed to create invoice' }, { status: 500 });
  }
}
