'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface TierConfig {
  id: string;
  months: number;
  pricePerMonth: number;
  totalPrice: number;
  discount: number;
  label: string;
  labelRu: string;
}

interface SubscriptionInfo {
  status: string;
  isActive: boolean;
  prepaidUntil: string | null;
  nextPaymentDate: string | null;
  isInTrial: boolean;
  trialEndsAt: string | null;
  daysUntilPayment: number | null;
  currentTier: string;
}

type PaymentMethodType = 'wayforpay' | 'nowpayments';

export default function BillingPage() {
  const [tiers, setTiers] = useState<TierConfig[]>([]);
  const [selectedTier, setSelectedTier] = useState<string>('monthly');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('wayforpay');
  const [availableProviders, setAvailableProviders] = useState<string[]>([]);
  const [baseMonthlyPrice, setBaseMonthlyPrice] = useState(65);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Get clientId from URL or session
  const clientId = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('clientId') : null;

  useEffect(() => {
    fetchData();
  }, [clientId]);

  const fetchData = async () => {
    try {
      // Fetch tiers
      const tiersRes = await fetch('/api/payments/tiers');
      const tiersData = await tiersRes.json();
      if (tiersData.success) {
        setTiers(tiersData.tiers);
        if (tiersData.pricing?.baseMonthlyPrice) {
          setBaseMonthlyPrice(tiersData.pricing.baseMonthlyPrice);
        }
        const providers: string[] = tiersData.availableProviders || [];
        setAvailableProviders(providers);
        // Auto-select first available provider
        if (providers.includes('wayforpay')) {
          setPaymentMethod('wayforpay');
        } else if (providers.includes('nowpayments')) {
          setPaymentMethod('nowpayments');
        }
      }

      // Fetch subscription status if clientId exists
      if (clientId) {
        const statusRes = await fetch(`/api/payments/setup?clientId=${clientId}`);
        const statusData = await statusRes.json();
        if (statusData.success) {
          setSubscription(statusData.subscription);
        }
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    if (!clientId) {
      setError('Client ID не указан');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const tier = tiers.find((t) => t.id === selectedTier);
      const months = tier?.months || 1;

      const res = await fetch('/api/payments/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          months,
          provider: paymentMethod,
        }),
      });

      const data = await res.json();

      if (data.success && data.paymentUrl) {
        // Redirect to payment page
        window.location.href = data.paymentUrl;
      } else if (data.success && data.message) {
        // Already subscribed
        setError(data.message);
      } else {
        setError(data.error || 'Ошибка создания платежа');
      }
    } catch (err) {
      console.error('Payment error:', err);
      setError('Ошибка соединения');
    } finally {
      setProcessing(false);
    }
  };

  const getSelectedTier = () => tiers.find((t) => t.id === selectedTier);
  const selectedTierData = getSelectedTier();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="h-12 w-12 animate-spin rounded-full border-t-2 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-4 py-12">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-12 text-center">
          <Link href="/cabinet" className="mb-4 inline-block text-cyan-400 hover:text-cyan-300">
            &larr; Назад в кабинет
          </Link>
          <h1 className="mb-4 text-4xl font-bold text-white">Выберите план подписки</h1>
          <p className="text-lg text-gray-400">Оплатите на несколько месяцев вперёд и получите скидку</p>
        </div>

        {/* Current Subscription Status */}
        {subscription && (
          <div className="mb-8 rounded-xl border border-gray-700 bg-gray-800/50 p-6 backdrop-blur">
            <h2 className="mb-4 text-xl font-semibold text-white">Текущий статус</h2>
            <div className="grid grid-cols-2 gap-4 text-center md:grid-cols-4">
              <div>
                <p className="text-sm text-gray-400">Статус</p>
                <p
                  className={`font-semibold ${
                    subscription.status === 'pending'
                      ? 'text-purple-400'
                      : subscription.isActive
                        ? 'text-green-400'
                        : 'text-red-400'
                  }`}
                >
                  {subscription.status === 'pending'
                    ? 'Ожидание активации'
                    : subscription.status === 'trial'
                      ? 'Trial'
                      : subscription.isActive
                        ? 'Активна'
                        : 'Неактивна'}
                </p>
              </div>
              {subscription.isInTrial && subscription.trialEndsAt && (
                <div>
                  <p className="text-sm text-gray-400">Trial до</p>
                  <p className="font-semibold text-white">
                    {new Date(subscription.trialEndsAt).toLocaleDateString('ru-RU')}
                  </p>
                </div>
              )}
              {subscription.nextPaymentDate && (
                <div>
                  <p className="text-sm text-gray-400">Следующий платёж</p>
                  <p className="font-semibold text-white">
                    {new Date(subscription.nextPaymentDate).toLocaleDateString('ru-RU')}
                  </p>
                </div>
              )}
              {subscription.daysUntilPayment !== null && (
                <div>
                  <p className="text-sm text-gray-400">Осталось дней</p>
                  <p className="font-semibold text-cyan-400">{subscription.daysUntilPayment}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Payment Method Selector — only show if more than one provider available */}
        {availableProviders.length > 1 && (
          <div className="mb-8">
            <h2 className="mb-4 text-center text-lg font-semibold text-white">Способ оплаты</h2>
            <div className="grid grid-cols-2 gap-4">
              {availableProviders.includes('wayforpay') && (
                <button
                  onClick={() => setPaymentMethod('wayforpay')}
                  className={`rounded-xl border-2 p-4 transition-all duration-300 ${
                    paymentMethod === 'wayforpay'
                      ? 'border-cyan-500 bg-cyan-500/10 shadow-lg shadow-cyan-500/20'
                      : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                  }`}
                >
                  <div className="text-center">
                    <p className="mb-1 text-2xl">💳</p>
                    <p className="font-semibold text-white">Картой</p>
                    <p className="text-xs text-gray-400">Visa / Mastercard</p>
                    <p className="mt-1 text-xs text-green-400">Автоплатёж</p>
                  </div>
                </button>
              )}

              {availableProviders.includes('nowpayments') && (
                <button
                  onClick={() => setPaymentMethod('nowpayments')}
                  className={`rounded-xl border-2 p-4 transition-all duration-300 ${
                    paymentMethod === 'nowpayments'
                      ? 'border-cyan-500 bg-cyan-500/10 shadow-lg shadow-cyan-500/20'
                      : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                  }`}
                >
                  <div className="text-center">
                    <p className="mb-1 text-2xl">🪙</p>
                    <p className="font-semibold text-white">Криптовалютой</p>
                    <p className="text-xs text-gray-400">BTC, ETH, USDT...</p>
                  </div>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Tier Selection */}
        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          {tiers.map((tier) => (
            <button
              key={tier.id}
              onClick={() => setSelectedTier(tier.id)}
              className={`relative rounded-xl border-2 p-6 transition-all duration-300 ${
                selectedTier === tier.id
                  ? 'border-cyan-500 bg-cyan-500/10 shadow-lg shadow-cyan-500/20'
                  : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
              }`}
            >
              {/* Recommended Badge */}
              {tier.id === 'annual' && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 px-3 py-1 text-xs font-bold whitespace-nowrap text-white">
                    ВЫГОДНО
                  </span>
                </div>
              )}

              <div className="text-center">
                <p className="mb-2 text-sm text-gray-400">{tier.labelRu}</p>
                <p className="mb-1 text-3xl font-bold text-white">${tier.totalPrice}</p>
                {tier.discount > 0 && (
                  <div className="mt-2">
                    <span className="text-sm font-semibold text-green-400">
                      Экономия ${Math.round(baseMonthlyPrice * 12 - tier.totalPrice)}
                    </span>
                    <br />
                    <span className="text-xs text-gray-500 line-through">${baseMonthlyPrice * tier.months}</span>
                  </div>
                )}
                <p className="mt-2 text-sm text-gray-500">${tier.pricePerMonth}/мес</p>
              </div>
            </button>
          ))}
        </div>

        {/* Summary & CTA */}
        <div className="rounded-xl border border-gray-600 bg-gradient-to-r from-gray-800/80 to-gray-700/80 p-8 backdrop-blur">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div>
              <h3 className="mb-2 text-xl font-semibold text-white">{selectedTierData?.labelRu || '1 месяц'}</h3>
              <p className="text-gray-400">
                {selectedTierData?.discount
                  ? `Вы экономите $${Math.round(baseMonthlyPrice * 12 - (selectedTierData?.totalPrice || 0))} (${Math.round(selectedTierData.discount * 100)}%)`
                  : 'Стандартная цена'}
              </p>
              {paymentMethod === 'wayforpay' && (
                <p className="mt-1 text-sm text-green-400">
                  После оплаты подписка продлевается автоматически (${baseMonthlyPrice}/мес)
                </p>
              )}
            </div>

            <div className="text-center md:text-right">
              <p className="mb-2 text-4xl font-bold text-white">${selectedTierData?.totalPrice || baseMonthlyPrice}</p>
              <p className="text-sm text-gray-400">
                {paymentMethod === 'wayforpay' ? '💳 Картой' : '🪙 Криптовалютой'}
              </p>
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
              <p className="text-red-400">{error}</p>
            </div>
          )}

          {/* Terms & Privacy Agreement */}
          <label className="mt-6 flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="mt-1 h-4 w-4 flex-shrink-0 cursor-pointer rounded border-gray-600 bg-gray-700 accent-cyan-500"
            />
            <span className="text-sm leading-relaxed text-gray-400">
              Я соглашаюсь с{' '}
              <Link
                href="/terms"
                target="_blank"
                className="text-cyan-400 underline underline-offset-2 hover:text-cyan-300"
              >
                Условиями использования
              </Link>{' '}
              и{' '}
              <Link
                href="/privacy"
                target="_blank"
                className="text-cyan-400 underline underline-offset-2 hover:text-cyan-300"
              >
                Политикой конфиденциальности
              </Link>
            </span>
          </label>

          <button
            onClick={handleSubscribe}
            disabled={processing || !clientId || !termsAccepted}
            className={`mt-4 w-full rounded-xl py-4 text-lg font-semibold transition-all duration-300 ${
              processing || !clientId || !termsAccepted
                ? 'cursor-not-allowed bg-gray-600 text-gray-400'
                : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/30 hover:from-cyan-400 hover:to-blue-500 hover:shadow-cyan-500/50'
            }`}
          >
            {processing ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-5 w-5 animate-spin rounded-full border-t-2 border-b-2 border-white"></span>
                Обработка...
              </span>
            ) : (
              `Оплатить $${selectedTierData?.totalPrice || baseMonthlyPrice}`
            )}
          </button>

          {!clientId && (
            <p className="mt-4 text-center text-sm text-yellow-400">
              Client ID не указан в URL. Добавьте ?clientId=your_id
            </p>
          )}
        </div>

        {/* FAQ */}
        <div className="mt-12 text-center text-sm text-gray-500">
          <p>
            {paymentMethod === 'wayforpay'
              ? 'Картой (Visa/Mastercard) через WayForPay'
              : 'Криптовалютой (BTC, ETH, USDT) через NowPayments'}
          </p>
          <p className="mt-2">
            Вопросы?{' '}
            <a href="mailto:winbix.ai@gmail.com" className="text-cyan-400 hover:underline">
              winbix.ai@gmail.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
