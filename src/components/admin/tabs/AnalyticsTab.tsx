'use client';

import { useState } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

// --- Types ---

interface AnalyticsData {
  totalChats: number;
  totalMessages: number;
  avgMessagesPerChat: number;
  avgResponseTimeMs: number;
  satisfactionPercent: number;
  feedbackCount: number;
  dailyStats: Array<{
    date: string;
    totalChats: number;
    totalMessages: number;
    avgResponseTimeMs: number;
  }>;
  hourlyDistribution: Array<{ hour: number; count: number }>;
  topQuestions: Array<{ text: string; count: number }>;
  channelStats: Array<{ channel: string; count: number; percentage: number }>;
}

interface AnalyticsTabProps {
  analyticsLoading: boolean;
  analyticsData: AnalyticsData | null;
  fetchAnalytics: () => void;
  spreadsheetId: string;
  setSpreadsheetId: (val: string) => void;
  exportToSheets: () => void;
  sheetsExporting: boolean;
  exportMessage: string | null;
}

// --- Color palette ---

const COLORS = {
  cyan: '#00d9ff',
  purple: '#a855f7',
  green: '#22c55e',
  amber: '#f59e0b',
  pink: '#ec4899',
};

const PIE_COLORS = [COLORS.cyan, COLORS.purple, COLORS.green, COLORS.amber, COLORS.pink];

// --- Channel name mapping ---

const CHANNEL_LABELS: Record<string, string> = {
  website: 'Сайт',
  telegram: 'Telegram',
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
};

// --- Custom Recharts tooltip ---

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-[#0a0a12]/90 px-4 py-3 shadow-xl backdrop-blur-md">
      <p className="mb-1 text-xs text-gray-400">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-sm font-medium" style={{ color: entry.color }}>
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
}

// --- Stat card ---

function StatCard({
  value,
  label,
  sub,
  color,
}: {
  value: string | number;
  label: string;
  sub?: string;
  color: string;
}) {
  return (
    <div className="glass-card stat-card p-6 text-center">
      <p className="text-4xl font-bold" style={{ color }}>
        {value}
      </p>
      <p className="mt-2 text-sm text-gray-400">{label}</p>
      {sub && <p className="mt-1 text-xs text-gray-500">{sub}</p>}
    </div>
  );
}

// --- Main component ---

export default function AnalyticsTab({
  analyticsLoading,
  analyticsData,
  fetchAnalytics,
  spreadsheetId,
  setSpreadsheetId,
  exportToSheets,
  sheetsExporting,
  exportMessage,
}: AnalyticsTabProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d'>('30d');

  // Loading state
  if (analyticsLoading) {
    return (
      <div className="glass-card p-12 text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-[var(--neon-cyan)] border-t-transparent" />
        <p className="text-gray-400">Загрузка аналитики...</p>
      </div>
    );
  }

  // Empty state
  if (!analyticsData) {
    return (
      <div className="glass-card p-12 text-center">
        <p className="text-gray-400">Нет данных для отображения</p>
        <button onClick={fetchAnalytics} className="neon-button mt-4">
          Обновить
        </button>
      </div>
    );
  }

  // Format response time: milliseconds to seconds with 1 decimal
  const avgResponseTimeSec =
    typeof analyticsData.avgResponseTimeMs === 'number' ? (analyticsData.avgResponseTimeMs / 1000).toFixed(1) : '—';

  const satisfactionDisplay =
    typeof analyticsData.satisfactionPercent === 'number' ? `${analyticsData.satisfactionPercent}%` : '—';

  const feedbackDisplay = typeof analyticsData.feedbackCount === 'number' ? analyticsData.feedbackCount : '—';

  // Prepare daily chart data — format dates for display
  const dailyChartData = (analyticsData.dailyStats || []).map((day) => {
    const d = new Date(day.date);
    const label = `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}`;
    return {
      date: label,
      chats: day.totalChats,
      messages: day.totalMessages,
    };
  });

  // Prepare hourly chart data — ensure all 24 hours
  const hourlyMap = new Map((analyticsData.hourlyDistribution || []).map((h) => [h.hour, h.count]));
  const hourlyChartData = Array.from({ length: 24 }, (_, i) => ({
    hour: `${i.toString().padStart(2, '0')}:00`,
    count: hourlyMap.get(i) || 0,
  }));

  // Channel data for pie chart
  const channelData = (analyticsData.channelStats || []).map((ch) => ({
    name: CHANNEL_LABELS[ch.channel] || ch.channel,
    value: ch.count,
    percentage: ch.percentage,
  }));

  // Period button handler
  const handlePeriodChange = (period: '7d' | '30d' | '90d') => {
    setSelectedPeriod(period);
    fetchAnalytics();
  };

  const periodLabel = selectedPeriod === '7d' ? '7 дней' : selectedPeriod === '30d' ? '30 дней' : '90 дней';

  return (
    <div className="space-y-6">
      {/* Period selector + Refresh */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {(['7d', '30d', '90d'] as const).map((period) => (
            <button
              key={period}
              onClick={() => handlePeriodChange(period)}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                selectedPeriod === period
                  ? 'border border-[var(--neon-cyan)]/40 bg-[var(--neon-cyan)]/10 text-[var(--neon-cyan)] shadow-[0_0_20px_rgba(0,217,255,0.1)]'
                  : 'border border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              {period === '7d' ? '7 дней' : period === '30d' ? '30 дней' : '90 дней'}
            </button>
          ))}
        </div>
        <button
          onClick={fetchAnalytics}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-400 transition-all hover:bg-white/10 hover:text-white"
        >
          Обновить
        </button>
      </div>

      {/* Stats Cards - 6 cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <StatCard value={analyticsData.totalChats} label="Всего чатов" sub={`за ${periodLabel}`} color={COLORS.cyan} />
        <StatCard
          value={analyticsData.totalMessages}
          label="Сообщений"
          sub={`за ${periodLabel}`}
          color={COLORS.purple}
        />
        <StatCard value={analyticsData.avgMessagesPerChat} label="Сообщ./чат" sub="в среднем" color={COLORS.green} />
        <StatCard value={`${avgResponseTimeSec}с`} label="Время ответа" sub="в среднем" color={COLORS.amber} />
        <StatCard value={satisfactionDisplay} label="Удовлетворённость" sub="оценка" color={COLORS.pink} />
        <StatCard value={feedbackDisplay} label="Отзывов" sub="получено" color={COLORS.cyan} />
      </div>

      {/* Daily Chats AreaChart */}
      <div className="glass-card p-6">
        <h3 className="mb-6 text-lg font-semibold text-white">Чаты по дням</h3>
        {dailyChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={dailyChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="gradientChats" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS.cyan} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={COLORS.cyan} stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="gradientMessages" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS.purple} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={COLORS.purple} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis
                dataKey="date"
                tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
                axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
                axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }} />
              <Area
                type="monotone"
                dataKey="chats"
                name="Чаты"
                stroke={COLORS.cyan}
                strokeWidth={2}
                fill="url(#gradientChats)"
                dot={false}
                activeDot={{ r: 5, fill: COLORS.cyan, stroke: '#0a0a12', strokeWidth: 2 }}
              />
              <Area
                type="monotone"
                dataKey="messages"
                name="Сообщения"
                stroke={COLORS.purple}
                strokeWidth={2}
                fill="url(#gradientMessages)"
                dot={false}
                activeDot={{ r: 5, fill: COLORS.purple, stroke: '#0a0a12', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <p className="py-8 text-center text-gray-500">Нет данных за выбранный период</p>
        )}
      </div>

      {/* Two-column layout: Hourly Distribution + Channel Breakdown */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Hourly Distribution BarChart */}
        <div className="glass-card p-6">
          <h3 className="mb-6 text-lg font-semibold text-white">Активность по часам</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={hourlyChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis
                dataKey="hour"
                tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
                axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                tickLine={false}
                interval={3}
              />
              <YAxis
                tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
                axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Чаты" radius={[4, 4, 0, 0]} maxBarSize={20}>
                {hourlyChartData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={index >= 9 && index <= 18 ? COLORS.cyan : COLORS.purple}
                    fillOpacity={0.75}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="mt-2 text-center text-xs text-gray-500">Дневные часы (09-18) выделены голубым</p>
        </div>

        {/* Channel Breakdown PieChart */}
        <div className="glass-card p-6">
          <h3 className="mb-6 text-lg font-semibold text-white">Каналы общения</h3>
          {channelData.length > 0 ? (
            <div className="flex flex-col items-center gap-4 sm:flex-row">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={channelData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                    nameKey="name"
                    stroke="none"
                  >
                    {channelData.map((_, index) => (
                      <Cell key={`pie-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} fillOpacity={0.85} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(10,10,18,0.9)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      backdropFilter: 'blur(12px)',
                    }}
                    itemStyle={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}
                    labelStyle={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}
                  />
                  <Legend
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                    wrapperStyle={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}
                    formatter={(value: string) => <span style={{ color: 'rgba(255,255,255,0.7)' }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-[240px] items-center justify-center">
              <p className="text-gray-500">Нет данных по каналам</p>
            </div>
          )}
        </div>
      </div>

      {/* Top Questions */}
      <div className="glass-card p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">Популярные вопросы</h3>
        {analyticsData.topQuestions && analyticsData.topQuestions.length > 0 ? (
          <div className="space-y-2">
            {analyticsData.topQuestions.map((q, i) => {
              const maxCount = Math.max(...analyticsData.topQuestions.map((x) => x.count), 1);
              const barWidth = (q.count / maxCount) * 100;
              return (
                <div key={i} className="group relative overflow-hidden rounded-lg bg-white/5 p-3">
                  {/* Background bar */}
                  <div
                    className="absolute inset-y-0 left-0 rounded-lg bg-gradient-to-r from-[var(--neon-cyan)]/10 to-transparent transition-all group-hover:from-[var(--neon-cyan)]/20"
                    style={{ width: `${barWidth}%` }}
                  />
                  <div className="relative flex items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--neon-cyan)]/10 text-xs font-bold text-[var(--neon-cyan)]">
                      {i + 1}
                    </span>
                    <p className="min-w-0 flex-1 truncate text-sm text-gray-300">{q.text}</p>
                    <span className="shrink-0 rounded-md bg-white/5 px-2 py-0.5 text-xs font-medium text-gray-400">
                      {q.count}x
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="py-4 text-center text-gray-500">Пока нет данных</p>
        )}
      </div>

      {/* Google Sheets Export */}
      <div className="glass-card p-6">
        <h3 className="mb-2 text-lg font-semibold text-white">Экспорт в Google Sheets</h3>
        <p className="mb-4 text-sm text-gray-400">
          Экспортируйте историю чатов в Google Таблицу для дальнейшего анализа.
        </p>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="ID таблицы Google Sheets"
            value={spreadsheetId}
            onChange={(e) => setSpreadsheetId(e.target.value)}
            className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-gray-500 transition-all focus:border-[var(--neon-cyan)] focus:ring-1 focus:ring-[var(--neon-cyan)]/30 focus:outline-none"
          />
          <button
            onClick={exportToSheets}
            disabled={sheetsExporting}
            className="neon-button whitespace-nowrap disabled:opacity-50"
          >
            {sheetsExporting ? 'Экспорт...' : 'Экспорт'}
          </button>
        </div>
        {exportMessage && (
          <p className={`mt-3 text-sm ${exportMessage.startsWith('\u2705') ? 'text-green-400' : 'text-yellow-400'}`}>
            {exportMessage}
          </p>
        )}
        <p className="mt-3 text-xs text-gray-500">
          Инструкция: Создайте таблицу &rarr; Скопируйте ID из URL (docs.google.com/spreadsheets/d/<b>ID</b>/edit)
        </p>
      </div>
    </div>
  );
}
