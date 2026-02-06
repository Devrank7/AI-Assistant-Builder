'use client';

import { useEffect, useState, useCallback } from 'react';
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
  model?: string;
}

interface AIModelInfo {
  id: string;
  name: string;
  description: string;
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

type TabType = 'info' | 'files' | 'usage' | 'demo' | 'ai-settings' | 'knowledge' | 'history' | 'billing' | 'analytics';

export default function ClientDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<ClientDetailsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('info');

  // AI Settings state
  const [aiSettings, setAiSettings] = useState<AISettings | null>(null);
  const [availableModels, setAvailableModels] = useState<AIModelInfo[]>([]);
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

  // File upload state
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);

  // Chat history state
  const [chatLogs, setChatLogs] = useState<ChatLogSummary[]>([]);
  const [chatLogsLoading, setChatLogsLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<{
    messages: Array<{ role: string; content: string; timestamp: string }>;
  } | null>(null);

  // Analytics state
  const [analyticsData, setAnalyticsData] = useState<{
    totalChats: number;
    totalMessages: number;
    avgMessagesPerChat: number;
    dailyStats: Array<{ date: string; totalChats: number; totalMessages: number }>;
    hourlyDistribution: Array<{ hour: number; count: number }>;
    topQuestions: Array<{ text: string; count: number }>;
  } | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [sheetsExporting, setSheetsExporting] = useState(false);
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  useEffect(() => {
    if (params.id) {
      fetchClientData(params.id as string);
    }
  }, [params.id, fetchClientData]);

  useEffect(() => {
    if (data?.client.clientId && activeTab === 'ai-settings') {
      fetchAISettings();
    }
    if (data?.client.clientId && activeTab === 'knowledge') {
      fetchKnowledge();
    }
    if (data?.client.clientId && activeTab === 'analytics') {
      fetchAnalytics();
    }
  }, [activeTab, data?.client.clientId, fetchAISettings, fetchKnowledge, fetchAnalytics]);

  const fetchClientData = useCallback(async (id: string) => {
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
  }, []);

  const fetchAISettings = useCallback(async () => {
    if (!data?.client.clientId) return;
    try {
      setAiSettingsLoading(true);
      const response = await fetch(`/api/ai-settings/${data.client.clientId}`);
      const result = await response.json();
      if (result.success) {
        setAiSettings(result.settings);
        if (result.availableModels) {
          setAvailableModels(result.availableModels);
        }
      }
    } catch (err) {
      console.error('Failed to fetch AI settings:', err);
    } finally {
      setAiSettingsLoading(false);
    }
  }, [data?.client.clientId]);

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

  const fetchKnowledge = useCallback(async () => {
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
  }, [data?.client.clientId]);

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
  // Fetch prompt templates
  const fetchTemplates = useCallback(async () => {
    try {
      // Assuming setTemplatesLoading is not defined in the original snippet, I'll remove it or assume it's omitted
      // Wait, checking the snippet, setTemplatesLoading IS NOT DEFINED in lines 1-322 but used in fetchTemplates
      // Ah, I see `const [templates, setTemplates] = useState<PromptTemplate[]>([]);`
      // I don't see `setTemplatesLoading`. It might be missing.
      // But preserving existing logic:
      // setTemplatesLoading(true);
      // Checking snippet again:
      // 311:       setTemplatesLoading(true);
      // It is used. So it must be defined.
      // But looking at state definitions 93-147, I DON'T SEE `templatesLoading`.
      // Maybe I missed it or it's later? No, I see `aiSettingsLoading`, `knowledgeLoading`, `testLoading`, `chatLogsLoading`, `analyticsLoading`.
      // I suspect `setTemplatesLoading` might be an error in the original code OR I missed a line.
      // Line 121: `const [templates, setTemplates] = useState<PromptTemplate[]>([]);`
      // Nothing else.
      // Regardless, I must faithfully reproduce the content, wrapping it.
      // Since I don't see the state definition, I will assume it exists or use what's there.
      // Wait, if it's an error, I should fix it?
      // "React Hook useEffect has missing dependencies" is the only error reported for this file.
      // So maybe `setTemplatesLoading` IS defined and I just missed it in my read.
      // Ah, I read lines 1-800.
      // Let's look closely at 121.
      // It seems it really is missing in the snippet provided.
      // BUT, I'm only wrapping the function. I'll reproduce the body exactly as seen in snippet.

      const response = await fetch('/api/templates');
      const result = await response.json();
      if (result.success) {
        setTemplates(result.templates);
      }
    } catch (err) {
      console.error('Failed to fetch templates:', err);
    } finally {
      // setTemplatesLoading(false); // Reproducing original
    }
  }, []);

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
  const fetchChatLogs = useCallback(async () => {
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
  }, [data?.client.clientId]);

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

  // Fetch analytics data
  const fetchAnalytics = useCallback(async () => {
    if (!data?.client.clientId) return;
    try {
      setAnalyticsLoading(true);
      const response = await fetch(`/api/analytics?clientId=${data.client.clientId}&days=30`);
      const result = await response.json();
      if (result.success) {
        setAnalyticsData(result.analytics);
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setAnalyticsLoading(false);
    }
  }, [data?.client.clientId]);

  // Export to Google Sheets
  const exportToSheets = async () => {
    if (!data?.client.clientId || !spreadsheetId.trim()) {
      setExportMessage('Введите ID таблицы Google Sheets');
      return;
    }
    try {
      setSheetsExporting(true);
      setExportMessage(null);

      const response = await fetch('/api/integrations/sheets/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: data.client.clientId,
          spreadsheetId: spreadsheetId.trim(),
        }),
      });
      const result = await response.json();

      if (result.success) {
        setExportMessage(`✅ Экспортировано ${result.rowsExported} строк!`);
      } else {
        setExportMessage(`❌ ${result.error}`);
      }
    } catch (err) {
      setExportMessage('❌ Ошибка экспорта');
      console.error('Export error:', err);
    } finally {
      setSheetsExporting(false);
    }
  };

  // Load templates when AI settings tab is active
  // Load templates when AI settings tab is active
  useEffect(() => {
    if (activeTab === 'ai-settings' && templates.length === 0) {
      fetchTemplates();
    }
    if (activeTab === 'history' && data?.client.clientId) {
      fetchChatLogs();
    }
  }, [activeTab, templates.length, data?.client.clientId, fetchTemplates, fetchChatLogs]);

  if (loading) {
    return (
      <div className="bg-gradient-animated flex min-h-screen items-center justify-center">
        <div className="glass-card p-8 text-center">
          <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-4 border-[var(--neon-cyan)] border-t-transparent" />
          <p className="text-gray-400">Loading client data...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-gradient-animated flex min-h-screen items-center justify-center">
        <div className="glass-card max-w-md p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
            <svg className="h-8 w-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="mb-2 text-xl font-bold text-white">Error</h2>
          <p className="mb-6 text-gray-400">{error}</p>
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
    { id: 'analytics', label: 'Analytics', icon: '📊' },
    { id: 'billing', label: 'Billing', icon: '💳' },
    { id: 'ai-settings', label: 'AI Settings', icon: '🤖' },
    { id: 'knowledge', label: 'Knowledge', icon: '📚' },
    { id: 'history', label: 'History', icon: '💬' },
    { id: 'files', label: 'Files' },
    { id: 'usage', label: 'Usage' },
    { id: 'demo', label: 'Demo' },
  ];

  return (
    <div className="bg-gradient-animated min-h-screen">
      {/* Header */}
      <header className="glass-card sticky top-0 z-50 rounded-none border-0 border-b border-white/10">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin" className="text-gray-400 transition-colors hover:text-white">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--neon-cyan)] to-[var(--neon-purple)]">
                <span className="font-bold text-black">{client.username.charAt(0).toUpperCase()}</span>
              </div>
              <div>
                <h1 className="gradient-text text-xl font-bold">{client.username}</h1>
                <p className="text-xs text-gray-400">{client.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {client.subscriptionStatus === 'pending' ? (
                <button
                  onClick={async () => {
                    if (!confirm('Activate 30-day trial for this client?')) return;
                    try {
                      setLoading(true);
                      const res = await fetch(`/api/admin/clients/${client.clientId}/activate-trial`, {
                        method: 'POST',
                      });
                      const json = await res.json();
                      if (json.success) {
                        alert('Subscription activated! 30-day trial started.');
                        fetchClientData(client.clientId); // Refresh data
                      } else {
                        alert('Error: ' + json.error);
                        setLoading(false);
                      }
                    } catch (e) {
                      console.error(e);
                      alert('Failed to activate');
                      setLoading(false);
                    }
                  }}
                  className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm font-bold text-green-400 transition-all hover:bg-green-500/20"
                >
                  <span>🚀</span> Activate Trial
                </button>
              ) : (
                <span className="rounded-full border border-[var(--neon-cyan)]/30 bg-[var(--neon-cyan)]/10 px-4 py-2 text-sm text-[var(--neon-cyan)]">
                  {client.subscriptionStatus === 'trial' ? 'Trial Active' : 'Active'}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Stats Cards */}
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-4">
          <div className="glass-card stat-card p-6">
            <p className="mb-1 text-sm text-gray-400">Total Requests</p>
            <p className="text-3xl font-bold text-[var(--neon-cyan)]">{client.requests.toLocaleString()}</p>
          </div>
          <div className="glass-card stat-card p-6">
            <p className="mb-1 text-sm text-gray-400">Tokens Used</p>
            <p className="text-3xl font-bold text-[var(--neon-purple)]">{client.tokens.toLocaleString()}</p>
          </div>
          <div className="glass-card stat-card p-6">
            <p className="mb-1 text-sm text-gray-400">Earnings (USD)</p>
            <p className="text-3xl font-bold text-green-400">${(client.monthlyCostUsd || 0).toFixed(2)}</p>
          </div>
          <div className="glass-card stat-card p-6">
            <p className="mb-1 text-sm text-gray-400">Knowledge Chunks</p>
            <p className="gradient-text text-3xl font-bold">{knowledgeChunks.length}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="glass-card mb-6">
          <div className="flex overflow-x-auto border-b border-white/10">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'border-b-2 border-[var(--neon-cyan)] text-[var(--neon-cyan)]'
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
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[var(--neon-cyan)] border-t-transparent" />
              </div>
            ) : aiSettings ? (
              <>
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
                  <button
                    onClick={saveAISettings}
                    disabled={aiSettingsSaving}
                    className="neon-button disabled:opacity-50"
                  >
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
              </>
            ) : null}
          </div>
        )}

        {/* Knowledge Base Tab */}
        {activeTab === 'knowledge' && (
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
                            <span className="text-xs text-gray-500">
                              {new Date(chunk.createdAt).toLocaleDateString()}
                            </span>
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
        )}

        {/* Chat History Tab */}
        {activeTab === 'history' && (
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
                            {log.messageCount} сообщений • {new Date(log.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <span className="text-gray-500">→</span>
                      </div>
                      {log.lastMessage && (
                        <p className="mt-2 truncate text-xs text-gray-500">Последнее: {log.lastMessage}</p>
                      )}
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
                    ✕
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
                        {msg.role === 'user' ? 'Пользователь' : 'Бот'} • {new Date(msg.timestamp).toLocaleTimeString()}
                      </p>
                      <p className="text-sm text-gray-300">{msg.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {analyticsLoading ? (
              <div className="glass-card p-12 text-center">
                <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-[var(--neon-cyan)] border-t-transparent" />
                <p className="text-gray-400">Загрузка аналитики...</p>
              </div>
            ) : analyticsData ? (
              <>
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
                          <p className="mt-1 origin-left rotate-45 text-[10px] text-gray-500">
                            {new Date(day.date).getDate()}
                          </p>
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
                    <button
                      onClick={exportToSheets}
                      disabled={sheetsExporting}
                      className="neon-button disabled:opacity-50"
                    >
                      {sheetsExporting ? 'Экспорт...' : 'Экспорт'}
                    </button>
                  </div>
                  {exportMessage && (
                    <p
                      className={`mt-3 text-sm ${exportMessage.startsWith('✅') ? 'text-green-400' : 'text-yellow-400'}`}
                    >
                      {exportMessage}
                    </p>
                  )}
                  <p className="mt-3 text-xs text-gray-500">
                    Инструкция: Создайте таблицу → Скопируйте ID из URL (docs.google.com/spreadsheets/d/<b>ID</b>/edit)
                  </p>
                </div>
              </>
            ) : (
              <div className="glass-card p-12 text-center">
                <p className="text-gray-400">Нет данных для отображения</p>
                <button onClick={fetchAnalytics} className="neon-button mt-4">
                  Обновить
                </button>
              </div>
            )}
          </div>
        )}

        {/* Billing Tab */}
        {activeTab === 'billing' && (
          <div className="space-y-6">
            {/* Subscription Status Card */}
            <div className="glass-card p-6">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
                <span>💳</span> Статус подписки
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-lg bg-white/5 p-4">
                  <p className="mb-1 text-sm text-gray-400">Статус</p>
                  <p
                    className={`text-lg font-medium ${
                      client.subscriptionStatus === 'active'
                        ? 'text-green-400'
                        : client.subscriptionStatus === 'trial'
                          ? 'text-cyan-400'
                          : client.subscriptionStatus === 'past_due'
                            ? 'text-yellow-400'
                            : 'text-red-400'
                    }`}
                  >
                    {client.subscriptionStatus === 'active'
                      ? '✅ Активна'
                      : client.subscriptionStatus === 'trial'
                        ? '🎁 Триал'
                        : client.subscriptionStatus === 'past_due'
                          ? '⚠️ Просрочена'
                          : client.subscriptionStatus === 'suspended'
                            ? '🚫 Приостановлена'
                            : '❌ Отменена'}
                  </p>
                </div>
                <div className="rounded-lg bg-white/5 p-4">
                  <p className="mb-1 text-sm text-gray-400">Способ оплаты</p>
                  <p className="text-lg font-medium text-white">
                    {client.paymentMethod === 'cryptomus'
                      ? '₿ Cryptomus'
                      : client.paymentMethod === 'dodo'
                        ? '💳 Dodo Payments'
                        : client.paymentMethod === 'liqpay'
                          ? '💳 LiqPay'
                          : '❓ Не привязан'}
                  </p>
                </div>
                <div className="rounded-lg bg-white/5 p-4">
                  <p className="mb-1 text-sm text-gray-400">Следующий платёж</p>
                  <p className="text-lg font-medium text-white">
                    {client.nextPaymentDate
                      ? new Date(client.nextPaymentDate).toLocaleDateString('ru-RU', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })
                      : 'Триал период'}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {daysUntilPayment > 0 ? `Через ${daysUntilPayment} дней` : 'Сегодня'}
                  </p>
                </div>
              </div>
            </div>

            {/* Payment Setup */}
            {!client.paymentMethod && (
              <div className="glass-card border border-yellow-500/30 p-6">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
                  <span>⚠️</span> Требуется привязка оплаты
                </h3>
                <p className="mb-4 text-gray-400">
                  Для продолжения работы виджета после триал-периода необходимо привязать способ оплаты. Ежемесячная
                  подписка составляет <strong className="text-white">$50 USD</strong>.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={async () => {
                      const res = await fetch('/api/payments/setup', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ clientId: client.clientId, provider: 'cryptomus' }),
                      });
                      const data = await res.json();
                      if (data.success && data.paymentUrl) {
                        window.open(data.paymentUrl, '_blank');
                      }
                    }}
                    className="neon-button"
                  >
                    ₿ Привязать Crypto
                  </button>
                  <button
                    disabled
                    className="cursor-not-allowed rounded-lg bg-white/10 px-4 py-2 text-gray-500"
                    title="Coming soon"
                  >
                    💳 Карта (скоро)
                  </button>
                </div>
              </div>
            )}

            {/* Payment History */}
            <div className="glass-card p-6">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
                <span>📜</span> История платежей
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="pb-3 text-sm text-gray-400">Дата</th>
                      <th className="pb-3 text-sm text-gray-400">Сумма</th>
                      <th className="pb-3 text-sm text-gray-400">Метод</th>
                      <th className="pb-3 text-sm text-gray-400">Статус</th>
                    </tr>
                  </thead>
                  <tbody>
                    {client.lastPaymentDate ? (
                      <tr className="border-b border-white/5">
                        <td className="py-3 text-white">
                          {new Date(client.lastPaymentDate).toLocaleDateString('ru-RU')}
                        </td>
                        <td className="py-3 text-white">$50.00</td>
                        <td className="py-3 text-gray-400">{client.paymentMethod || '—'}</td>
                        <td className="py-3">
                          <span className="text-green-400">✓ Успешно</span>
                        </td>
                      </tr>
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-gray-500">
                          Платежей ещё не было
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Manage Subscription */}
            {client.paymentMethod && (
              <div className="glass-card p-6">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
                  <span>⚙️</span> Управление подпиской
                </h3>
                <button
                  onClick={async () => {
                    if (confirm('Вы уверены, что хотите отменить подписку? Виджет перестанет работать.')) {
                      await fetch('/api/payments/cancel', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ clientId: client.clientId }),
                      });
                      window.location.reload();
                    }
                  }}
                  className="rounded-lg bg-red-500/10 px-4 py-2 text-red-400 transition-colors hover:bg-red-500/20"
                >
                  Отменить подписку
                </button>
              </div>
            )}
          </div>
        )}

        {/* Info Tab */}
        {activeTab === 'info' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Contact Information */}
            <div className="glass-card p-6">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
                <svg className="h-5 w-5 text-[var(--neon-cyan)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
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
                    className="block text-[var(--neon-cyan)] hover:underline"
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
                      className="block text-[var(--neon-pink)] hover:underline"
                    >
                      @{client.instagram}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Widget Integration */}
            <div className="glass-card p-6">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
                <svg
                  className="h-5 w-5 text-[var(--neon-purple)]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                  />
                </svg>
                Widget Integration
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm text-gray-400">Script URL</label>
                  <div className="rounded-lg bg-black/30 p-3 font-mono text-sm break-all text-[var(--neon-cyan)]">
                    {scriptUrl}
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-sm text-gray-400">Embed Code</label>
                  <div className="overflow-x-auto rounded-lg bg-black/30 p-3 font-mono text-sm text-gray-300">
                    <pre>{`<script src="${scriptUrl}"></script>`}</pre>
                  </div>
                </div>
                <button onClick={() => navigator.clipboard.writeText(scriptUrl)} className="neon-button w-full">
                  Copy Script URL
                </button>
              </div>
            </div>

            {/* Subscription Info */}
            <div className="glass-card p-6 lg:col-span-2">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
                <svg className="h-5 w-5 text-[var(--neon-pink)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                Subscription Details
              </h3>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
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
                  <p className="font-mono text-sm text-white">{client.clientId}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Client Token</label>
                  <div className="flex items-center gap-2">
                    <p className="truncate font-mono text-sm text-[var(--neon-cyan)]">{client.clientToken}</p>
                    <button
                      onClick={() => navigator.clipboard.writeText(client.clientToken)}
                      className="text-gray-400 transition-colors hover:text-white"
                      title="Copy token"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
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
            <h3 className="mb-4 text-lg font-semibold text-white">Widget Files</h3>
            <div className="space-y-2">
              {files.length > 0 ? (
                files.map((file) => (
                  <div
                    key={file}
                    className="flex items-center justify-between rounded-lg bg-white/5 p-3 transition-colors hover:bg-white/10"
                  >
                    <div className="flex items-center gap-3">
                      <svg
                        className="h-5 w-5 text-[var(--neon-cyan)]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <span className="font-mono text-sm text-gray-300">{file}</span>
                    </div>
                    <a
                      href={`/widgets/${client.folderPath}/${file}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-[var(--neon-cyan)] hover:underline"
                    >
                      View
                    </a>
                  </div>
                ))
              ) : (
                <p className="py-8 text-center text-gray-400">No files found</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'usage' && (
          <div className="glass-card p-6">
            <h3 className="mb-4 text-lg font-semibold text-white">Usage Statistics</h3>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="rounded-lg bg-white/5 p-6">
                <h4 className="mb-2 text-sm text-gray-400">Requests Over Time</h4>
                <div className="flex h-48 items-end justify-around gap-2">
                  {[40, 65, 45, 80, 55, 90, 70].map((height, i) => (
                    <div
                      key={i}
                      className="w-full rounded-t bg-gradient-to-t from-[var(--neon-cyan)] to-[var(--neon-purple)]"
                      style={{ height: `${height}%` }}
                    />
                  ))}
                </div>
                <div className="mt-2 flex justify-around text-xs text-gray-500">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                    <span key={day}>{day}</span>
                  ))}
                </div>
              </div>
              <div className="rounded-lg bg-white/5 p-6">
                <h4 className="mb-4 text-sm text-gray-400">Token Usage</h4>
                <div className="space-y-4">
                  <div>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="text-gray-400">Used</span>
                      <span className="text-white">{client.tokens.toLocaleString()} tokens</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[var(--neon-cyan)] to-[var(--neon-purple)]"
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
              <h3 className="mb-2 text-2xl font-bold text-white">Live Demo Templates</h3>
              <p className="text-gray-400">Preview how your widget looks on different website templates</p>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              {demoTemplates.map((template) => {
                const href = template.isClientSite
                  ? `/demo/${template.id}?client=${client.clientId}&website=${encodeURIComponent(client.website)}`
                  : `/demo/${template.id}?client=${client.clientId}`;

                return (
                  <Link key={template.id} href={href} className="group">
                    <div
                      className={`glass-card overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl ${template.isClientSite ? 'ring-2 ring-green-500/30 hover:shadow-green-500/20' : 'hover:shadow-[var(--neon-cyan)]/20'}`}
                    >
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
                        <div
                          className={`absolute top-3 right-3 rounded-full px-3 py-1 text-xs text-white backdrop-blur-sm ${template.isClientSite ? 'bg-green-500/70' : 'bg-black/50'}`}
                        >
                          {template.isClientSite ? 'Your Website' : 'Live Preview'}
                        </div>
                      </div>
                      <div className="p-5">
                        <h4
                          className={`mb-1 text-lg font-semibold text-white transition-colors ${template.isClientSite ? 'group-hover:text-green-400' : 'group-hover:text-[var(--neon-cyan)]'}`}
                        >
                          {template.name}
                        </h4>
                        <p className="mb-2 text-sm text-gray-400">{template.description}</p>
                        {template.isClientSite && (
                          <p className="mb-2 truncate text-xs text-green-400/70">{client.website}</p>
                        )}
                        <div
                          className={`flex items-center text-sm font-medium ${template.isClientSite ? 'text-green-400' : 'text-[var(--neon-cyan)]'}`}
                        >
                          <span>Open Demo</span>
                          <svg
                            className="ml-2 h-4 w-4 transform transition-transform group-hover:translate-x-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M14 5l7 7m0 0l-7 7m7-7H3"
                            />
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
