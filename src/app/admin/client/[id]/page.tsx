'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { IClient } from '@/models/Client';

interface ClientDetailsData {
  client: IClient;
  files: string[];
}

interface AISettings {
  systemPrompt: string;
  greeting: string;
  temperature: number;
  maxTokens: number;
  topK: number;
}

interface KnowledgeChunk {
  _id: string;
  text: string;
  source: string;
  createdAt: string;
}

const demoTemplates = [
  {
    id: 'dental',
    name: 'Dental Clinic',
    description: 'Modern dental clinic website with appointment booking',
    image: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800&q=80',
    gradient: 'from-cyan-500 to-blue-600',
    icon: '🦷',
    isClientSite: false,
  },
  {
    id: 'construction',
    name: 'Construction Co.',
    description: 'Professional construction company website',
    image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80',
    gradient: 'from-orange-500 to-amber-600',
    icon: '🏗️',
    isClientSite: false,
  },
  {
    id: 'hotel',
    name: 'Luxury Hotel',
    description: 'Elegant hotel booking website',
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',
    gradient: 'from-purple-500 to-pink-600',
    icon: '🏨',
    isClientSite: false,
  },
  {
    id: 'client-website',
    name: 'Client Website',
    description: 'Preview widget on the actual client website',
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
    gradient: 'from-green-500 to-emerald-600',
    icon: '🌐',
    isClientSite: true,
  },
];

const defaultSystemPrompt = `Ты полезный AI-ассистент. Отвечай вежливо и по существу.
Используй предоставленную информацию из базы знаний для ответов.
Если не знаешь ответа, честно скажи об этом.`;

interface PromptTemplate {
  id: string;
  name: string;
  icon: string;
  description: string;
  suggestedTemperature: number;
}

interface ChatLogSummary {
  _id: string;
  sessionId: string;
  messageCount: number;
  lastMessage?: string;
  createdAt: string;
}

type TabType = 'info' | 'files' | 'usage' | 'demo' | 'ai-settings' | 'knowledge' | 'history';

export default function ClientDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<ClientDetailsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('info');

  // AI Settings state
  const [aiSettings, setAiSettings] = useState<AISettings | null>(null);
  const [aiSettingsLoading, setAiSettingsLoading] = useState(false);
  const [aiSettingsSaving, setAiSettingsSaving] = useState(false);
  const [aiSettingsMessage, setAiSettingsMessage] = useState<string | null>(null);

  // Knowledge Base state
  const [knowledgeChunks, setKnowledgeChunks] = useState<KnowledgeChunk[]>([]);
  const [knowledgeLoading, setKnowledgeLoading] = useState(false);
  const [newKnowledgeText, setNewKnowledgeText] = useState('');
  const [newKnowledgeSource, setNewKnowledgeSource] = useState('');
  const [addingKnowledge, setAddingKnowledge] = useState(false);

  // Chat test state
  const [testMessage, setTestMessage] = useState('');
  const [testResponse, setTestResponse] = useState('');
  const [testLoading, setTestLoading] = useState(false);

  // Templates state
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);

  // File upload state
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);

  // Chat history state
  const [chatLogs, setChatLogs] = useState<ChatLogSummary[]>([]);
  const [chatLogsLoading, setChatLogsLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<{ messages: Array<{ role: string; content: string; timestamp: string }> } | null>(null);

  useEffect(() => {
    if (params.id) {
      fetchClientData(params.id as string);
    }
  }, [params.id]);

  useEffect(() => {
    if (data?.client.clientId && activeTab === 'ai-settings') {
      fetchAISettings();
    }
    if (data?.client.clientId && activeTab === 'knowledge') {
      fetchKnowledge();
    }
  }, [activeTab, data?.client.clientId]);

  const fetchClientData = async (id: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/clients/${id}`);
      const result = await response.json();

      if (result.success) {
        setData(result);
      } else {
        setError(result.error || 'Client not found');
      }
    } catch (err) {
      setError('Failed to fetch client data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAISettings = async () => {
    if (!data?.client.clientId) return;
    try {
      setAiSettingsLoading(true);
      const response = await fetch(`/api/ai-settings/${data.client.clientId}`);
      const result = await response.json();
      if (result.success) {
        setAiSettings(result.settings);
      }
    } catch (err) {
      console.error('Failed to fetch AI settings:', err);
    } finally {
      setAiSettingsLoading(false);
    }
  };

  const saveAISettings = async () => {
    if (!data?.client.clientId || !aiSettings) return;
    try {
      setAiSettingsSaving(true);
      setAiSettingsMessage(null);
      const response = await fetch(`/api/ai-settings/${data.client.clientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(aiSettings),
      });
      const result = await response.json();
      if (result.success) {
        setAiSettingsMessage('Настройки сохранены!');
        setTimeout(() => setAiSettingsMessage(null), 3000);
      }
    } catch (err) {
      console.error('Failed to save AI settings:', err);
      setAiSettingsMessage('Ошибка сохранения');
    } finally {
      setAiSettingsSaving(false);
    }
  };

  const fetchKnowledge = async () => {
    if (!data?.client.clientId) return;
    try {
      setKnowledgeLoading(true);
      const response = await fetch(`/api/knowledge?clientId=${data.client.clientId}`);
      const result = await response.json();
      if (result.success) {
        setKnowledgeChunks(result.chunks);
      }
    } catch (err) {
      console.error('Failed to fetch knowledge:', err);
    } finally {
      setKnowledgeLoading(false);
    }
  };

  const addKnowledge = async () => {
    if (!data?.client.clientId || !newKnowledgeText.trim()) return;
    try {
      setAddingKnowledge(true);
      const response = await fetch('/api/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: data.client.clientId,
          text: newKnowledgeText,
          source: newKnowledgeSource || 'manual',
        }),
      });
      const result = await response.json();
      if (result.success) {
        setNewKnowledgeText('');
        setNewKnowledgeSource('');
        fetchKnowledge();
      }
    } catch (err) {
      console.error('Failed to add knowledge:', err);
    } finally {
      setAddingKnowledge(false);
    }
  };

  const deleteKnowledge = async (chunkId: string) => {
    if (!data?.client.clientId) return;
    try {
      await fetch(`/api/knowledge?id=${chunkId}&clientId=${data.client.clientId}`, {
        method: 'DELETE',
      });
      fetchKnowledge();
    } catch (err) {
      console.error('Failed to delete knowledge:', err);
    }
  };

  const testChat = async () => {
    if (!data?.client.clientId || !testMessage.trim()) return;
    try {
      setTestLoading(true);
      setTestResponse('');
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: data.client.clientId,
          message: testMessage,
        }),
      });
      const result = await response.json();
      if (result.success) {
        setTestResponse(result.response);
      } else {
        setTestResponse('Ошибка: ' + result.error);
      }
    } catch (err) {
      console.error('Chat test failed:', err);
      setTestResponse('Ошибка связи с сервером');
    } finally {
      setTestLoading(false);
    }
  };

  // Fetch prompt templates
  const fetchTemplates = async () => {
    try {
      setTemplatesLoading(true);
      const response = await fetch('/api/templates');
      const result = await response.json();
      if (result.success) {
        setTemplates(result.templates);
      }
    } catch (err) {
      console.error('Failed to fetch templates:', err);
    } finally {
      setTemplatesLoading(false);
    }
  };

  // Apply template to AI settings
  const applyTemplate = async (templateId: string) => {
    try {
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId }),
      });
      const result = await response.json();
      if (result.success && result.template && aiSettings) {
        setAiSettings({
          ...aiSettings,
          systemPrompt: result.template.systemPrompt,
          greeting: result.template.greeting,
          temperature: result.template.suggestedTemperature,
        });
        setAiSettingsMessage('Шаблон применён! Не забудьте сохранить.');
        setTimeout(() => setAiSettingsMessage(null), 3000);
      }
    } catch (err) {
      console.error('Failed to apply template:', err);
    }
  };

  // Upload document file
  const uploadFile = async (file: File) => {
    if (!data?.client.clientId) return;
    try {
      setUploadingFile(true);
      setUploadMessage(null);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('clientId', data.client.clientId);

      const response = await fetch('/api/knowledge/upload', {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();

      if (result.success) {
        setUploadMessage(`✅ ${result.metadata.filename}: ${result.chunksCreated} чанков добавлено`);
        fetchKnowledge();
      } else {
        setUploadMessage(`❌ Ошибка: ${result.error}`);
      }
    } catch (err) {
      console.error('Failed to upload file:', err);
      setUploadMessage('❌ Ошибка загрузки файла');
    } finally {
      setUploadingFile(false);
    }
  };

  // Fetch chat logs
  const fetchChatLogs = async () => {
    if (!data?.client.clientId) return;
    try {
      setChatLogsLoading(true);
      const response = await fetch(`/api/chat-logs?clientId=${data.client.clientId}&limit=50`);
      const result = await response.json();
      if (result.success) {
        setChatLogs(result.logs);
      }
    } catch (err) {
      console.error('Failed to fetch chat logs:', err);
    } finally {
      setChatLogsLoading(false);
    }
  };

  // View specific chat log
  const viewChatLog = async (logId: string) => {
    try {
      const response = await fetch(`/api/chat-logs/${logId}`);
      const result = await response.json();
      if (result.success) {
        setSelectedLog(result.log);
      }
    } catch (err) {
      console.error('Failed to fetch chat log:', err);
    }
  };

  // Load templates when AI settings tab is active
  useEffect(() => {
    if (activeTab === 'ai-settings' && templates.length === 0) {
      fetchTemplates();
    }
    if (activeTab === 'history' && data?.client.clientId) {
      fetchChatLogs();
    }
  }, [activeTab]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-animated flex items-center justify-center">
        <div className="glass-card p-8 text-center">
          <div className="w-16 h-16 border-4 border-[var(--neon-cyan)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading client data...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-animated flex items-center justify-center">
        <div className="glass-card p-8 text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Error</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <button onClick={() => router.push('/admin')} className="neon-button">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const { client, files } = data;
  const startDate = new Date(client.startDate);
  const daysActive = Math.floor((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const daysUntilPayment = 30 - (daysActive % 30);
  const scriptUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/widgets/${client.folderPath}/script.js`;

  const tabs: { id: TabType; label: string; icon?: string }[] = [
    { id: 'info', label: 'Info' },
    { id: 'ai-settings', label: 'AI Settings', icon: '🤖' },
    { id: 'knowledge', label: 'Knowledge', icon: '📚' },
    { id: 'history', label: 'History', icon: '💬' },
    { id: 'files', label: 'Files' },
    { id: 'usage', label: 'Usage' },
    { id: 'demo', label: 'Demo' },
  ];

  return (
    <div className="min-h-screen bg-gradient-animated">
      {/* Header */}
      <header className="sticky top-0 z-50 glass-card border-0 border-b border-white/10 rounded-none">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin" className="text-gray-400 hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--neon-cyan)] to-[var(--neon-purple)] flex items-center justify-center">
                <span className="text-black font-bold">{client.username.charAt(0).toUpperCase()}</span>
              </div>
              <div>
                <h1 className="text-xl font-bold gradient-text">{client.username}</h1>
                <p className="text-xs text-gray-400">{client.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <span className="px-4 py-2 text-sm rounded-full bg-[var(--neon-cyan)]/10 text-[var(--neon-cyan)] border border-[var(--neon-cyan)]/30">
                Active
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="glass-card p-6 stat-card">
            <p className="text-gray-400 text-sm mb-1">Total Requests</p>
            <p className="text-3xl font-bold text-[var(--neon-cyan)]">
              {client.requests.toLocaleString()}
            </p>
          </div>
          <div className="glass-card p-6 stat-card">
            <p className="text-gray-400 text-sm mb-1">Tokens Used</p>
            <p className="text-3xl font-bold text-[var(--neon-purple)]">
              {client.tokens.toLocaleString()}
            </p>
          </div>
          <div className="glass-card p-6 stat-card">
            <p className="text-gray-400 text-sm mb-1">Days Active</p>
            <p className="text-3xl font-bold text-[var(--neon-pink)]">{daysActive}</p>
          </div>
          <div className="glass-card p-6 stat-card">
            <p className="text-gray-400 text-sm mb-1">Knowledge Chunks</p>
            <p className="text-3xl font-bold gradient-text">{knowledgeChunks.length}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="glass-card mb-6">
          <div className="flex border-b border-white/10 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-4 font-medium transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === tab.id
                  ? 'text-[var(--neon-cyan)] border-b-2 border-[var(--neon-cyan)]'
                  : 'text-gray-400 hover:text-white'
                  }`}
              >
                {tab.icon && <span>{tab.icon}</span>}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* AI Settings Tab */}
        {activeTab === 'ai-settings' && (
          <div className="space-y-6">
            {aiSettingsLoading ? (
              <div className="glass-card p-8 text-center">
                <div className="w-8 h-8 border-2 border-[var(--neon-cyan)] border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : aiSettings ? (
              <>
                {/* Template Selector */}
                <div className="glass-card p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <span>📋</span> Шаблоны промптов
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    {templates.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => applyTemplate(template.id)}
                        className="p-3 bg-white/5 hover:bg-white/10 rounded-lg text-center transition-colors border border-transparent hover:border-[var(--neon-cyan)]/30"
                      >
                        <span className="text-2xl block mb-1">{template.icon}</span>
                        <span className="text-xs text-gray-300">{template.name}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-3">
                    Выберите шаблон для быстрой настройки. Это заполнит промпт и приветствие.
                  </p>
                </div>

                <div className="glass-card p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <span>🤖</span> System Prompt
                  </h3>
                  <textarea
                    value={aiSettings.systemPrompt}
                    onChange={(e) => setAiSettings({ ...aiSettings, systemPrompt: e.target.value })}
                    className="w-full h-40 bg-black/30 border border-white/10 rounded-lg p-4 text-white font-mono text-sm focus:border-[var(--neon-cyan)] focus:outline-none resize-none"
                    placeholder="Инструкции для AI-ассистента..."
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Опишите роль бота, тон общения и правила поведения.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">💬 Приветствие</h3>
                    <input
                      type="text"
                      value={aiSettings.greeting}
                      onChange={(e) => setAiSettings({ ...aiSettings, greeting: e.target.value })}
                      className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:border-[var(--neon-cyan)] focus:outline-none"
                      placeholder="Привет! Чем могу помочь?"
                    />
                  </div>

                  <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">🎨 Креативность</h3>
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
                      <span className="text-[var(--neon-cyan)] font-mono w-12 text-right">
                        {aiSettings.temperature.toFixed(1)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      0 = точные ответы, 1 = более творческие
                    </p>
                  </div>

                  <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">📊 Макс. токенов ответа</h3>
                    <input
                      type="number"
                      value={aiSettings.maxTokens}
                      onChange={(e) => setAiSettings({ ...aiSettings, maxTokens: parseInt(e.target.value) || 1024 })}
                      className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:border-[var(--neon-cyan)] focus:outline-none"
                      min="100"
                      max="4096"
                    />
                  </div>

                  <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">🔍 Кол-во контекста (Top-K)</h3>
                    <input
                      type="number"
                      value={aiSettings.topK}
                      onChange={(e) => setAiSettings({ ...aiSettings, topK: parseInt(e.target.value) || 3 })}
                      className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:border-[var(--neon-cyan)] focus:outline-none"
                      min="1"
                      max="10"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Сколько кусочков знаний использовать для ответа
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <button
                    onClick={saveAISettings}
                    disabled={aiSettingsSaving}
                    className="neon-button disabled:opacity-50"
                  >
                    {aiSettingsSaving ? 'Сохранение...' : 'Сохранить настройки'}
                  </button>
                  {aiSettingsMessage && (
                    <span className="text-[var(--neon-cyan)]">{aiSettingsMessage}</span>
                  )}
                </div>

                {/* Test Chat */}
                <div className="glass-card p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">🧪 Тест чата</h3>
                  <div className="flex gap-4 mb-4">
                    <input
                      type="text"
                      value={testMessage}
                      onChange={(e) => setTestMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && testChat()}
                      className="flex-1 bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:border-[var(--neon-cyan)] focus:outline-none"
                      placeholder="Задайте вопрос для теста..."
                    />
                    <button
                      onClick={testChat}
                      disabled={testLoading}
                      className="neon-button disabled:opacity-50"
                    >
                      {testLoading ? '...' : 'Отправить'}
                    </button>
                  </div>
                  {testResponse && (
                    <div className="bg-black/30 rounded-lg p-4 text-gray-300">
                      {testResponse}
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* Knowledge Base Tab */}
        {activeTab === 'knowledge' && (
          <div className="space-y-6">
            {/* File Upload */}
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span>📄</span> Загрузить документ
              </h3>
              <div
                className="border-2 border-dashed border-white/20 rounded-lg p-8 text-center hover:border-[var(--neon-cyan)]/50 transition-colors cursor-pointer"
                onClick={() => document.getElementById('fileInput')?.click()}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
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
                  <div className="w-8 h-8 border-2 border-[var(--neon-cyan)] border-t-transparent rounded-full animate-spin mx-auto" />
                ) : (
                  <>
                    <span className="text-4xl block mb-2">📁</span>
                    <p className="text-gray-400">Перетащите файл сюда или нажмите для выбора</p>
                    <p className="text-xs text-gray-500 mt-2">PDF, DOCX, TXT, MD</p>
                  </>
                )}
              </div>
              {uploadMessage && (
                <p className="text-sm mt-3 text-center">{uploadMessage}</p>
              )}
            </div>

            {/* Add Knowledge */}
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span>➕</span> Добавить знания
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Источник (опционально)</label>
                  <input
                    type="text"
                    value={newKnowledgeSource}
                    onChange={(e) => setNewKnowledgeSource(e.target.value)}
                    className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:border-[var(--neon-cyan)] focus:outline-none"
                    placeholder="FAQ, Сайт, Документ..."
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Текст</label>
                  <textarea
                    value={newKnowledgeText}
                    onChange={(e) => setNewKnowledgeText(e.target.value)}
                    className="w-full h-32 bg-black/30 border border-white/10 rounded-lg p-4 text-white focus:border-[var(--neon-cyan)] focus:outline-none resize-none"
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
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span>📚</span> База знаний ({knowledgeChunks.length} записей)
              </h3>
              {knowledgeLoading ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-2 border-[var(--neon-cyan)] border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
              ) : knowledgeChunks.length > 0 ? (
                <div className="space-y-3">
                  {knowledgeChunks.map((chunk) => (
                    <div
                      key={chunk._id}
                      className="bg-white/5 rounded-lg p-4 hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-300 text-sm line-clamp-2">{chunk.text}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-gray-500 bg-white/10 px-2 py-1 rounded">
                              {chunk.source}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(chunk.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => deleteKnowledge(chunk._id)}
                          className="text-red-400 hover:text-red-300 transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-center py-8">
                  База знаний пуста. Добавьте информацию выше.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Chat History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span>💬</span> История чатов ({chatLogs.length})
              </h3>
              {chatLogsLoading ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-2 border-[var(--neon-cyan)] border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
              ) : chatLogs.length > 0 ? (
                <div className="space-y-3">
                  {chatLogs.map((log) => (
                    <button
                      key={log._id}
                      onClick={() => viewChatLog(log._id)}
                      className="w-full text-left bg-white/5 rounded-lg p-4 hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white font-medium">
                            Сессия: {log.sessionId.slice(0, 12)}...
                          </p>
                          <p className="text-sm text-gray-400 mt-1">
                            {log.messageCount} сообщений • {new Date(log.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <span className="text-gray-500">→</span>
                      </div>
                      {log.lastMessage && (
                        <p className="text-xs text-gray-500 mt-2 truncate">
                          Последнее: {log.lastMessage}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-center py-8">
                  Нет истории чатов. Диалоги появятся после первых сообщений виджета.
                </p>
              )}
            </div>

            {/* Selected Chat Modal */}
            {selectedLog && (
              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Детали диалога</h3>
                  <button
                    onClick={() => setSelectedLog(null)}
                    className="text-gray-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {selectedLog.messages.map((msg, i) => (
                    <div
                      key={i}
                      className={`p-3 rounded-lg ${msg.role === 'user'
                          ? 'bg-[var(--neon-cyan)]/10 ml-8'
                          : 'bg-white/5 mr-8'
                        }`}
                    >
                      <p className="text-xs text-gray-500 mb-1">
                        {msg.role === 'user' ? 'Пользователь' : 'Бот'} • {new Date(msg.timestamp).toLocaleTimeString()}
                      </p>
                      <p className="text-gray-300 text-sm">{msg.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Info Tab */}
        {activeTab === 'info' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Contact Information */}
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-[var(--neon-cyan)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Contact Information
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-400">Username</label>
                  <p className="text-white">{client.username}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Email</label>
                  <p className="text-white">{client.email}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Website</label>
                  <a
                    href={client.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--neon-cyan)] hover:underline block"
                  >
                    {client.website}
                  </a>
                </div>
                {client.phone && (
                  <div>
                    <label className="text-sm text-gray-400">Phone</label>
                    <p className="text-white">{client.phone}</p>
                  </div>
                )}
                {client.instagram && (
                  <div>
                    <label className="text-sm text-gray-400">Instagram</label>
                    <a
                      href={`https://instagram.com/${client.instagram}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--neon-pink)] hover:underline block"
                    >
                      @{client.instagram}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Widget Integration */}
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-[var(--neon-purple)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                Widget Integration
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Script URL</label>
                  <div className="bg-black/30 rounded-lg p-3 font-mono text-sm text-[var(--neon-cyan)] break-all">
                    {scriptUrl}
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Embed Code</label>
                  <div className="bg-black/30 rounded-lg p-3 font-mono text-sm text-gray-300 overflow-x-auto">
                    <pre>{`<script src="${scriptUrl}"></script>`}</pre>
                  </div>
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText(scriptUrl)}
                  className="neon-button w-full"
                >
                  Copy Script URL
                </button>
              </div>
            </div>

            {/* Subscription Info */}
            <div className="glass-card p-6 lg:col-span-2">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-[var(--neon-pink)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Subscription Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                  <label className="text-sm text-gray-400">Start Date</label>
                  <p className="text-white">{startDate.toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Next Payment</label>
                  <p className="text-white">
                    {new Date(Date.now() + daysUntilPayment * 24 * 60 * 60 * 1000).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Client ID</label>
                  <p className="text-white font-mono text-sm">{client.clientId}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Client Token</label>
                  <div className="flex items-center gap-2">
                    <p className="text-[var(--neon-cyan)] font-mono text-sm truncate">{client.clientToken}</p>
                    <button
                      onClick={() => navigator.clipboard.writeText(client.clientToken)}
                      className="text-gray-400 hover:text-white transition-colors"
                      title="Copy token"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'files' && (
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Widget Files</h3>
            <div className="space-y-2">
              {files.length > 0 ? (
                files.map((file) => (
                  <div
                    key={file}
                    className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-[var(--neon-cyan)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="text-gray-300 font-mono text-sm">{file}</span>
                    </div>
                    <a
                      href={`/widgets/${client.folderPath}/${file}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--neon-cyan)] hover:underline text-sm"
                    >
                      View
                    </a>
                  </div>
                ))
              ) : (
                <p className="text-gray-400 text-center py-8">No files found</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'usage' && (
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Usage Statistics</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white/5 rounded-lg p-6">
                <h4 className="text-sm text-gray-400 mb-2">Requests Over Time</h4>
                <div className="h-48 flex items-end justify-around gap-2">
                  {[40, 65, 45, 80, 55, 90, 70].map((height, i) => (
                    <div
                      key={i}
                      className="w-full bg-gradient-to-t from-[var(--neon-cyan)] to-[var(--neon-purple)] rounded-t"
                      style={{ height: `${height}%` }}
                    />
                  ))}
                </div>
                <div className="flex justify-around mt-2 text-xs text-gray-500">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                    <span key={day}>{day}</span>
                  ))}
                </div>
              </div>
              <div className="bg-white/5 rounded-lg p-6">
                <h4 className="text-sm text-gray-400 mb-4">Token Usage</h4>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-400">Used</span>
                      <span className="text-white">{client.tokens.toLocaleString()} tokens</span>
                    </div>
                    <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[var(--neon-cyan)] to-[var(--neon-purple)] rounded-full"
                        style={{ width: `${Math.min((client.tokens / 100000) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-sm text-gray-400">
                    Avg per request: {client.requests > 0 ? Math.round(client.tokens / client.requests) : 0} tokens
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'demo' && (
          <div>
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-white mb-2">Live Demo Templates</h3>
              <p className="text-gray-400">Preview how your widget looks on different website templates</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {demoTemplates.map((template) => {
                const href = template.isClientSite
                  ? `/demo/${template.id}?client=${client.clientId}&website=${encodeURIComponent(client.website)}`
                  : `/demo/${template.id}?client=${client.clientId}`;

                return (
                  <Link
                    key={template.id}
                    href={href}
                    className="group"
                  >
                    <div className={`glass-card overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl ${template.isClientSite ? 'hover:shadow-green-500/20 ring-2 ring-green-500/30' : 'hover:shadow-[var(--neon-cyan)]/20'}`}>
                      <div className="relative h-48 overflow-hidden">
                        <Image
                          src={template.image}
                          alt={template.name}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        <div className={`absolute inset-0 bg-gradient-to-t ${template.gradient} opacity-60`} />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-6xl">{template.icon}</span>
                        </div>
                        <div className={`absolute top-3 right-3 px-3 py-1 backdrop-blur-sm rounded-full text-xs text-white ${template.isClientSite ? 'bg-green-500/70' : 'bg-black/50'}`}>
                          {template.isClientSite ? 'Your Website' : 'Live Preview'}
                        </div>
                      </div>
                      <div className="p-5">
                        <h4 className={`text-lg font-semibold text-white mb-1 transition-colors ${template.isClientSite ? 'group-hover:text-green-400' : 'group-hover:text-[var(--neon-cyan)]'}`}>
                          {template.name}
                        </h4>
                        <p className="text-sm text-gray-400 mb-2">{template.description}</p>
                        {template.isClientSite && (
                          <p className="text-xs text-green-400/70 mb-2 truncate">{client.website}</p>
                        )}
                        <div className={`flex items-center text-sm font-medium ${template.isClientSite ? 'text-green-400' : 'text-[var(--neon-cyan)]'}`}>
                          <span>Open Demo</span>
                          <svg className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
