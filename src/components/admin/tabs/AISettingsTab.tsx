'use client';

interface AISettings {
  systemPrompt: string;
  greeting: string;
  temperature: number;
  maxTokens: number;
  topK: number;
  model?: string;
}

interface AIModelInfo {
  id: string;
  name: string;
  description: string;
}

interface PromptTemplate {
  id: string;
  name: string;
  icon: string;
  description: string;
  suggestedTemperature: number;
}

interface AISettingsTabProps {
  aiSettings: AISettings | null;
  setAiSettings: (settings: AISettings) => void;
  aiSettingsLoading: boolean;
  aiSettingsSaving: boolean;
  saveAISettings: () => void;
  availableModels: AIModelInfo[];
  templates: PromptTemplate[];
  applyTemplate: (templateId: string) => void;
  aiSettingsMessage: string | null;
  testMessage: string;
  setTestMessage: (msg: string) => void;
  testChat: () => void;
  testLoading: boolean;
  testResponse: string;
}

export default function AISettingsTab({
  aiSettings,
  setAiSettings,
  aiSettingsLoading,
  aiSettingsSaving,
  saveAISettings,
  availableModels,
  templates,
  applyTemplate,
  aiSettingsMessage,
  testMessage,
  setTestMessage,
  testChat,
  testLoading,
  testResponse,
}: AISettingsTabProps) {
  if (aiSettingsLoading) {
    return (
      <div className="glass-card p-8 text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[var(--neon-cyan)] border-t-transparent" />
      </div>
    );
  }

  if (!aiSettings) return null;

  return (
    <div className="space-y-6">
      {/* Template Selector */}
      <div className="glass-card p-6">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
          <span>📋</span> Шаблоны промптов
        </h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {templates.map((template) => (
            <button
              key={template.id}
              onClick={() => applyTemplate(template.id)}
              className="rounded-lg border border-transparent bg-white/5 p-3 text-center transition-colors hover:border-[var(--neon-cyan)]/30 hover:bg-white/10"
            >
              <span className="mb-1 block text-2xl">{template.icon}</span>
              <span className="text-xs text-gray-300">{template.name}</span>
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-gray-500">
          Выберите шаблон для быстрой настройки. Это заполнит промпт и приветствие.
        </p>
      </div>

      <div className="glass-card border border-[var(--neon-cyan)]/20 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-bold text-white">🧠 AI Model</h3>
          <span className="rounded border border-[var(--neon-cyan)]/20 bg-[var(--neon-cyan)]/10 px-2 py-1 text-xs text-[var(--neon-cyan)]">
            {availableModels.find((m) => m.id === aiSettings.model)?.name || aiSettings.model || 'Default'}
          </span>
        </div>
        <select
          value={aiSettings.model || ''}
          onChange={(e) => setAiSettings({ ...aiSettings, model: e.target.value })}
          className="mb-2 w-full rounded-lg border border-white/10 bg-black/30 p-3 text-white focus:border-[var(--neon-cyan)] focus:outline-none"
        >
          {availableModels.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name}
            </option>
          ))}
          {!aiSettings.model && <option value="">Select a model...</option>}
        </select>
        <p className="text-xs text-gray-400">
          {availableModels.find((m) => m.id === aiSettings.model)?.description ||
            'Select the brain power for your agent.'}
        </p>
      </div>

      <div className="glass-card p-6">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
          <span>🤖</span> System Prompt
        </h3>
        <textarea
          value={aiSettings.systemPrompt}
          onChange={(e) => setAiSettings({ ...aiSettings, systemPrompt: e.target.value })}
          className="h-40 w-full resize-none rounded-lg border border-white/10 bg-black/30 p-4 font-mono text-sm text-white focus:border-[var(--neon-cyan)] focus:outline-none"
          placeholder="Инструкции для AI-ассистента..."
        />
        <p className="mt-2 text-xs text-gray-500">Опишите роль бота, тон общения и правила поведения.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="glass-card p-6">
          <h3 className="mb-4 text-lg font-semibold text-white">💬 Приветствие</h3>
          <input
            type="text"
            value={aiSettings.greeting}
            onChange={(e) => setAiSettings({ ...aiSettings, greeting: e.target.value })}
            className="w-full rounded-lg border border-white/10 bg-black/30 p-3 text-white focus:border-[var(--neon-cyan)] focus:outline-none"
            placeholder="Привет! Чем могу помочь?"
          />
        </div>

        <div className="glass-card p-6">
          <h3 className="mb-4 text-lg font-semibold text-white">🎨 Креативность</h3>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={aiSettings.temperature}
              onChange={(e) => setAiSettings({ ...aiSettings, temperature: parseFloat(e.target.value) })}
              className="flex-1 accent-[var(--neon-cyan)]"
            />
            <span className="w-12 text-right font-mono text-[var(--neon-cyan)]">
              {aiSettings.temperature.toFixed(1)}
            </span>
          </div>
          <p className="mt-2 text-xs text-gray-500">0 = точные ответы, 1 = более творческие</p>
        </div>

        <div className="glass-card p-6">
          <h3 className="mb-4 text-lg font-semibold text-white">📊 Макс. токенов ответа</h3>
          <input
            type="number"
            value={aiSettings.maxTokens}
            onChange={(e) => setAiSettings({ ...aiSettings, maxTokens: parseInt(e.target.value) || 1024 })}
            className="w-full rounded-lg border border-white/10 bg-black/30 p-3 text-white focus:border-[var(--neon-cyan)] focus:outline-none"
            min="100"
            max="4096"
          />
        </div>

        <div className="glass-card p-6">
          <h3 className="mb-4 text-lg font-semibold text-white">🔍 Кол-во контекста (Top-K)</h3>
          <input
            type="number"
            value={aiSettings.topK}
            onChange={(e) => setAiSettings({ ...aiSettings, topK: parseInt(e.target.value) || 3 })}
            className="w-full rounded-lg border border-white/10 bg-black/30 p-3 text-white focus:border-[var(--neon-cyan)] focus:outline-none"
            min="1"
            max="10"
          />
          <p className="mt-2 text-xs text-gray-500">Сколько кусочков знаний использовать для ответа</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button onClick={saveAISettings} disabled={aiSettingsSaving} className="neon-button disabled:opacity-50">
          {aiSettingsSaving ? 'Сохранение...' : 'Сохранить настройки'}
        </button>
        {aiSettingsMessage && <span className="text-[var(--neon-cyan)]">{aiSettingsMessage}</span>}
      </div>

      {/* Test Chat */}
      <div className="glass-card p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">🧪 Тест чата</h3>
        <div className="mb-4 flex gap-4">
          <input
            type="text"
            value={testMessage}
            onChange={(e) => setTestMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && testChat()}
            className="flex-1 rounded-lg border border-white/10 bg-black/30 p-3 text-white focus:border-[var(--neon-cyan)] focus:outline-none"
            placeholder="Задайте вопрос для теста..."
          />
          <button onClick={testChat} disabled={testLoading} className="neon-button disabled:opacity-50">
            {testLoading ? '...' : 'Отправить'}
          </button>
        </div>
        {testResponse && <div className="rounded-lg bg-black/30 p-4 text-gray-300">{testResponse}</div>}
      </div>
    </div>
  );
}
