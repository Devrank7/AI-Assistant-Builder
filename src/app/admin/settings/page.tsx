'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface PricingConfig {
  baseMonthlyPrice: number;
  annualDiscount: number;
  costWarningThreshold: number;
  costBlockThreshold: number;
}

export default function AdminSettingsPage() {
  const [config, setConfig] = useState<PricingConfig>({
    baseMonthlyPrice: 65,
    annualDiscount: 0.15,
    costWarningThreshold: 20,
    costBlockThreshold: 40,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/admin/settings');
      const data = await res.json();
      if (data.success) {
        setConfig(data.config);
      }
    } catch (err) {
      console.error('Error fetching config:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await res.json();

      if (data.success) {
        setConfig(data.config);
        setMessage({ type: 'success', text: 'Настройки сохранены' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Ошибка сохранения' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Ошибка соединения' });
    } finally {
      setSaving(false);
    }
  };

  const calculateTierPreview = useCallback(
    (months: number) => {
      if (months >= 12) {
        const total = Math.round(config.baseMonthlyPrice * 12 * (1 - config.annualDiscount) * 100) / 100;
        const perMonth = Math.round((total / 12) * 100) / 100;
        return { total, perMonth, discount: config.annualDiscount };
      }
      return {
        total: config.baseMonthlyPrice * months,
        perMonth: config.baseMonthlyPrice,
        discount: 0,
      };
    },
    [config.baseMonthlyPrice, config.annualDiscount]
  );

  if (loading) {
    return (
      <div className="bg-gradient-animated flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="bg-gradient-animated relative min-h-screen">
      <div className="aurora" />
      <div className="bg-grid pointer-events-none fixed inset-0 z-0 opacity-20" />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#050507]/70 backdrop-blur-xl">
        <div className="mx-auto max-w-4xl px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-gray-400 transition-colors hover:text-white">
              &larr; Dashboard
            </Link>
            <div>
              <h1 className="gradient-text text-lg font-bold">Settings</h1>
              <p className="text-[11px] tracking-wide text-gray-500 uppercase">Pricing & Cost Limits</p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-4xl px-6 py-10">
        {/* Pricing Section */}
        <div className="glass-card mb-8 p-6">
          <h2 className="mb-6 flex items-center gap-2 text-lg font-semibold text-white">
            <span>💰</span> Pricing
          </h2>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm text-gray-400">Monthly Price (USD)</label>
              <div className="relative">
                <span className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  value={config.baseMonthlyPrice}
                  onChange={(e) => setConfig({ ...config, baseMonthlyPrice: Number(e.target.value) })}
                  min={1}
                  max={10000}
                  step={1}
                  className="w-full rounded-lg border border-white/10 bg-white/5 py-3 pr-4 pl-8 text-white focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm text-gray-400">Annual Discount (%)</label>
              <div className="relative">
                <input
                  type="number"
                  value={Math.round(config.annualDiscount * 100)}
                  onChange={(e) => setConfig({ ...config, annualDiscount: Number(e.target.value) / 100 })}
                  min={0}
                  max={99}
                  step={1}
                  className="w-full rounded-lg border border-white/10 bg-white/5 py-3 pr-8 pl-4 text-white focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 focus:outline-none"
                />
                <span className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-500">%</span>
              </div>
            </div>
          </div>

          {/* Tier Preview */}
          <div className="mt-6 rounded-lg bg-white/5 p-4">
            <p className="mb-3 text-sm font-medium text-gray-400">Tier Preview</p>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                { months: 1, label: '1 Month' },
                { months: 3, label: '3 Months' },
                { months: 6, label: '6 Months' },
                { months: 12, label: '12 Months' },
              ].map(({ months, label }) => {
                const preview = calculateTierPreview(months);
                return (
                  <div key={months} className="rounded-lg bg-white/5 p-3 text-center">
                    <p className="mb-1 text-xs text-gray-500">{label}</p>
                    <p className="text-lg font-bold text-white">${preview.total}</p>
                    <p className="text-xs text-gray-500">${preview.perMonth}/mo</p>
                    {preview.discount > 0 && (
                      <p className="mt-1 text-xs text-green-400">-{Math.round(preview.discount * 100)}%</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Cost Limits Section */}
        <div className="glass-card mb-8 p-6">
          <h2 className="mb-6 flex items-center gap-2 text-lg font-semibold text-white">
            <span>🛡️</span> Cost Limits (per client/month)
          </h2>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm text-gray-400">Warning Threshold (USD)</label>
              <p className="mb-2 text-xs text-gray-600">Client gets notified when API cost exceeds this amount</p>
              <div className="relative">
                <span className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  value={config.costWarningThreshold}
                  onChange={(e) => setConfig({ ...config, costWarningThreshold: Number(e.target.value) })}
                  min={1}
                  max={10000}
                  step={1}
                  className="w-full rounded-lg border border-white/10 bg-white/5 py-3 pr-4 pl-8 text-white focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm text-gray-400">Block Threshold (USD)</label>
              <p className="mb-2 text-xs text-gray-600">Widget is disabled when API cost exceeds this amount</p>
              <div className="relative">
                <span className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  value={config.costBlockThreshold}
                  onChange={(e) => setConfig({ ...config, costBlockThreshold: Number(e.target.value) })}
                  min={1}
                  max={10000}
                  step={1}
                  className="w-full rounded-lg border border-white/10 bg-white/5 py-3 pr-4 pl-8 text-white focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {config.costWarningThreshold >= config.costBlockThreshold && (
            <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
              <p className="text-sm text-red-400">Warning threshold must be less than block threshold</p>
            </div>
          )}
        </div>

        {/* Save */}
        {message && (
          <div
            className={`mb-4 rounded-lg p-4 ${
              message.type === 'success'
                ? 'border border-green-500/30 bg-green-500/10 text-green-400'
                : 'border border-red-500/30 bg-red-500/10 text-red-400'
            }`}
          >
            {message.text}
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving || config.costWarningThreshold >= config.costBlockThreshold}
          className={`w-full rounded-xl py-4 text-lg font-semibold transition-all ${
            saving || config.costWarningThreshold >= config.costBlockThreshold
              ? 'cursor-not-allowed bg-gray-600 text-gray-400'
              : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50'
          }`}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
