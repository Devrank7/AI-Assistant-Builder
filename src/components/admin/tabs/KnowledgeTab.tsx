'use client';

interface KnowledgeChunk {
  _id: string;
  text: string;
  source: string;
  createdAt: string;
}

interface KnowledgeTabProps {
  uploadFile: (file: File) => void;
  uploadingFile: boolean;
  uploadMessage: string | null;
  newKnowledgeSource: string;
  setNewKnowledgeSource: (val: string) => void;
  newKnowledgeText: string;
  setNewKnowledgeText: (val: string) => void;
  addKnowledge: () => void;
  addingKnowledge: boolean;
  knowledgeChunks: KnowledgeChunk[];
  knowledgeLoading: boolean;
  deleteKnowledge: (id: string) => void;
}

export default function KnowledgeTab({
  uploadFile,
  uploadingFile,
  uploadMessage,
  newKnowledgeSource,
  setNewKnowledgeSource,
  newKnowledgeText,
  setNewKnowledgeText,
  addKnowledge,
  addingKnowledge,
  knowledgeChunks,
  knowledgeLoading,
  deleteKnowledge,
}: KnowledgeTabProps) {
  return (
    <div className="space-y-6">
      {/* File Upload */}
      <div className="glass-card p-6">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
          <span>📄</span> Загрузить документ
        </h3>
        <div
          className="cursor-pointer rounded-lg border-2 border-dashed border-white/20 p-8 text-center transition-colors hover:border-[var(--neon-cyan)]/50"
          onClick={() => document.getElementById('fileInput')?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const file = e.dataTransfer.files[0];
            if (file) uploadFile(file);
          }}
        >
          <input
            id="fileInput"
            type="file"
            accept=".pdf,.docx,.txt,.md"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadFile(file);
            }}
          />
          {uploadingFile ? (
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[var(--neon-cyan)] border-t-transparent" />
          ) : (
            <>
              <span className="mb-2 block text-4xl">📁</span>
              <p className="text-gray-400">Перетащите файл сюда или нажмите для выбора</p>
              <p className="mt-2 text-xs text-gray-500">PDF, DOCX, TXT, MD</p>
            </>
          )}
        </div>
        {uploadMessage && <p className="mt-3 text-center text-sm">{uploadMessage}</p>}
      </div>

      {/* Add Knowledge */}
      <div className="glass-card p-6">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
          <span>➕</span> Добавить знания
        </h3>
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm text-gray-400">Источник (опционально)</label>
            <input
              type="text"
              value={newKnowledgeSource}
              onChange={(e) => setNewKnowledgeSource(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-black/30 p-3 text-white focus:border-[var(--neon-cyan)] focus:outline-none"
              placeholder="FAQ, Сайт, Документ..."
            />
          </div>
          <div>
            <label className="mb-2 block text-sm text-gray-400">Текст</label>
            <textarea
              value={newKnowledgeText}
              onChange={(e) => setNewKnowledgeText(e.target.value)}
              className="h-32 w-full resize-none rounded-lg border border-white/10 bg-black/30 p-4 text-white focus:border-[var(--neon-cyan)] focus:outline-none"
              placeholder="Введите информацию о бизнесе, которую должен знать бот..."
            />
          </div>
          <button
            onClick={addKnowledge}
            disabled={addingKnowledge || !newKnowledgeText.trim()}
            className="neon-button disabled:opacity-50"
          >
            {addingKnowledge ? 'Обработка...' : 'Добавить в базу знаний'}
          </button>
        </div>
      </div>

      {/* Existing Knowledge */}
      <div className="glass-card p-6">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
          <span>📚</span> База знаний ({knowledgeChunks.length} записей)
        </h3>
        {knowledgeLoading ? (
          <div className="py-8 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[var(--neon-cyan)] border-t-transparent" />
          </div>
        ) : knowledgeChunks.length > 0 ? (
          <div className="space-y-3">
            {knowledgeChunks.map((chunk) => (
              <div key={chunk._id} className="rounded-lg bg-white/5 p-4 transition-colors hover:bg-white/10">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm text-gray-300">{chunk.text}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="rounded bg-white/10 px-2 py-1 text-xs text-gray-500">{chunk.source}</span>
                      <span className="text-xs text-gray-500">{new Date(chunk.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteKnowledge(chunk._id)}
                    className="text-red-400 transition-colors hover:text-red-300"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            ))}
          </div>
        ) : (
          <p className="py-8 text-center text-gray-400">База знаний пуста. Добавьте информацию выше.</p>
        )}
      </div>
    </div>
  );
}
