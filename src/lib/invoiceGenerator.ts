/**
 * Invoice PDF Generator
 *
 * Generates HTML-based invoices that can be rendered as PDF
 * using the browser's print functionality or a server-side renderer.
 */

import { IInvoice } from '@/models/Invoice';

interface InvoiceData {
  invoice: IInvoice;
  client: {
    username: string;
    email: string;
    website: string;
    phone?: string;
    addresses?: string[];
  };
  company: {
    name: string;
    email: string;
    website: string;
    address?: string;
  };
}

/**
 * Generate HTML invoice (can be printed to PDF via browser)
 */
export function generateInvoiceHTML(data: InvoiceData): string {
  const { invoice, client, company } = data;

  const periodStart = new Date(invoice.periodStart).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const periodEnd = new Date(invoice.periodEnd).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const invoiceDate = new Date(invoice.createdAt).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const statusColors: Record<string, string> = {
    paid: '#10b981',
    pending: '#f59e0b',
    overdue: '#ef4444',
    canceled: '#6b7280',
  };

  const statusLabels: Record<string, string> = {
    paid: 'Оплачен',
    pending: 'Ожидает оплаты',
    overdue: 'Просрочен',
    canceled: 'Отменён',
  };

  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>Invoice ${invoice.invoiceNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #1a1a2e; padding: 40px; max-width: 800px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #e5e7eb; }
    .logo { font-size: 28px; font-weight: 800; background: linear-gradient(135deg, #06b6d4, #a855f7); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .invoice-badge { display: inline-block; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; color: #fff; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 32px; }
    .meta-section h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #9ca3af; margin-bottom: 8px; }
    .meta-section p { font-size: 14px; color: #374151; line-height: 1.6; }
    table { width: 100%; border-collapse: collapse; margin: 24px 0; }
    th { background: #f9fafb; text-align: left; padding: 12px 16px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; border-bottom: 1px solid #e5e7eb; }
    td { padding: 16px; border-bottom: 1px solid #f3f4f6; font-size: 14px; }
    .total-row { font-weight: 700; font-size: 18px; }
    .total-row td { border-top: 2px solid #1a1a2e; border-bottom: none; padding-top: 16px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 12px; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">AI Widget</div>
      <p style="color: #6b7280; font-size: 13px; margin-top: 4px;">${company.name}</p>
    </div>
    <div style="text-align: right;">
      <h1 style="font-size: 32px; font-weight: 300; color: #1a1a2e; margin-bottom: 8px;">INVOICE</h1>
      <p style="font-size: 16px; font-weight: 600;">${invoice.invoiceNumber}</p>
      <span class="invoice-badge" style="background: ${statusColors[invoice.status] || '#6b7280'};">
        ${statusLabels[invoice.status] || invoice.status}
      </span>
    </div>
  </div>

  <div class="meta">
    <div class="meta-section">
      <h3>От</h3>
      <p><strong>${company.name}</strong></p>
      <p>${company.email}</p>
      <p>${company.website}</p>
      ${company.address ? `<p>${company.address}</p>` : ''}
    </div>
    <div class="meta-section">
      <h3>Клиент</h3>
      <p><strong>${client.username}</strong></p>
      <p>${client.email}</p>
      <p>${client.website}</p>
      ${client.phone ? `<p>${client.phone}</p>` : ''}
    </div>
  </div>

  <div class="meta">
    <div class="meta-section">
      <h3>Дата выставления</h3>
      <p>${invoiceDate}</p>
    </div>
    <div class="meta-section">
      <h3>Период</h3>
      <p>${periodStart} — ${periodEnd}</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Описание</th>
        <th style="text-align: center;">Кол-во</th>
        <th style="text-align: right;">Сумма</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>
          <strong>AI Widget Subscription</strong>
          <br><span style="color: #6b7280; font-size: 12px;">${invoice.description}</span>
        </td>
        <td style="text-align: center;">1 мес.</td>
        <td style="text-align: right;">$${invoice.amount.toFixed(2)}</td>
      </tr>
      ${
        invoice.metadata?.costBreakdown
          ? `
      <tr>
        <td colspan="2" style="color: #6b7280; font-size: 12px;">
          В т.ч. API расходы: $${invoice.metadata.costBreakdown.apiCost.toFixed(2)}
          ${invoice.metadata.tokensUsed ? ` | Токенов: ${invoice.metadata.tokensUsed.toLocaleString('ru-RU')}` : ''}
          ${invoice.metadata.requestsCount ? ` | Запросов: ${invoice.metadata.requestsCount.toLocaleString('ru-RU')}` : ''}
        </td>
        <td></td>
      </tr>`
          : ''
      }
      <tr class="total-row">
        <td colspan="2"><strong>ИТОГО</strong></td>
        <td style="text-align: right;"><strong>$${invoice.amount.toFixed(2)}</strong></td>
      </tr>
    </tbody>
  </table>

  ${
    invoice.paidAt
      ? `
  <p style="text-align: center; color: #10b981; font-weight: 600; margin: 24px 0;">
    ✅ Оплачен ${new Date(invoice.paidAt).toLocaleDateString('ru-RU')}
  </p>`
      : ''
  }

  <div class="footer">
    <p>Спасибо за использование AI Widget!</p>
    <p style="margin-top: 4px;">${company.website} | ${company.email}</p>
  </div>
</body>
</html>`;
}
