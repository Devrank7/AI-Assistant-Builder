'use client';

import { useState, useEffect, useCallback } from 'react';

interface ProactiveTrigger {
  _id: string;
  type: 'time_on_page' | 'scroll_depth' | 'exit_intent' | 'url_match' | 'inactivity';
  message: string;
  isActive: boolean;
  config: {
    delayMs?: number;
    scrollPercent?: number;
    urlPattern?: string;
  };
  priority: number;
  maxShowsPerSession: number;
  cooldownMinutes: number;
  createdAt: string;
}

type TriggerType = ProactiveTrigger['type'];

interface TriggerFormData {
  type: TriggerType;
  message: string;
  isActive: boolean;
  config: {
    delayMs?: number;
    scrollPercent?: number;
    urlPattern?: string;
  };
  priority: number;
  maxShowsPerSession: number;
  cooldownMinutes: number;
}

const TRIGGER_TYPE_LABELS: Record<TriggerType, string> = {
  time_on_page: 'Время на странице',
  scroll_depth: 'Глубина прокрутки',
  exit_intent: 'Выход со страницы',
  url_match: 'URL совпадение',
  inactivity: 'Неактивность',
};

const TRIGGER_TYPE_ICONS: Record<TriggerType, string> = {
  time_on_page: '⏱️',
  scroll_depth: '📜',
  exit_intent: '🚪',
  url_match: '🔗',
  inactivity: '💤',
};

const DEFAULT_FORM: TriggerFormData = {
  type: 'time_on_page',
  message: '',
  isActive: true,
  config: { delayMs: 5000 },
  priority: 1,
  maxShowsPerSession: 1,
  cooldownMinutes: 30,
};

interface ProactiveTabProps {
  clientId: string;
}

export default function ProactiveTab({ clientId }: ProactiveTabProps) {
  const [triggers, setTriggers] = useState<ProactiveTrigger[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TriggerFormData>({ ...DEFAULT_FORM });

  const jsonHeaders = { 'Content-Type': 'application/json' };

  const fetchTriggers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/proactive-triggers/manage?clientId=${clientId}`, {
        headers: jsonHeaders,
      });
      if (!res.ok) throw new Error('Ошибка загрузки триггеров');
      const data = await res.json();
      setTriggers(data.triggers || data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchTriggers();
  }, [fetchTriggers]);

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 3000);
  };

  const getDefaultConfigForType = (type: TriggerType) => {
    switch (type) {
      case 'time_on_page':
        return { delayMs: 5000 };
      case 'scroll_depth':
        return { scrollPercent: 50 };
      case 'exit_intent':
        return {};
      case 'url_match':
        return { urlPattern: '' };
      case 'inactivity':
        return { delayMs: 30000 };
    }
  };

  const handleTypeChange = (type: TriggerType) => {
    setForm((prev) => ({
      ...prev,
      type,
      config: getDefaultConfigForType(type),
    }));
  };

  const openAddForm = () => {
    setForm({ ...DEFAULT_FORM });
    setEditingId(null);
    setShowForm(true);
  };

  const openEditForm = (trigger: ProactiveTrigger) => {
    setForm({
      type: trigger.type,
      message: trigger.message,
      isActive: trigger.isActive,
      config: { ...trigger.config },
      priority: trigger.priority,
      maxShowsPerSession: trigger.maxShowsPerSession,
      cooldownMinutes: trigger.cooldownMinutes,
    });
    setEditingId(trigger._id);
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm({ ...DEFAULT_FORM });
  };

  const saveTrigger = async () => {
    if (!form.message.trim()) {
      setError('Введите сообщение триггера');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        const res = await fetch('/api/proactive-triggers/manage', {
          method: 'PATCH',
          headers: jsonHeaders,
          body: JSON.stringify({ triggerId: editingId, ...form }),
        });
        if (!res.ok) throw new Error('Ошибка обновления триггера');
        showMessage('Триггер обновлён');
      } else {
        const res = await fetch('/api/proactive-triggers/manage', {
          method: 'POST',
          headers: jsonHeaders,
          body: JSON.stringify({ clientId, ...form }),
        });
        if (!res.ok) throw new Error('Ошибка создания триггера');
        showMessage('Триггер создан');
      }
      cancelForm();
      await fetchTriggers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const deleteTrigger = async (triggerId: string) => {
    if (!confirm('Удалить этот триггер?')) return;
    try {
      const res = await fetch(`/api/proactive-triggers/manage?triggerId=${triggerId}`, {
        method: 'DELETE',
        headers: jsonHeaders,
      });
      if (!res.ok) throw new Error('Ошибка удаления');
      showMessage('Триггер удалён');
      await fetchTriggers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка удаления');
    }
  };

  const toggleTrigger = async (trigger: ProactiveTrigger) => {
    try {
      const res = await fetch('/api/proactive-triggers/manage', {
        method: 'PATCH',
        headers: jsonHeaders,
        body: JSON.stringify({ triggerId: trigger._id, isActive: !trigger.isActive }),
      });
      if (!res.ok) throw new Error('Ошибка обновления');
      setTriggers((prev) => prev.map((t) => (t._id === trigger._id ? { ...t, isActive: !t.isActive } : t)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка обновления');
    }
  };

  if (loading) {
    return (
      <div className="glass-card p-8 text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[var(--neon-cyan)] border-t-transparent" />
        <p className="mt-4 text-gray-400">Загрузка триггеров...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
          <span>🎯</span> Проактивные триггеры ({triggers.length})
        </h3>
        <button onClick={openAddForm} className="neon-button">
          + Добавить триггер
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">{error}</div>
      )}

      {message && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-400">
          {message}
        </div>
      )}

      {/* Add / Edit Form */}
      {showForm && (
        <div className="glass-card border border-[var(--neon-cyan)]/30 p-6">
          <h4 className="mb-4 text-lg font-semibold text-white">
            {editingId ? 'Редактировать триггер' : 'Новый триггер'}
          </h4>
          <div className="space-y-4">
            {/* Type selector */}
            <div>
              <label className="mb-2 block text-sm text-gray-400">Тип триггера</label>
              <select
                value={form.type}
                onChange={(e) => handleTypeChange(e.target.value as TriggerType)}
                className="w-full rounded-lg border border-white/10 bg-black/30 p-3 text-white focus:border-[var(--neon-cyan)] focus:outline-none"
              >
                {(Object.keys(TRIGGER_TYPE_LABELS) as TriggerType[]).map((type) => (
                  <option key={type} value={type}>
                    {TRIGGER_TYPE_ICONS[type]} {TRIGGER_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>

            {/* Dynamic config fields */}
            {(form.type === 'time_on_page' || form.type === 'inactivity') && (
              <div>
                <label className="mb-2 block text-sm text-gray-400">Задержка (мс)</label>
                <input
                  type="number"
                  value={form.config.delayMs || 0}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      config: { ...prev.config, delayMs: parseInt(e.target.value) || 0 },
                    }))
                  }
                  className="w-full rounded-lg border border-white/10 bg-black/30 p-3 text-white focus:border-[var(--neon-cyan)] focus:outline-none"
                  placeholder="5000"
                  min="0"
                />
                <p className="mt-1 text-xs text-gray-500">
                  {form.type === 'time_on_page'
                    ? 'Через сколько миллисекунд после загрузки страницы показать сообщение'
                    : 'Через сколько миллисекунд бездействия показать сообщение'}
                </p>
              </div>
            )}

            {form.type === 'scroll_depth' && (
              <div>
                <label className="mb-2 block text-sm text-gray-400">Глубина прокрутки (%)</label>
                <input
                  type="number"
                  value={form.config.scrollPercent || 0}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      config: { ...prev.config, scrollPercent: parseInt(e.target.value) || 0 },
                    }))
                  }
                  className="w-full rounded-lg border border-white/10 bg-black/30 p-3 text-white focus:border-[var(--neon-cyan)] focus:outline-none"
                  placeholder="50"
                  min="0"
                  max="100"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Показать сообщение после прокрутки на указанный процент страницы
                </p>
              </div>
            )}

            {form.type === 'url_match' && (
              <div>
                <label className="mb-2 block text-sm text-gray-400">Шаблон URL</label>
                <input
                  type="text"
                  value={form.config.urlPattern || ''}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      config: { ...prev.config, urlPattern: e.target.value },
                    }))
                  }
                  className="w-full rounded-lg border border-white/10 bg-black/30 p-3 text-white focus:border-[var(--neon-cyan)] focus:outline-none"
                  placeholder="/pricing, /contacts, */product/*"
                />
                <p className="mt-1 text-xs text-gray-500">URL или паттерн страницы для срабатывания триггера</p>
              </div>
            )}

            {form.type === 'exit_intent' && (
              <p className="rounded-lg bg-white/5 p-3 text-sm text-gray-400">
                Триггер сработает при попытке пользователя покинуть страницу (движение мыши к верхней границе окна).
              </p>
            )}

            {/* Message */}
            <div>
              <label className="mb-2 block text-sm text-gray-400">Сообщение</label>
              <textarea
                value={form.message}
                onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
                className="h-24 w-full resize-none rounded-lg border border-white/10 bg-black/30 p-4 text-white focus:border-[var(--neon-cyan)] focus:outline-none"
                placeholder="Привет! Могу помочь с выбором?"
              />
            </div>

            {/* Priority, maxShows, cooldown */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm text-gray-400">Приоритет</label>
                <input
                  type="number"
                  value={form.priority}
                  onChange={(e) => setForm((prev) => ({ ...prev, priority: parseInt(e.target.value) || 1 }))}
                  className="w-full rounded-lg border border-white/10 bg-black/30 p-3 text-white focus:border-[var(--neon-cyan)] focus:outline-none"
                  min="1"
                  max="10"
                />
                <p className="mt-1 text-xs text-gray-500">1 = высший</p>
              </div>
              <div>
                <label className="mb-2 block text-sm text-gray-400">Показов за сессию</label>
                <input
                  type="number"
                  value={form.maxShowsPerSession}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      maxShowsPerSession: parseInt(e.target.value) || 1,
                    }))
                  }
                  className="w-full rounded-lg border border-white/10 bg-black/30 p-3 text-white focus:border-[var(--neon-cyan)] focus:outline-none"
                  min="1"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-gray-400">Кулдаун (минуты)</label>
                <input
                  type="number"
                  value={form.cooldownMinutes}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      cooldownMinutes: parseInt(e.target.value) || 0,
                    }))
                  }
                  className="w-full rounded-lg border border-white/10 bg-black/30 p-3 text-white focus:border-[var(--neon-cyan)] focus:outline-none"
                  min="0"
                />
                <p className="mt-1 text-xs text-gray-500">Пауза между повторными показами</p>
              </div>
            </div>

            {/* Active toggle in form */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, isActive: !prev.isActive }))}
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  form.isActive ? 'bg-[var(--neon-cyan)]' : 'bg-white/20'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                    form.isActive ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
              <span className="text-sm text-gray-400">{form.isActive ? 'Активен' : 'Неактивен'}</span>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button onClick={saveTrigger} disabled={saving} className="neon-button disabled:opacity-50">
                {saving ? 'Сохранение...' : editingId ? 'Сохранить изменения' : 'Создать триггер'}
              </button>
              <button
                onClick={cancelForm}
                className="rounded-lg bg-white/10 px-4 py-2 text-gray-400 transition-colors hover:bg-white/20"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Triggers List */}
      {triggers.length > 0 ? (
        <div className="space-y-3">
          {triggers.map((trigger) => (
            <div
              key={trigger._id}
              className={`glass-card p-4 transition-colors ${!trigger.isActive ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <span className="mt-0.5 text-2xl">{TRIGGER_TYPE_ICONS[trigger.type]}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">{TRIGGER_TYPE_LABELS[trigger.type]}</span>
                      <span
                        className={`rounded px-2 py-0.5 text-xs ${
                          trigger.isActive ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-gray-500'
                        }`}
                      >
                        {trigger.isActive ? 'Активен' : 'Выключен'}
                      </span>
                      <span className="rounded bg-white/10 px-2 py-0.5 text-xs text-gray-500">
                        Приоритет: {trigger.priority}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-gray-400">{trigger.message}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      {trigger.config.delayMs !== undefined && (
                        <span className="rounded bg-white/5 px-2 py-1">Задержка: {trigger.config.delayMs}мс</span>
                      )}
                      {trigger.config.scrollPercent !== undefined && (
                        <span className="rounded bg-white/5 px-2 py-1">Прокрутка: {trigger.config.scrollPercent}%</span>
                      )}
                      {trigger.config.urlPattern && (
                        <span className="rounded bg-white/5 px-2 py-1">URL: {trigger.config.urlPattern}</span>
                      )}
                      <span className="rounded bg-white/5 px-2 py-1">Макс. показов: {trigger.maxShowsPerSession}</span>
                      <span className="rounded bg-white/5 px-2 py-1">Кулдаун: {trigger.cooldownMinutes} мин</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Toggle */}
                  <button
                    type="button"
                    onClick={() => toggleTrigger(trigger)}
                    className={`relative h-6 w-11 rounded-full transition-colors ${
                      trigger.isActive ? 'bg-[var(--neon-cyan)]' : 'bg-white/20'
                    }`}
                    title={trigger.isActive ? 'Выключить' : 'Включить'}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                        trigger.isActive ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>

                  {/* Edit */}
                  <button
                    onClick={() => openEditForm(trigger)}
                    className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
                    title="Редактировать"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => deleteTrigger(trigger._id)}
                    className="rounded-lg p-2 text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
                    title="Удалить"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-card p-12 text-center">
          <span className="mb-4 block text-4xl">🎯</span>
          <p className="text-gray-400">Нет проактивных триггеров.</p>
          <p className="mt-2 text-sm text-gray-500">
            Создайте триггер, чтобы виджет сам начинал диалог с посетителями.
          </p>
        </div>
      )}
    </div>
  );
}
