'use client';

import { useState, useEffect, useCallback } from 'react';

type ChannelType = 'telegram' | 'whatsapp' | 'instagram';
type ChannelProvider = 'meta' | 'whapi' | 'manychat';

interface Channel {
  _id: string;
  channel: ChannelType;
  provider?: ChannelProvider;
  isActive: boolean;
  config: Record<string, string | boolean | number>;
  connectedAt?: string;
  createdAt: string;
}

interface ChannelConfigDef {
  type: ChannelType;
  name: string;
  icon: string;
  description: string;
  providers?: Array<{
    id: ChannelProvider;
    name: string;
    description: string;
    fields: Array<{
      key: string;
      label: string;
      placeholder: string;
      type: 'text' | 'password';
    }>;
    instructions: string;
    extras?: Array<{
      key: string;
      label: string;
      type: 'toggle' | 'number';
      default: boolean | number;
      description: string;
    }>;
  }>;
  fields?: Array<{
    key: string;
    label: string;
    placeholder: string;
    type: 'text' | 'password';
  }>;
  instructions?: string;
}

const CHANNEL_CONFIGS: ChannelConfigDef[] = [
  {
    type: 'telegram',
    name: 'Telegram',
    icon: '📱',
    description: 'Подключите Telegram бота для общения с клиентами',
    fields: [],
    instructions:
      'Используйте существующего бота или создайте нового через @BotFather. После создания бота отправьте команду /start для привязки к виджету. Бот автоматически получит настройки из вашей базы знаний.',
  },
  {
    type: 'whatsapp',
    name: 'WhatsApp',
    icon: '💬',
    description: 'Подключите WhatsApp для общения с клиентами',
    providers: [
      {
        id: 'whapi',
        name: 'Whapi.cloud (Рекомендуется)',
        description: 'Работает с обычным WhatsApp аккаунтом. Человек + AI на одном номере.',
        fields: [
          {
            key: 'whapiToken',
            label: 'API Token',
            placeholder: 'Токен из панели Whapi.cloud',
            type: 'password',
          },
          {
            key: 'whapiChannelId',
            label: 'Channel ID',
            placeholder: 'ID канала из Whapi.cloud (например MANTIS-XXXXX)',
            type: 'text',
          },
        ],
        instructions:
          '1. Зарегистрируйтесь на whapi.cloud\n2. Создайте канал и привяжите WhatsApp (QR-код)\n3. Скопируйте API Token и Channel ID\n4. В настройках канала Whapi укажите Webhook URL:\nhttps://ваш-домен/api/webhooks/whapi\n5. Включите событие: messages.post',
        extras: [
          {
            key: 'humanTakeover',
            label: 'Режим совместной работы',
            type: 'toggle',
            default: true,
            description: 'AI замолкает когда человек отвечает вручную',
          },
          {
            key: 'humanTimeoutMinutes',
            label: 'Таймаут возврата AI (минуты)',
            type: 'number',
            default: 30,
            description: 'Через сколько минут AI снова начнёт отвечать после ручного ответа',
          },
        ],
      },
      {
        id: 'meta',
        name: 'Meta Business API',
        description: 'Официальный WhatsApp Business API через Meta. Требует верификации бизнеса.',
        fields: [
          {
            key: 'phoneNumberId',
            label: 'Phone Number ID',
            placeholder: 'ID номера телефона из Meta Business',
            type: 'text',
          },
          {
            key: 'apiKey',
            label: 'Access Token',
            placeholder: 'Токен доступа к WhatsApp API',
            type: 'password',
          },
        ],
        instructions:
          'Для подключения вам понадобится аккаунт Meta Business и настроенный WhatsApp Business API.\n1. Создайте приложение в Meta Developer Portal\n2. Добавьте продукт WhatsApp\n3. Получите Phone Number ID и Access Token\n4. Укажите Webhook URL:\nhttps://ваш-домен/api/webhooks/whatsapp',
      },
    ],
  },
  {
    type: 'instagram',
    name: 'Instagram',
    icon: '📸',
    description: 'Подключите Instagram Direct Messages',
    providers: [
      {
        id: 'manychat',
        name: 'ManyChat (Рекомендуется)',
        description: 'Без App Review. ManyChat выступает мостом к Instagram API.',
        fields: [],
        instructions:
          '1. Зарегистрируйтесь на manychat.com (бесплатный план)\n2. Подключите Instagram-аккаунт (Business или Creator) к ManyChat\n3. Создайте Flow → добавьте триггер "Default Reply"\n4. В Flow добавьте блок "External Request":\n   URL: https://ваш-домен/api/webhooks/manychat\n   Метод: POST\n   Body: subscriber_id, first_name, last_name, ig_id, last_input_text\n5. Подключите ответ из External Request к блоку "Send Message"\n\nManyChat уже прошёл App Review — вам не нужно проходить его самостоятельно.',
      },
      {
        id: 'meta',
        name: 'Meta Graph API (Direct)',
        description: 'Прямое подключение через Meta API. Требует App Review (1-4 недели).',
        fields: [
          {
            key: 'pageId',
            label: 'Page ID',
            placeholder: 'ID страницы Instagram',
            type: 'text' as const,
          },
          {
            key: 'apiKey',
            label: 'Access Token',
            placeholder: 'Токен доступа к Instagram API',
            type: 'password' as const,
          },
        ],
        instructions:
          'Подключите Instagram через Meta Business Suite.\n1. Создайте приложение в Meta Developer Portal\n2. Пройдите App Review для instagram_manage_messages\n3. Настройте Webhook URL:\nhttps://ваш-домен/api/webhooks/instagram',
      },
    ],
  },
];

interface HandoffItem {
  _id: string;
  sessionId: string;
  channel: string;
  status: 'pending' | 'active' | 'resolved';
  customerName?: string;
  customerContact?: string;
  lastCustomerMessage: string;
  assignedTo?: string;
  requestedAt: string;
  resolvedAt?: string;
}

interface HandoffStats {
  pending: number;
  active: number;
  resolved: number;
  total: number;
}

interface SkillChannel {
  channel: string;
  folderExists: boolean;
  isActive: boolean;
  provider?: string;
  hasScript?: boolean;
  scriptMeta?: { version: string; description: string; provider?: string };
}

interface ChannelsTabProps {
  clientId: string;
}

export default function ChannelsTab({ clientId }: ChannelsTabProps) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [skillChannels, setSkillChannels] = useState<SkillChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [connectingType, setConnectingType] = useState<ChannelType | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<ChannelProvider>('whapi');
  const [configForm, setConfigForm] = useState<Record<string, string | boolean | number>>({});

  // Handoff state
  const [handoffs, setHandoffs] = useState<HandoffItem[]>([]);
  const [handoffStats, setHandoffStats] = useState<HandoffStats | null>(null);
  const [handoffsLoading, setHandoffsLoading] = useState(false);

  const jsonHeaders = { 'Content-Type': 'application/json' };

  const fetchChannels = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/channels?clientId=${clientId}`, {
        headers: jsonHeaders,
      });
      if (!res.ok) throw new Error('Ошибка загрузки каналов');
      const data = await res.json();
      setChannels(data.channels || data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  const fetchSkillChannels = useCallback(async () => {
    try {
      const res = await fetch(`/api/clients/${clientId}/channels`, {
        headers: jsonHeaders,
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) {
        setSkillChannels((data.channels || []).filter((ch: SkillChannel) => ch.folderExists));
      }
    } catch {
      // Non-critical
    }
  }, [clientId]);

  const fetchHandoffs = useCallback(async () => {
    setHandoffsLoading(true);
    try {
      const res = await fetch(`/api/handoff?clientId=${clientId}`, {
        headers: jsonHeaders,
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) {
        setHandoffs(data.handoffs || []);
        setHandoffStats(data.stats || null);
      }
    } catch {
      // Handoff panel is supplementary, don't show error
    } finally {
      setHandoffsLoading(false);
    }
  }, [clientId]);

  const handleHandoffAction = async (handoffId: string, action: 'assign' | 'resolve') => {
    try {
      const res = await fetch('/api/handoff', {
        method: 'PATCH',
        headers: jsonHeaders,
        body: JSON.stringify({ handoffId, action, assignedTo: 'admin' }),
      });
      if (res.ok) {
        showMessage(action === 'resolve' ? 'Хэндофф завершён, бот возобновлён' : 'Хэндофф принят');
        await fetchHandoffs();
      }
    } catch {
      setError('Ошибка обновления хэндоффа');
    }
  };

  useEffect(() => {
    fetchChannels();
    fetchHandoffs();
    fetchSkillChannels();
  }, [fetchChannels, fetchHandoffs, fetchSkillChannels]);

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 3000);
  };

  const getChannelByType = (type: ChannelType): Channel | undefined => {
    return channels.find((ch) => ch.channel === type);
  };

  const openConnectForm = (type: ChannelType) => {
    setConnectingType(type);
    // Default provider: whapi for WhatsApp, manychat for Instagram
    setSelectedProvider(type === 'instagram' ? 'manychat' : 'whapi');
    // Set defaults for extras
    const cfg = CHANNEL_CONFIGS.find((c) => c.type === type);
    const defaults: Record<string, string | boolean | number> = {};
    if (cfg?.providers) {
      for (const prov of cfg.providers) {
        for (const extra of prov.extras || []) {
          defaults[extra.key] = extra.default;
        }
      }
    }
    setConfigForm(defaults);
  };

  const cancelConnect = () => {
    setConnectingType(null);
    setConfigForm({});
  };

  const connectChannel = async (channelDef: ChannelConfigDef) => {
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        clientId,
        channel: channelDef.type,
        config: configForm,
      };

      // Add provider for WhatsApp/Instagram
      if (channelDef.providers) {
        body.provider = selectedProvider;
      }

      const res = await fetch('/api/channels', {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Ошибка подключения канала');
      showMessage(`${channelDef.name} успешно подключён`);
      cancelConnect();
      await fetchChannels();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка подключения');
    } finally {
      setSaving(false);
    }
  };

  const toggleChannel = async (channel: Channel) => {
    try {
      const res = await fetch('/api/channels', {
        method: 'PATCH',
        headers: jsonHeaders,
        body: JSON.stringify({
          channelId: channel._id,
          isActive: !channel.isActive,
        }),
      });
      if (!res.ok) throw new Error('Ошибка обновления');
      setChannels((prev) => prev.map((ch) => (ch._id === channel._id ? { ...ch, isActive: !ch.isActive } : ch)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка обновления');
    }
  };

  const disconnectChannel = async (channel: Channel, channelName: string) => {
    if (!confirm(`Отключить ${channelName}? Все настройки канала будут удалены.`)) return;
    try {
      const res = await fetch(`/api/channels?channelId=${channel._id}`, {
        method: 'DELETE',
        headers: jsonHeaders,
      });
      if (!res.ok) throw new Error('Ошибка отключения');
      showMessage(`${channelName} отключён`);
      await fetchChannels();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка отключения');
    }
  };

  const getProviderLabel = (provider?: string) => {
    if (provider === 'whapi') return 'Whapi.cloud';
    if (provider === 'meta') return 'Meta Business API';
    if (provider === 'manychat') return 'ManyChat';
    return '';
  };

  if (loading) {
    return (
      <div className="glass-card p-8 text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[var(--neon-cyan)] border-t-transparent" />
        <p className="mt-4 text-gray-400">Загрузка каналов...</p>
      </div>
    );
  }

  // Check which fields are required for validation
  const getRequiredFields = (channelDef: ChannelConfigDef): string[] => {
    if (channelDef.providers) {
      const prov = channelDef.providers.find((p) => p.id === selectedProvider);
      return prov?.fields.map((f) => f.key) || [];
    }
    return channelDef.fields?.map((f) => f.key) || [];
  };

  const isFormValid = (channelDef: ChannelConfigDef): boolean => {
    const required = getRequiredFields(channelDef);
    if (required.length === 0) return true;
    return required.every((key) => {
      const val = configForm[key];
      return typeof val === 'string' && val.trim().length > 0;
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
          <span>📡</span> Каналы связи
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Подключите мессенджеры для общения с клиентами через единый AI-ассистент.
        </p>
      </div>

      {/* Skill-created channels */}
      {skillChannels.length > 0 && (
        <div className="glass-card border border-[var(--neon-cyan)]/20 p-6">
          <h4 className="mb-3 flex items-center gap-2 text-base font-semibold text-white">
            <span>🤖</span> Каналы, созданные AI-агентом
          </h4>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {skillChannels.map((sc) => {
              const icons: Record<string, string> = { instagram: '📸', whatsapp: '💬', 'telegram-bot': '📱' };
              const names: Record<string, string> = {
                instagram: 'Instagram',
                whatsapp: 'WhatsApp',
                'telegram-bot': 'Telegram',
              };
              return (
                <div key={sc.channel} className="flex items-center gap-3 rounded-lg bg-white/5 p-3">
                  <span className="text-2xl">{icons[sc.channel] || '📡'}</span>
                  <div>
                    <p className="flex items-center gap-2 text-sm font-medium text-white">
                      {names[sc.channel] || sc.channel}
                      {sc.hasScript && (
                        <span className="rounded bg-[var(--neon-cyan)]/20 px-1.5 py-0.5 text-[10px] text-[var(--neon-cyan)]">
                          Script {sc.scriptMeta?.version || ''}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500">
                      {sc.scriptMeta?.provider || sc.provider || 'Настроен'} &middot;{' '}
                      <span className={sc.isActive ? 'text-green-400' : 'text-gray-400'}>
                        {sc.isActive ? 'Активен' : 'Неактивен'}
                      </span>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-gray-500">
            Подробная информация доступна на отдельных вкладках каждого канала выше.
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">{error}</div>
      )}

      {message && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-400">
          {message}
        </div>
      )}

      {/* Channel Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {CHANNEL_CONFIGS.map((channelDef) => {
          const channel = getChannelByType(channelDef.type);
          const isConnected = !!channel;
          const isActive = !!channel?.isActive;

          return (
            <div
              key={channelDef.type}
              className={`glass-card p-6 transition-colors ${
                isConnected ? 'border border-[var(--neon-cyan)]/20' : 'border border-transparent'
              }`}
            >
              {/* Icon & Name */}
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{channelDef.icon}</span>
                  <div>
                    <h4 className="font-semibold text-white">{channelDef.name}</h4>
                    <p className="text-xs text-gray-500">{channelDef.description}</p>
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="mb-4 flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${
                    isConnected && isActive ? 'bg-green-400' : isConnected ? 'bg-yellow-400' : 'bg-gray-500'
                  }`}
                />
                <span
                  className={`text-sm ${
                    isConnected && isActive ? 'text-green-400' : isConnected ? 'text-yellow-400' : 'text-gray-500'
                  }`}
                >
                  {isConnected && isActive
                    ? 'Подключён и активен'
                    : isConnected
                      ? 'Подключён (выключен)'
                      : 'Не подключён'}
                </span>
              </div>

              {/* Provider badge for WhatsApp */}
              {isConnected && channel?.provider && (
                <div className="mb-4">
                  <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-gray-300">
                    {getProviderLabel(channel.provider)}
                  </span>
                  {channel.provider === 'whapi' && channel.config?.humanTakeover && (
                    <span className="ml-2 rounded-full bg-indigo-500/20 px-2.5 py-1 text-xs text-indigo-300">
                      Human + AI
                    </span>
                  )}
                </div>
              )}

              {/* Actions */}
              {isConnected && channel ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleChannel(channel)}
                    className={`relative h-6 w-11 rounded-full transition-colors ${
                      isActive ? 'bg-[var(--neon-cyan)]' : 'bg-white/20'
                    }`}
                    title={isActive ? 'Выключить' : 'Включить'}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                        isActive ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                  <span className="flex-1 text-xs text-gray-500">{isActive ? 'Вкл' : 'Выкл'}</span>
                  <button
                    onClick={() => disconnectChannel(channel, channelDef.name)}
                    className="rounded-lg px-3 py-1.5 text-xs text-red-400 transition-colors hover:bg-red-500/10"
                  >
                    Отключить
                  </button>
                </div>
              ) : (
                <button onClick={() => openConnectForm(channelDef.type)} className="neon-button w-full text-center">
                  Подключить
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Handoff to Human Panel */}
      {handoffStats && (handoffStats.pending > 0 || handoffStats.active > 0) && (
        <div className="glass-card border border-orange-500/30 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h4 className="flex items-center gap-2 text-lg font-semibold text-white">
              <span>🤝</span> Запросы на оператора
              {handoffStats.pending > 0 && (
                <span className="ml-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white">
                  {handoffStats.pending}
                </span>
              )}
            </h4>
            <button
              onClick={fetchHandoffs}
              className="rounded-lg px-3 py-1.5 text-xs text-gray-400 transition-colors hover:bg-white/10"
            >
              Обновить
            </button>
          </div>

          {handoffsLoading ? (
            <div className="py-4 text-center">
              <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-orange-400 border-t-transparent" />
            </div>
          ) : (
            <div className="space-y-3">
              {handoffs
                .filter((h) => h.status !== 'resolved')
                .map((handoff) => {
                  const channelLabels: Record<string, string> = {
                    website: 'Виджет',
                    telegram: 'Telegram',
                    whatsapp: 'WhatsApp',
                    instagram: 'Instagram',
                  };
                  return (
                    <div
                      key={handoff._id}
                      className={`rounded-lg border p-4 ${
                        handoff.status === 'pending'
                          ? 'border-orange-500/30 bg-orange-500/5'
                          : 'border-blue-500/30 bg-blue-500/5'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex items-center gap-2">
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                handoff.status === 'pending'
                                  ? 'bg-orange-500/20 text-orange-300'
                                  : 'bg-blue-500/20 text-blue-300'
                              }`}
                            >
                              {handoff.status === 'pending' ? 'Ожидает' : 'В работе'}
                            </span>
                            <span className="text-xs text-gray-500">
                              {channelLabels[handoff.channel] || handoff.channel}
                            </span>
                            {handoff.customerName && (
                              <span className="text-xs text-gray-400">{handoff.customerName}</span>
                            )}
                          </div>
                          <p className="truncate text-sm text-gray-300">{handoff.lastCustomerMessage}</p>
                          <p className="mt-1 text-xs text-gray-500">
                            {new Date(handoff.requestedAt).toLocaleString('ru-RU')}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          {handoff.status === 'pending' && (
                            <button
                              onClick={() => handleHandoffAction(handoff._id, 'assign')}
                              className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs text-blue-400 transition-colors hover:bg-blue-500/20"
                            >
                              Принять
                            </button>
                          )}
                          <button
                            onClick={() => handleHandoffAction(handoff._id, 'resolve')}
                            className="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-1.5 text-xs text-green-400 transition-colors hover:bg-green-500/20"
                          >
                            Завершить
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              {handoffs.filter((h) => h.status !== 'resolved').length === 0 && (
                <p className="py-2 text-center text-sm text-gray-500">Нет активных запросов</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Connect Form */}
      {connectingType &&
        (() => {
          const channelDef = CHANNEL_CONFIGS.find((c) => c.type === connectingType)!;
          const hasProviders = !!channelDef.providers;
          const activeProvider = hasProviders ? channelDef.providers!.find((p) => p.id === selectedProvider) : null;

          const fields = activeProvider?.fields || channelDef.fields || [];
          const instructions = activeProvider?.instructions || channelDef.instructions || '';
          const extras = activeProvider?.extras || [];

          return (
            <div className="glass-card border border-[var(--neon-cyan)]/30 p-6">
              <h4 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
                <span>{channelDef.icon}</span> Подключение {channelDef.name}
              </h4>

              {/* Provider selector for WhatsApp */}
              {hasProviders && (
                <div className="mb-6">
                  <label className="mb-3 block text-sm font-medium text-gray-300">Выберите провайдер</label>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {channelDef.providers!.map((prov) => (
                      <button
                        key={prov.id}
                        onClick={() => {
                          setSelectedProvider(prov.id);
                          // Reset form but keep extras defaults
                          const defaults: Record<string, string | boolean | number> = {};
                          for (const extra of prov.extras || []) {
                            defaults[extra.key] = extra.default;
                          }
                          setConfigForm(defaults);
                        }}
                        className={`rounded-xl border p-4 text-left transition-all ${
                          selectedProvider === prov.id
                            ? 'border-[var(--neon-cyan)] bg-[var(--neon-cyan)]/10'
                            : 'border-white/10 bg-white/5 hover:border-white/20'
                        }`}
                      >
                        <p
                          className={`text-sm font-semibold ${
                            selectedProvider === prov.id ? 'text-[var(--neon-cyan)]' : 'text-white'
                          }`}
                        >
                          {prov.name}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">{prov.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Instructions */}
              <div className="mb-4 rounded-lg bg-white/5 p-4">
                <p className="text-sm whitespace-pre-line text-gray-400">{instructions}</p>
              </div>

              {/* Config fields */}
              {fields.length > 0 ? (
                <div className="space-y-4">
                  {fields.map((field) => (
                    <div key={field.key}>
                      <label className="mb-2 block text-sm text-gray-400">{field.label}</label>
                      <input
                        type={field.type}
                        value={String(configForm[field.key] || '')}
                        onChange={(e) => setConfigForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                        className="w-full rounded-lg border border-white/10 bg-black/30 p-3 text-white focus:border-[var(--neon-cyan)] focus:outline-none"
                        placeholder={field.placeholder}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mb-4 rounded-lg border border-[var(--neon-cyan)]/20 bg-[var(--neon-cyan)]/5 p-4">
                  <p className="text-sm text-[var(--neon-cyan)]">
                    Дополнительная настройка не требуется. Нажмите &laquo;Подключить&raquo; для активации канала.
                  </p>
                </div>
              )}

              {/* Extra settings (Human Takeover, timeout) */}
              {extras.length > 0 && (
                <div className="mt-6 space-y-4 rounded-lg border border-white/10 p-4">
                  <p className="text-sm font-medium text-gray-300">Дополнительные настройки</p>
                  {extras.map((extra) => (
                    <div key={extra.key} className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-sm text-white">{extra.label}</p>
                        <p className="text-xs text-gray-500">{extra.description}</p>
                      </div>
                      {extra.type === 'toggle' ? (
                        <button
                          type="button"
                          onClick={() =>
                            setConfigForm((prev) => ({
                              ...prev,
                              [extra.key]: !prev[extra.key],
                            }))
                          }
                          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                            configForm[extra.key] ? 'bg-[var(--neon-cyan)]' : 'bg-white/20'
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                              configForm[extra.key] ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      ) : (
                        <input
                          type="number"
                          min={1}
                          max={1440}
                          value={Number(configForm[extra.key]) || Number(extra.default)}
                          onChange={(e) =>
                            setConfigForm((prev) => ({
                              ...prev,
                              [extra.key]: parseInt(e.target.value) || extra.default,
                            }))
                          }
                          className="w-20 shrink-0 rounded-lg border border-white/10 bg-black/30 p-2 text-center text-white focus:border-[var(--neon-cyan)] focus:outline-none"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => connectChannel(channelDef)}
                  disabled={saving || !isFormValid(channelDef)}
                  className="neon-button disabled:opacity-50"
                >
                  {saving ? 'Подключение...' : 'Подключить'}
                </button>
                <button
                  onClick={cancelConnect}
                  className="rounded-lg bg-white/10 px-4 py-2 text-gray-400 transition-colors hover:bg-white/20"
                >
                  Отмена
                </button>
              </div>
            </div>
          );
        })()}
    </div>
  );
}
