import mongoose, { Schema, Document, Model } from 'mongoose';

export type InvoiceStatus = 'pending' | 'paid' | 'overdue' | 'canceled';

export interface IInvoice extends Document {
  clientId: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  periodStart: Date;
  periodEnd: Date;
  paidAt: Date | null;
  description: string;
  metadata: {
    tokensUsed?: number;
    requestsCount?: number;
    modelUsed?: string;
    costBreakdown?: {
      apiCost: number;
      subscriptionFee: number;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceSchema = new Schema<IInvoice>(
  {
    clientId: {
      type: String,
      required: true,
      index: true,
    },
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      required: true,
      default: 'USD',
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'overdue', 'canceled'],
      default: 'pending',
    },
    periodStart: {
      type: Date,
      required: true,
    },
    periodEnd: {
      type: Date,
      required: true,
    },
    paidAt: {
      type: Date,
      default: null,
    },
    description: {
      type: String,
      default: 'AI Widget Subscription',
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

InvoiceSchema.index({ clientId: 1, periodStart: -1 });
InvoiceSchema.index({ status: 1 });

/**
 * Generate next invoice number: INV-YYYYMM-XXXX
 */
export async function generateInvoiceNumber(): Promise<string> {
  const now = new Date();
  const prefix = `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

  const InvoiceModel = mongoose.models.Invoice || mongoose.model<IInvoice>('Invoice', InvoiceSchema);
  const lastInvoice = await InvoiceModel.findOne({ invoiceNumber: { $regex: `^${prefix}` } }).sort({
    invoiceNumber: -1,
  });

  if (lastInvoice) {
    const lastNum = parseInt(lastInvoice.invoiceNumber.split('-')[2], 10);
    return `${prefix}-${String(lastNum + 1).padStart(4, '0')}`;
  }

  return `${prefix}-0001`;
}

const Invoice: Model<IInvoice> = mongoose.models.Invoice || mongoose.model<IInvoice>('Invoice', InvoiceSchema);

export default Invoice;
