/**
 * Products API (In-Chat Commerce)
 *
 * GET /api/products?clientId=xxx - List products
 * POST /api/products - Create product
 * PATCH /api/products - Update product
 * DELETE /api/products - Delete product
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Product from '@/models/Product';
import { verifyAdminOrClient } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdminOrClient(request);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const category = searchParams.get('category');
    const activeOnly = searchParams.get('active') !== 'false';

    if (!clientId) {
      return NextResponse.json({ success: false, error: 'clientId is required' }, { status: 400 });
    }

    const filter: Record<string, unknown> = { clientId };
    if (activeOnly) filter.isActive = true;
    if (category) filter.category = category;

    const products = await Product.find(filter).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ success: true, products, total: products.length });
  } catch (error) {
    console.error('Products GET error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdminOrClient(request);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const body = await request.json();
    const { clientId, name, description, price, currency, imageUrl, category, sku, stripeProductId, stripePriceId } =
      body;

    if (!clientId || !name || price === undefined) {
      return NextResponse.json({ success: false, error: 'clientId, name, and price are required' }, { status: 400 });
    }

    const product = await Product.create({
      clientId,
      name,
      description,
      price,
      currency,
      imageUrl,
      category,
      sku,
      stripeProductId,
      stripePriceId,
    });

    return NextResponse.json({ success: true, product });
  } catch (error) {
    console.error('Products POST error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await verifyAdminOrClient(request);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Product id is required' }, { status: 400 });
    }

    // Enforce ownership: non-admin clients may only update their own products
    const ownershipFilter: Record<string, unknown> = { _id: id };
    if (auth.role === 'client') {
      ownershipFilter.clientId = auth.clientId;
    }

    const product = await Product.findOneAndUpdate(ownershipFilter, { $set: updates }, { new: true }).lean();
    if (!product) {
      return NextResponse.json({ success: false, error: 'Product not found or access denied' }, { status: 404 });
    }
    return NextResponse.json({ success: true, product });
  } catch (error) {
    console.error('Products PATCH error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await verifyAdminOrClient(request);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Product id is required' }, { status: 400 });
    }

    // Enforce ownership: non-admin clients may only delete their own products
    const ownershipFilter: Record<string, unknown> = { _id: id };
    if (auth.role === 'client') {
      ownershipFilter.clientId = auth.clientId;
    }

    const deleted = await Product.findOneAndDelete(ownershipFilter);
    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Product not found or access denied' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Products DELETE error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
