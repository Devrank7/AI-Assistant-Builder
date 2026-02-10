'use client';

import { useState } from 'react';
import { IClient } from '@/models/Client';

interface BillingTabProps {
  client: IClient;
  daysUntilPayment: number;
  onClientUpdate?: () => void;
}

export default function BillingTab({ client, daysUntilPayment, onClientUpdate }: BillingTabProps) {
  const [extensionMonths, setExtensionMonths] = useState(1);
  const [extending, setExtending] = useState(false);
  const [extensionMessage, setExtensionMessage] = useState<string | null>(null);

  // Calculate what the new date will be after extension
  const getNewPaymentDate = (months: number): Date => {
    const now = new Date();
    const baseDate =
      client.nextPaymentDate && new Date(client.nextPaymentDate) > now ? new Date(client.nextPaymentDate) : now;
    const newDate = new Date(baseDate);
    newDate.setMonth(newDate.getMonth() + months);
    return newDate;
  };

  const handleExtend = async () => {
    if (!confirm(`Продлить подписку на ${extensionMonths} мес.?`)) return;

    setExtending(true);
    setExtensionMessage(null);

    try {
      const res = await fetch(`/api/admin/clients/${client.clientId}/extend-subscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ months: extensionMonths }),
      });
      const data = await res.json();

      if (data.success) {
        const newDate = new Date(data.client.nextPaymentDate).toLocaleDateString('ru-RU', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });
        setExtensionMessage(`Подписка продлена до ${newDate}`);
        onClientUpdate?.();
      } else {
        setExtensionMessage(`Ошибка: ${data.error}`);
      }
    } catch (err) {
      console.error('Extension error:', err);
      setExtensionMessage('Ошибка соединения');
    } finally {
      setExtending(false);
    }
  };

  const formatPaymentMethod = (method: string | null) => {
    switch (method) {
      case 'wayforpay':
        return '💳 WayForPay (Карта)';
      case 'nowpayments':
        return '🪙 NowPayments (Крипто)';
      case 'cryptomus':
        return '₿ Cryptomus';
      case 'dodo':
        return '💳 Dodo Payments';
      case 'liqpay':
        return '💳 LiqPay';
      default:
        return client.subscriptionStatus === 'pending' ? '— Ожидание активации' : '❓ Не привязан';
    }
  };

  const newPaymentDate = getNewPaymentDate(extensionMonths);

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
            <p className="text-lg font-medium text-white">{formatPaymentMethod(client.paymentMethod)}</p>
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
                try {
                  const res = await fetch('/api/payments/setup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ clientId: client.clientId, provider: 'nowpayments' }),
                  });
                  const data = await res.json();
                  if (data.success && data.paymentUrl) {
                    window.open(data.paymentUrl, '_blank');
                  } else {
                    console.error('Payment setup failed:', data.error);
                  }
                } catch (err) {
                  console.error('Payment setup error:', err);
                }
              }}
              className="neon-button"
            >
              🪙 Привязать Crypto
            </button>
            <button
              onClick={async () => {
                try {
                  const res = await fetch('/api/payments/setup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ clientId: client.clientId, provider: 'wayforpay' }),
                  });
                  const data = await res.json();
                  if (data.success && data.paymentUrl) {
                    window.open(data.paymentUrl, '_blank');
                  } else {
                    console.error('Payment setup failed:', data.error);
                  }
                } catch (err) {
                  console.error('Payment setup error:', err);
                }
              }}
              className="rounded-lg bg-white/10 px-4 py-2 text-white transition-colors hover:bg-white/20"
            >
              💳 Привязать Карту
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
                  <td className="py-3 text-white">${client.lastPrepaymentAmount || 50}.00</td>
                  <td className="py-3 text-gray-400">{formatPaymentMethod(client.paymentMethod)}</td>
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
                try {
                  const res = await fetch('/api/payments/cancel', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ clientId: client.clientId }),
                  });
                  const data = await res.json();
                  if (data.success) {
                    onClientUpdate?.();
                  } else {
                    console.error('Cancel failed:', data.error);
                  }
                } catch (err) {
                  console.error('Cancel subscription error:', err);
                }
              }
            }}
            className="rounded-lg bg-red-500/10 px-4 py-2 text-red-400 transition-colors hover:bg-red-500/20"
          >
            Отменить подписку
          </button>
        </div>
      )}

      {/* Admin: Extend Subscription */}
      <div className="glass-card border border-cyan-500/20 p-6">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
          <span>🎁</span> Продлить подписку (Админ)
        </h3>

        <div className="mb-4 rounded-lg bg-white/5 p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-400">Текущая дата следующего платежа</p>
              <p className="text-lg font-medium text-white">
                {client.nextPaymentDate
                  ? new Date(client.nextPaymentDate).toLocaleDateString('ru-RU', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })
                  : 'Не установлена'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400">После продления (+{extensionMonths} мес.)</p>
              <p className="text-lg font-medium text-cyan-400">
                {newPaymentDate.toLocaleDateString('ru-RU', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <p className="mb-2 text-sm text-gray-400">Количество месяцев</p>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 6, 12].map((m) => (
              <button
                key={m}
                onClick={() => setExtensionMonths(m)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                  extensionMonths === m
                    ? 'bg-cyan-500/20 text-cyan-400 ring-1 ring-cyan-500/50'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                {m} мес.
              </button>
            ))}
          </div>
        </div>

        {extensionMessage && (
          <div
            className={`mb-4 rounded-lg p-3 ${
              extensionMessage.startsWith('Ошибка')
                ? 'border border-red-500/30 bg-red-500/10 text-red-400'
                : 'border border-green-500/30 bg-green-500/10 text-green-400'
            }`}
          >
            {extensionMessage}
          </div>
        )}

        <button
          onClick={handleExtend}
          disabled={extending}
          className={`rounded-lg px-6 py-3 font-semibold transition-all ${
            extending
              ? 'cursor-not-allowed bg-gray-600 text-gray-400'
              : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40'
          }`}
        >
          {extending ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Продление...
            </span>
          ) : (
            `Продлить на ${extensionMonths} мес.`
          )}
        </button>
      </div>
    </div>
  );
}
