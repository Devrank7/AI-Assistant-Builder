'use client';

import { IClient } from '@/models/Client';

interface BillingTabProps {
  client: IClient;
  daysUntilPayment: number;
}

export default function BillingTab({ client, daysUntilPayment }: BillingTabProps) {
  return (
    <div className="space-y-6">
      {/* Subscription Status Card */}
      <div className="glass-card p-6">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
          <span>💳</span> Статус подписки
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-lg bg-white/5 p-4">
            <p className="mb-1 text-sm text-gray-400">Статус</p>
            <p
              className={`text-lg font-medium ${
                client.subscriptionStatus === 'active'
                  ? 'text-green-400'
                  : client.subscriptionStatus === 'trial'
                    ? 'text-cyan-400'
                    : client.subscriptionStatus === 'pending'
                      ? 'text-purple-400'
                      : client.subscriptionStatus === 'past_due'
                        ? 'text-yellow-400'
                        : 'text-red-400'
              }`}
            >
              {client.subscriptionStatus === 'active'
                ? '✅ Активна'
                : client.subscriptionStatus === 'trial'
                  ? '🎁 Триал'
                  : client.subscriptionStatus === 'pending'
                    ? '⏳ Ожидание активации'
                    : client.subscriptionStatus === 'past_due'
                      ? '⚠️ Просрочена'
                      : client.subscriptionStatus === 'suspended'
                        ? '🚫 Приостановлена'
                        : '❌ Отменена'}
            </p>
          </div>
          <div className="rounded-lg bg-white/5 p-4">
            <p className="mb-1 text-sm text-gray-400">Способ оплаты</p>
            <p className="text-lg font-medium text-white">
              {client.paymentMethod === 'cryptomus'
                ? '₿ Cryptomus'
                : client.paymentMethod === 'dodo'
                  ? '💳 Dodo Payments'
                  : client.paymentMethod === 'liqpay'
                    ? '💳 LiqPay'
                    : client.subscriptionStatus === 'pending'
                      ? '— Ожидание активации'
                      : '❓ Не привязан'}
            </p>
          </div>
          <div className="rounded-lg bg-white/5 p-4">
            <p className="mb-1 text-sm text-gray-400">Следующий платёж</p>
            <p className="text-lg font-medium text-white">
              {client.subscriptionStatus === 'pending'
                ? 'Не активирован'
                : client.nextPaymentDate
                  ? new Date(client.nextPaymentDate).toLocaleDateString('ru-RU', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })
                  : 'Триал период'}
            </p>
            {client.subscriptionStatus !== 'pending' && (
              <p className="mt-1 text-xs text-gray-500">
                {daysUntilPayment > 0 ? `Через ${daysUntilPayment} дней` : 'Сегодня'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Payment Setup - only show for trial/active/past_due, not for pending */}
      {!client.paymentMethod && client.subscriptionStatus !== 'pending' && (
        <div className="glass-card border border-yellow-500/30 p-6">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
            <span>⚠️</span> Требуется привязка оплаты
          </h3>
          <p className="mb-4 text-gray-400">
            Для продолжения работы виджета после триал-периода необходимо привязать способ оплаты. Ежемесячная подписка
            составляет <strong className="text-white">$50 USD</strong>.
          </p>
          <div className="flex gap-3">
            <button
              onClick={async () => {
                const res = await fetch('/api/payments/setup', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ clientId: client.clientId, provider: 'cryptomus' }),
                });
                const data = await res.json();
                if (data.success && data.paymentUrl) {
                  window.open(data.paymentUrl, '_blank');
                }
              }}
              className="neon-button"
            >
              ₿ Привязать Crypto
            </button>
            <button
              disabled
              className="cursor-not-allowed rounded-lg bg-white/10 px-4 py-2 text-gray-500"
              title="Coming soon"
            >
              💳 Карта (скоро)
            </button>
          </div>
        </div>
      )}

      {/* Payment History */}
      <div className="glass-card p-6">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
          <span>📜</span> История платежей
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/10">
                <th className="pb-3 text-sm text-gray-400">Дата</th>
                <th className="pb-3 text-sm text-gray-400">Сумма</th>
                <th className="pb-3 text-sm text-gray-400">Метод</th>
                <th className="pb-3 text-sm text-gray-400">Статус</th>
              </tr>
            </thead>
            <tbody>
              {client.lastPaymentDate ? (
                <tr className="border-b border-white/5">
                  <td className="py-3 text-white">{new Date(client.lastPaymentDate).toLocaleDateString('ru-RU')}</td>
                  <td className="py-3 text-white">$50.00</td>
                  <td className="py-3 text-gray-400">{client.paymentMethod || '—'}</td>
                  <td className="py-3">
                    <span className="text-green-400">✓ Успешно</span>
                  </td>
                </tr>
              ) : (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-500">
                    Платежей ещё не было
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manage Subscription */}
      {client.paymentMethod && (
        <div className="glass-card p-6">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
            <span>⚙️</span> Управление подпиской
          </h3>
          <button
            onClick={async () => {
              if (confirm('Вы уверены, что хотите отменить подписку? Виджет перестанет работать.')) {
                await fetch('/api/payments/cancel', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ clientId: client.clientId }),
                });
                window.location.reload();
              }
            }}
            className="rounded-lg bg-red-500/10 px-4 py-2 text-red-400 transition-colors hover:bg-red-500/20"
          >
            Отменить подписку
          </button>
        </div>
      )}
    </div>
  );
}
