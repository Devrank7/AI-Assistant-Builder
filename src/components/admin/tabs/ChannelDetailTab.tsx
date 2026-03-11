'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

type DetectedChannel = 'instagram' | 'whatsapp' | 'telegram-bot';

interface ChannelDetailTabProps {
  clientId: string;
  channel: DetectedChannel;
  readOnly?: boolean;
}

interface ChannelConfig {
  clientId: string;
  channel: string;
  provider?: string;
  isActive: boolean;
  botPersonality?: {
    name?: string;
    tone?: string;
    greeting?: string;
    language?: string;
  };
  providerConfig?: Record<string, unknown>;
  [key: string]: unknown;
}

interface ScriptInfo {
  hasScript: boolean;
  code?: string;
  meta?: {
    version: string;
    description: string;
    provider?: string;
    createdAt?: string;
  };
  lastModified?: string;
}

interface ChatLogItem {
  _id: string;
  sessionId: string;
  messageCount: number;
  lastMessage?: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

interface AnalyticsData {
  totalChats: number;
  totalMessages: number;
  avgMessagesPerChat: number;
  avgResponseTimeMs: number;
  dailyStats: Array<{ date: string; totalChats: number; totalMessages: number }>;
  hourlyDistribution: Array<{ hour: number; count: number }>;
}

const COLORS = {
  cyan: '#3B82F6',
  purple: '#818CF8',
  green: '#22c55e',
  amber: '#f59e0b',
};

const CHANNEL_LABELS: Record<DetectedChannel, { name: string; icon: string }> = {
  instagram: { name: 'Instagram', icon: '📸' },
  whatsapp: { name: 'WhatsApp', icon: '💬' },
  'telegram-bot': { name: 'Telegram', icon: '📱' },
};

// Map folder names to metadata channel values
const CHANNEL_METADATA_MAP: Record<DetectedChannel, string> = {
  instagram: 'instagram',
  whatsapp: 'whatsapp',
  'telegram-bot': 'telegram',
};

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

function StatCard({ value, label, color }: { value: string | number; label: string; color: string }) {
  return (
    <div className="glass-card p-4 text-center">
      <p className="text-2xl font-bold" style={{ color }}>
        {value}
      </p>
      <p className="mt-1 text-xs text-gray-400">{label}</p>
    </div>
  );
}

export default function ChannelDetailTab({ clientId, channel, readOnly = false }: ChannelDetailTabProps) {
  const [config, setConfig] = useState<ChannelConfig | null>(null);
  const [scriptInfo, setScriptInfo] = useState<ScriptInfo | null>(null);
  const [showCode, setShowCode] = useState(false);
  const [chatLogs, setChatLogs] = useState<ChatLogItem[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const channelMeta = CHANNEL_LABELS[channel];
  const metadataChannel = CHANNEL_METADATA_MAP[channel];

  const jsonHeaders = { 'Content-Type': 'application/json' };

  // Load channel config from filesystem API
  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch(`/api/clients/${clientId}/channels`, {
        headers: jsonHeaders,
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) {
        const ch = data.channels?.find((c: { channel: string }) => c.channel === channel);
        if (ch?.fileConfig) {
          setConfig(ch.fileConfig as ChannelConfig);
        } else if (ch) {
          setConfig({
            clientId,
            channel,
            isActive: ch.isActive,
            provider: ch.provider,
          });
        }
      }
    } catch (err) {
      console.error('Failed to load channel config:', err);
    }
  }, [clientId, channel]);

  // Load script info
  const fetchScript = useCallback(async () => {
    try {
      const res = await fetch(`/api/clients/${clientId}/channels/script?channel=${channel}`, {
        headers: jsonHeaders,
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) {
        setScriptInfo(data as ScriptInfo);
      }
    } catch (err) {
      console.error('Failed to load script info:', err);
    }
  }, [clientId, channel]);

  // Load chat logs filtered by channel
  const fetchChatLogs = useCallback(async () => {
    try {
      const res = await fetch(`/api/chat-logs?clientId=${clientId}&channel=${metadataChannel}&limit=10`, {
        headers: jsonHeaders,
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) setChatLogs(data.logs || []);
    } catch (err) {
      console.error('Failed to load chat logs:', err);
    }
  }, [clientId, metadataChannel]);

  // Load analytics filtered by channel
  const fetchAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const res = await fetch(`/api/analytics?clientId=${clientId}&channel=${metadataChannel}&days=30`, {
        headers: jsonHeaders,
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) setAnalytics(data.analytics);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setAnalyticsLoading(false);
    }
  }, [clientId, metadataChannel]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchConfig(), fetchScript(), fetchChatLogs(), fetchAnalytics()]).finally(() => setLoading(false));
  }, [fetchConfig, fetchScript, fetchChatLogs, fetchAnalytics]);

  if (loading) {
    return (
      <div className="glass-card p-8 text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[var(--neon-cyan)] border-t-transparent" />
        <p className="mt-4 text-gray-400">Загрузка {channelMeta.name}...</p>
      </div>
    );
  }

  // Prepare chart data
  const dailyChartData = (analytics?.dailyStats || []).map((day) => {
    const d = new Date(day.date);
    const label = `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}`;
    return { date: label, chats: day.totalChats, messages: day.totalMessages };
  });

  const hourlyMap = new Map((analytics?.hourlyDistribution || []).map((h) => [h.hour, h.count]));
  const hourlyChartData = Array.from({ length: 24 }, (_, i) => ({
    hour: `${i.toString().padStart(2, '0')}:00`,
    count: hourlyMap.get(i) || 0,
  }));

  const avgResponseTimeSec = analytics?.avgResponseTimeMs ? (analytics.avgResponseTimeMs / 1000).toFixed(1) : '—';

  return (
    <div className="space-y-6">
      {/* Status Header */}
      <div className="glass-card flex items-center justify-between p-6">
        <div className="flex items-center gap-4">
          <span className="text-4xl">{channelMeta.icon}</span>
          <div>
            <h3 className="text-xl font-bold text-white">{channelMeta.name}</h3>
            <div className="mt-1 flex items-center gap-2">
              {config?.provider && (
                <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-gray-300">{config.provider}</span>
              )}
              <span
                className={`flex items-center gap-1.5 text-sm ${config?.isActive ? 'text-green-400' : 'text-gray-500'}`}
              >
                <span className={`h-2 w-2 rounded-full ${config?.isActive ? 'bg-green-400' : 'bg-gray-500'}`} />
                {config?.isActive ? 'Активен' : 'Неактивен'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bot Personality Config */}
      {config?.botPersonality && (
        <div className="glass-card p-6">
          <h4 className="mb-3 text-lg font-semibold text-white">Персонализация бота</h4>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {config.botPersonality.name && (
              <div>
                <p className="text-xs text-gray-500">Имя</p>
                <p className="text-sm text-white">{config.botPersonality.name}</p>
              </div>
            )}
            {config.botPersonality.tone && (
              <div>
                <p className="text-xs text-gray-500">Тон</p>
                <p className="text-sm text-white">{config.botPersonality.tone}</p>
              </div>
            )}
            {config.botPersonality.language && (
              <div>
                <p className="text-xs text-gray-500">Язык</p>
                <p className="text-sm text-white">{config.botPersonality.language}</p>
              </div>
            )}
            {config.botPersonality.greeting && (
              <div>
                <p className="text-xs text-gray-500">Приветствие</p>
                <p className="text-sm text-white">{config.botPersonality.greeting}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Script Panel */}
      <div className="glass-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h4 className="text-lg font-semibold text-white">Скрипт интеграций</h4>
          {scriptInfo?.hasScript ? (
            <span className="rounded-full bg-green-500/20 px-3 py-1 text-xs font-medium text-green-300">Активен</span>
          ) : (
            <span className="rounded-full bg-gray-500/20 px-3 py-1 text-xs font-medium text-gray-400">Нет скрипта</span>
          )}
        </div>

        {scriptInfo?.hasScript && scriptInfo.meta ? (
          <div className="space-y-4">
            {/* Script meta */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div>
                <p className="text-xs text-gray-500">Версия</p>
                <p className="text-sm text-white">{scriptInfo.meta.version}</p>
              </div>
              {scriptInfo.meta.provider && (
                <div>
                  <p className="text-xs text-gray-500">Провайдер</p>
                  <p className="text-sm text-white">{scriptInfo.meta.provider}</p>
                </div>
              )}
              {scriptInfo.meta.createdAt && (
                <div>
                  <p className="text-xs text-gray-500">Создан</p>
                  <p className="text-sm text-white">
                    {new Date(scriptInfo.meta.createdAt).toLocaleDateString('ru-RU')}
                  </p>
                </div>
              )}
              {scriptInfo.lastModified && (
                <div>
                  <p className="text-xs text-gray-500">Изменён</p>
                  <p className="text-sm text-white">{new Date(scriptInfo.lastModified).toLocaleDateString('ru-RU')}</p>
                </div>
              )}
            </div>

            {/* Description */}
            {scriptInfo.meta.description && <p className="text-sm text-gray-300">{scriptInfo.meta.description}</p>}

            {/* Code viewer toggle */}
            <div>
              <button
                onClick={() => setShowCode(!showCode)}
                className="flex items-center gap-2 text-sm text-[var(--neon-cyan)] hover:underline"
              >
                {showCode ? '▼ Скрыть код' : '▶ Показать код скрипта'}
              </button>
              {showCode && scriptInfo.code && (
                <pre className="mt-3 max-h-96 overflow-auto rounded-lg bg-black/40 p-4 text-xs leading-relaxed text-gray-300">
                  <code>{scriptInfo.code}</code>
                </pre>
              )}
            </div>
          </div>
        ) : (
          <p className="py-2 text-sm text-gray-500">
            Скрипт не создан. Используйте AI-агент для генерации скрипта интеграций.
          </p>
        )}
      </div>

      {/* Analytics Stats */}
      {analytics && (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard value={analytics.totalChats} label="Чатов" color={COLORS.cyan} />
            <StatCard value={analytics.totalMessages} label="Сообщений" color={COLORS.purple} />
            <StatCard value={analytics.avgMessagesPerChat} label="Сообщ./чат" color={COLORS.green} />
            <StatCard value={`${avgResponseTimeSec}с`} label="Время ответа" color={COLORS.amber} />
          </div>

          {/* Daily chart */}
          {dailyChartData.length > 0 && (
            <div className="glass-card p-6">
              <h4 className="mb-4 text-lg font-semibold text-white">Чаты по дням</h4>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={dailyChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id={`gradCh-${channel}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={COLORS.cyan} stopOpacity={0.4} />
                      <stop offset="100%" stopColor={COLORS.cyan} stopOpacity={0.02} />
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
                  <Area
                    type="monotone"
                    dataKey="chats"
                    name="Чаты"
                    stroke={COLORS.cyan}
                    strokeWidth={2}
                    fill={`url(#gradCh-${channel})`}
                    dot={false}
                    activeDot={{ r: 5, fill: COLORS.cyan, stroke: '#0a0a12', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Hourly distribution */}
          <div className="glass-card p-6">
            <h4 className="mb-4 text-lg font-semibold text-white">Активность по часам</h4>
            <ResponsiveContainer width="100%" height={200}>
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
                <Bar dataKey="count" name="Чаты" radius={[4, 4, 0, 0]} maxBarSize={16}>
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
          </div>
        </>
      )}

      {analyticsLoading && !analytics && (
        <div className="glass-card p-6 text-center">
          <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-[var(--neon-cyan)] border-t-transparent" />
          <p className="mt-2 text-sm text-gray-400">Загрузка аналитики...</p>
        </div>
      )}

      {/* Chat Logs */}
      <div className="glass-card p-6">
        <h4 className="mb-4 text-lg font-semibold text-white">Последние чаты</h4>
        {chatLogs.length > 0 ? (
          <div className="space-y-2">
            {chatLogs.map((log) => (
              <div key={log._id} className="flex items-center justify-between rounded-lg bg-white/5 p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-gray-300">{log.lastMessage || 'Нет сообщений'}</p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {new Date(log.createdAt).toLocaleString('ru-RU')} &middot; {log.messageCount} сообщ.
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-4 text-center text-sm text-gray-500">Нет чатов в этом канале</p>
        )}
      </div>

      {/* No config info */}
      {!config && (
        <div className="glass-card p-6 text-center">
          <p className="text-gray-400">
            Канал обнаружен, но конфигурация не найдена. Используйте скилл AI-агента для настройки.
          </p>
        </div>
      )}
    </div>
  );
}
