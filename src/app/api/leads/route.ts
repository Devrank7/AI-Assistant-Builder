import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import mongoose from 'mongoose';
import { appendToSheet } from '@/lib/googleSheets';

// Lead Schema
const LeadSchema = new mongoose.Schema({
  clientId: { type: String, required: true, index: true },
  sessionId: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String },
  phone: { type: String },
  carBrand: { type: String },
  carModel: { type: String },
  carYear: { type: Number },
  serviceType: { type: String },
  preferredDate: { type: String },
  preferredTime: { type: String },
  message: { type: String },
  page: { type: String },
  source: { type: String, default: 'widget' },
  exportedToSheets: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

const Lead = mongoose.models.Lead || mongoose.model('Lead', LeadSchema);

// Google Sheets config per client (can be stored in DB or config)
const SHEETS_CONFIG: Record<string, { spreadsheetId: string; sheetName: string }> = {
  aguy_client: {
    spreadsheetId: process.env.AGUY_SHEETS_ID || '',
    sheetName: 'Leads',
  },
};

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const {
      clientId,
      sessionId,
      name,
      email,
      phone,
      carBrand,
      carModel,
      carYear,
      serviceType,
      preferredDate,
      preferredTime,
      message,
      page,
    } = body;

    if (!clientId || !name) {
      return NextResponse.json({ success: false, error: 'clientId and name are required' }, { status: 400 });
    }

    // Save to MongoDB
    const lead = await Lead.create({
      clientId,
      sessionId: sessionId || `session_${Date.now()}`,
      name,
      email,
      phone,
      carBrand,
      carModel,
      carYear,
      serviceType,
      preferredDate,
      preferredTime,
      message,
      page,
      source: 'widget',
      createdAt: new Date(),
    });

    console.log(`📇 New lead created for client ${clientId}: ${name} (${email || phone})`);

    // Export to Google Sheets if configured
    const sheetsConfig = SHEETS_CONFIG[clientId];
    if (sheetsConfig?.spreadsheetId) {
      try {
        const result = await appendToSheet(sheetsConfig.spreadsheetId, sheetsConfig.sheetName, [
          {
            Timestamp: new Date().toISOString(),
            Name: name,
            Email: email || '',
            Phone: phone || '',
            'Car Brand': carBrand || '',
            'Car Model': carModel || '',
            'Car Year': carYear || '',
            'Service Type': serviceType || '',
            'Preferred Date': preferredDate || '',
            'Preferred Time': preferredTime || '',
            Message: message || '',
            Page: page || '',
            SessionId: sessionId || '',
          },
        ]);

        if (result.success) {
          await Lead.updateOne({ _id: lead._id }, { exportedToSheets: true });
          console.log(`📊 Lead exported to Google Sheets for client ${clientId}`);
        } else {
          console.warn(`⚠️ Failed to export lead to Sheets: ${result.error}`);
        }
      } catch (sheetsError) {
        console.error('Google Sheets export error:', sheetsError);
        // Don't fail the request if Sheets export fails
      }
    }

    return NextResponse.json({
      success: true,
      leadId: lead._id.toString(),
      message: 'Lead saved successfully',
    });
  } catch (error) {
    console.error('Error saving lead:', error);
    return NextResponse.json({ success: false, error: 'Failed to save lead' }, { status: 500 });
  }
}

// GET - Retrieve leads for a client (admin)
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');

    if (!clientId) {
      return NextResponse.json({ success: false, error: 'clientId is required' }, { status: 400 });
    }

    const leads = await Lead.find({ clientId }).sort({ createdAt: -1 }).limit(100).lean();

    return NextResponse.json({
      success: true,
      leads,
      total: leads.length,
    });
  } catch (error) {
    console.error('Error fetching leads:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch leads' }, { status: 500 });
  }
}
