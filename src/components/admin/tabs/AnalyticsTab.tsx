'use client';

interface AnalyticsData {
  totalChats: number;
  totalMessages: number;
  avgMessagesPerChat: number;
  dailyStats: Array<{ date: string; totalChats: number; totalMessages: number }>;
  hourlyDistribution: Array<{ hour: number; count: number }>;
  topQuestions: Array<{ text: string; count: number }>;
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
  if (analyticsLoading) {
    return (
      <div className="glass-card p-12 text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-[var(--neon-cyan)] border-t-transparent" />
        <p className="text-gray-400">Загрузка аналитики...</p>
      </div>
    );
  }

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

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="glass-card p-6 text-center">
          <p className="text-4xl font-bold text-[var(--neon-cyan)]">{analyticsData.totalChats}</p>
          <p className="mt-2 text-gray-400">Всего чатов</p>
          <p className="mt-1 text-xs text-gray-500">за 30 дней</p>
        </div>
        <div className="glass-card p-6 text-center">
          <p className="text-4xl font-bold text-[var(--neon-purple)]">{analyticsData.totalMessages}</p>
          <p className="mt-2 text-gray-400">Сообщений</p>
          <p className="mt-1 text-xs text-gray-500">за 30 дней</p>
        </div>
        <div className="glass-card p-6 text-center">
          <p className="text-4xl font-bold text-green-400">{analyticsData.avgMessagesPerChat}</p>
          <p className="mt-2 text-gray-400">Сообщений/чат</p>
          <p className="mt-1 text-xs text-gray-500">в среднем</p>
        </div>
      </div>

      {/* Daily Chart */}
      <div className="glass-card p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">📈 Чаты по дням</h3>
        <div className="flex h-48 items-end gap-1">
          {analyticsData.dailyStats.slice(-14).map((day, i) => {
            const maxChats = Math.max(...analyticsData.dailyStats.map((d) => d.totalChats), 1);
            const height = (day.totalChats / maxChats) * 100;
            return (
              <div key={i} className="group flex flex-1 flex-col items-center">
                <div
                  className="w-full rounded-t bg-gradient-to-t from-[var(--neon-cyan)] to-[var(--neon-purple)] opacity-70 transition-opacity group-hover:opacity-100"
                  style={{ height: `${Math.max(height, 2)}%` }}
                  title={`${day.date}: ${day.totalChats} чатов`}
                />
                <p className="mt-1 origin-left rotate-45 text-[10px] text-gray-500">{new Date(day.date).getDate()}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Hourly Distribution */}
      <div className="glass-card p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">🕐 Активность по часам</h3>
        <div className="flex h-32 items-end gap-1">
          {analyticsData.hourlyDistribution.map((h, i) => {
            const maxCount = Math.max(...analyticsData.hourlyDistribution.map((x) => x.count), 1);
            const height = (h.count / maxCount) * 100;
            return (
              <div key={i} className="group flex flex-1 flex-col items-center">
                <div
                  className="w-full rounded-t bg-[var(--neon-cyan)]/60 transition-colors group-hover:bg-[var(--neon-cyan)]"
                  style={{ height: `${Math.max(height, 2)}%` }}
                  title={`${h.hour}:00 - ${h.count} чатов`}
                />
                {i % 4 === 0 && <p className="mt-1 text-[10px] text-gray-500">{h.hour}:00</p>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Questions */}
      <div className="glass-card p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">❓ Популярные вопросы</h3>
        {analyticsData.topQuestions.length > 0 ? (
          <div className="space-y-2">
            {analyticsData.topQuestions.map((q, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg bg-white/5 p-2">
                <span className="w-6 font-bold text-[var(--neon-cyan)]">{i + 1}</span>
                <p className="flex-1 truncate text-sm text-gray-300">{q.text}</p>
                <span className="text-sm text-gray-500">{q.count}x</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-4 text-center text-gray-500">Пока нет данных</p>
        )}
      </div>

      {/* Google Sheets Export */}
      <div className="glass-card p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">📊 Экспорт в Google Sheets</h3>
        <p className="mb-4 text-sm text-gray-400">
          Экспортируйте историю чатов в Google Таблицу для дальнейшего анализа.
        </p>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="ID таблицы Google Sheets"
            value={spreadsheetId}
            onChange={(e) => setSpreadsheetId(e.target.value)}
            className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-gray-500 focus:border-[var(--neon-cyan)] focus:outline-none"
          />
          <button onClick={exportToSheets} disabled={sheetsExporting} className="neon-button disabled:opacity-50">
            {sheetsExporting ? 'Экспорт...' : 'Экспорт'}
          </button>
        </div>
        {exportMessage && (
          <p className={`mt-3 text-sm ${exportMessage.startsWith('✅') ? 'text-green-400' : 'text-yellow-400'}`}>
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
