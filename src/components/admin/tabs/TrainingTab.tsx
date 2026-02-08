'use client';

import { useState, useEffect, useCallback } from 'react';

interface Correction {
  _id: string;
  userQuestion: string;
  originalAnswer: string;
  correctedAnswer: string;
  status: 'pending' | 'applied' | 'rejected';
  createdAt: string;
  appliedAt?: string;
}

interface CorrectionStats {
  total: number;
  pending: number;
  applied: number;
  rejected: number;
}

interface TrainingTabProps {
  clientId: string;
}

export default function TrainingTab({ clientId }: TrainingTabProps) {
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [stats, setStats] = useState<CorrectionStats>({ total: 0, pending: 0, applied: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const jsonHeaders = { 'Content-Type': 'application/json' };

  const fetchCorrections = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/corrections?clientId=${clientId}`, {
        headers: jsonHeaders,
      });
      if (!res.ok) throw new Error('Ошибка загрузки коррекций');
      const data = await res.json();
      setCorrections(data.corrections || []);
      setStats(
        data.stats || {
          total: data.corrections?.length || 0,
          pending: data.corrections?.filter((c: Correction) => c.status === 'pending').length || 0,
          applied: data.corrections?.filter((c: Correction) => c.status === 'applied').length || 0,
          rejected: data.corrections?.filter((c: Correction) => c.status === 'rejected').length || 0,
        }
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchCorrections();
  }, [fetchCorrections]);

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 3000);
  };

  const updateCorrection = async (correctionId: string, status: 'applied' | 'rejected', apply?: boolean) => {
    setProcessing(correctionId);
    setError(null);
    try {
      const res = await fetch('/api/corrections', {
        method: 'PATCH',
        headers: jsonHeaders,
        body: JSON.stringify({ correctionId, status, apply }),
      });
      if (!res.ok) throw new Error('Ошибка обновления коррекции');
      showMessage(status === 'applied' ? 'Коррекция применена' : 'Коррекция отклонена');
      await fetchCorrections();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка обновления');
    } finally {
      setProcessing(null);
    }
  };

  const getStatusBadge = (status: Correction['status']) => {
    switch (status) {
      case 'pending':
        return (
          <span className="rounded-full bg-yellow-500/20 px-2.5 py-1 text-xs font-medium text-yellow-400">Ожидает</span>
        );
      case 'applied':
        return (
          <span className="rounded-full bg-green-500/20 px-2.5 py-1 text-xs font-medium text-green-400">Применено</span>
        );
      case 'rejected':
        return (
          <span className="rounded-full bg-red-500/20 px-2.5 py-1 text-xs font-medium text-red-400">Отклонено</span>
        );
    }
  };

  if (loading) {
    return (
      <div className="glass-card p-8 text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[var(--neon-cyan)] border-t-transparent" />
        <p className="mt-4 text-gray-400">Загрузка коррекций...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
          <span>🧠</span> Обучение AI
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Просматривайте и применяйте коррекции для улучшения ответов AI-ассистента.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">{error}</div>
      )}

      {message && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-400">
          {message}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="glass-card p-4 text-center">
          <p className="text-3xl font-bold text-[var(--neon-cyan)]">{stats.total}</p>
          <p className="mt-1 text-sm text-gray-400">Всего коррекций</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-3xl font-bold text-yellow-400">{stats.pending}</p>
          <p className="mt-1 text-sm text-gray-400">Ожидают</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-3xl font-bold text-green-400">{stats.applied}</p>
          <p className="mt-1 text-sm text-gray-400">Применено</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-3xl font-bold text-red-400">{stats.rejected}</p>
          <p className="mt-1 text-sm text-gray-400">Отклонено</p>
        </div>
      </div>

      {/* Corrections List */}
      {corrections.length > 0 ? (
        <div className="space-y-4">
          {corrections.map((correction) => (
            <div key={correction._id} className="glass-card p-5">
              {/* Header row */}
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white">Вопрос пользователя:</p>
                  <p className="mt-1 line-clamp-2 text-sm text-gray-300">{correction.userQuestion}</p>
                </div>
                <div className="shrink-0">{getStatusBadge(correction.status)}</div>
              </div>

              {/* Side-by-side comparison */}
              <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                {/* Original answer */}
                <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                  <p className="mb-2 text-xs font-medium text-red-400">Оригинальный ответ</p>
                  <p className="line-clamp-4 text-sm text-gray-400">{correction.originalAnswer}</p>
                </div>

                {/* Corrected answer */}
                <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-3">
                  <p className="mb-2 text-xs font-medium text-green-400">Исправленный ответ</p>
                  <p className="line-clamp-4 text-sm text-gray-300">{correction.correctedAnswer}</p>
                </div>
              </div>

              {/* Footer: date + actions */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  {new Date(correction.createdAt).toLocaleString('ru-RU', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>

                {correction.status === 'pending' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateCorrection(correction._id, 'applied', true)}
                      disabled={processing === correction._id}
                      className="rounded-lg bg-green-500/10 px-4 py-2 text-sm font-medium text-green-400 transition-colors hover:bg-green-500/20 disabled:opacity-50"
                    >
                      {processing === correction._id ? '...' : 'Применить'}
                    </button>
                    <button
                      onClick={() => updateCorrection(correction._id, 'rejected')}
                      disabled={processing === correction._id}
                      className="rounded-lg bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-50"
                    >
                      {processing === correction._id ? '...' : 'Отклонить'}
                    </button>
                  </div>
                )}

                {correction.status === 'applied' && correction.appliedAt && (
                  <span className="text-xs text-green-500">
                    Применено: {new Date(correction.appliedAt).toLocaleDateString('ru-RU')}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-card p-12 text-center">
          <span className="mb-4 block text-4xl">🧠</span>
          <p className="text-gray-400">Нет коррекций для обработки.</p>
          <p className="mt-2 text-sm text-gray-500">
            Коррекции появятся, когда операторы будут исправлять ответы AI в диалогах.
          </p>
        </div>
      )}
    </div>
  );
}
