'use client';

interface ChatLogSummary {
  _id: string;
  sessionId: string;
  messageCount: number;
  lastMessage?: string;
  createdAt: string;
}

interface ChatHistoryTabProps {
  chatLogs: ChatLogSummary[];
  chatLogsLoading: boolean;
  viewChatLog: (logId: string) => void;
  selectedLog: { messages: Array<{ role: string; content: string; timestamp: string }> } | null;
  setSelectedLog: (log: null) => void;
}

export default function ChatHistoryTab({
  chatLogs,
  chatLogsLoading,
  viewChatLog,
  selectedLog,
  setSelectedLog,
}: ChatHistoryTabProps) {
  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
          <span>💬</span> История чатов ({chatLogs.length})
        </h3>
        {chatLogsLoading ? (
          <div className="py-8 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[var(--neon-cyan)] border-t-transparent" />
          </div>
        ) : chatLogs.length > 0 ? (
          <div className="space-y-3">
            {chatLogs.map((log) => (
              <button
                key={log._id}
                onClick={() => viewChatLog(log._id)}
                className="w-full rounded-lg bg-white/5 p-4 text-left transition-colors hover:bg-white/10"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-white">Сессия: {log.sessionId.slice(0, 12)}...</p>
                    <p className="mt-1 text-sm text-gray-400">
                      {log.messageCount} сообщений &bull; {new Date(log.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <span className="text-gray-500">&rarr;</span>
                </div>
                {log.lastMessage && <p className="mt-2 truncate text-xs text-gray-500">Последнее: {log.lastMessage}</p>}
              </button>
            ))}
          </div>
        ) : (
          <p className="py-8 text-center text-gray-400">
            Нет истории чатов. Диалоги появятся после первых сообщений виджета.
          </p>
        )}
      </div>

      {/* Selected Chat Modal */}
      {selectedLog && (
        <div className="glass-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Детали диалога</h3>
            <button onClick={() => setSelectedLog(null)} className="text-gray-400 hover:text-white">
              &#10005;
            </button>
          </div>
          <div className="max-h-96 space-y-3 overflow-y-auto">
            {selectedLog.messages.map((msg, i) => (
              <div
                key={i}
                className={`rounded-lg p-3 ${
                  msg.role === 'user' ? 'ml-8 bg-[var(--neon-cyan)]/10' : 'mr-8 bg-white/5'
                }`}
              >
                <p className="mb-1 text-xs text-gray-500">
                  {msg.role === 'user' ? 'Пользователь' : 'Бот'} &bull; {new Date(msg.timestamp).toLocaleTimeString()}
                </p>
                <p className="text-sm text-gray-300">{msg.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
