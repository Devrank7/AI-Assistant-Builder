'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { IClient } from '@/models/Client';

// Tab components
import AISettingsTab from '@/components/admin/tabs/AISettingsTab';
import KnowledgeTab from '@/components/admin/tabs/KnowledgeTab';
import ChatHistoryTab from '@/components/admin/tabs/ChatHistoryTab';
import AnalyticsTab from '@/components/admin/tabs/AnalyticsTab';
import BillingTab from '@/components/admin/tabs/BillingTab';
import ClientInfoTab from '@/components/admin/tabs/ClientInfoTab';
import FilesTab from '@/components/admin/tabs/FilesTab';
import UsageTab from '@/components/admin/tabs/UsageTab';
import DemoTab from '@/components/admin/tabs/DemoTab';

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

  // --- Data fetching callbacks ---

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
        if (result.availableModels) setAvailableModels(result.availableModels);
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
      if (result.success) setKnowledgeChunks(result.chunks);
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
      await fetch(`/api/knowledge?id=${chunkId}&clientId=${data.client.clientId}`, { method: 'DELETE' });
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
        body: JSON.stringify({ clientId: data.client.clientId, message: testMessage }),
      });
      const result = await response.json();
      setTestResponse(result.success ? result.response : 'Ошибка: ' + result.error);
    } catch (err) {
      console.error('Chat test failed:', err);
      setTestResponse('Ошибка связи с сервером');
    } finally {
      setTestLoading(false);
    }
  };

  const fetchTemplates = useCallback(async () => {
    try {
      const response = await fetch('/api/templates');
      const result = await response.json();
      if (result.success) setTemplates(result.templates);
    } catch (err) {
      console.error('Failed to fetch templates:', err);
    }
  }, []);

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

  const uploadFile = async (file: File) => {
    if (!data?.client.clientId) return;
    try {
      setUploadingFile(true);
      setUploadMessage(null);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('clientId', data.client.clientId);
      const response = await fetch('/api/knowledge/upload', { method: 'POST', body: formData });
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

  const fetchChatLogs = useCallback(async () => {
    if (!data?.client.clientId) return;
    try {
      setChatLogsLoading(true);
      const response = await fetch(`/api/chat-logs?clientId=${data.client.clientId}&limit=50`);
      const result = await response.json();
      if (result.success) setChatLogs(result.logs);
    } catch (err) {
      console.error('Failed to fetch chat logs:', err);
    } finally {
      setChatLogsLoading(false);
    }
  }, [data?.client.clientId]);

  const viewChatLog = async (logId: string) => {
    try {
      const response = await fetch(`/api/chat-logs/${logId}`);
      const result = await response.json();
      if (result.success) setSelectedLog(result.log);
    } catch (err) {
      console.error('Failed to fetch chat log:', err);
    }
  };

  const fetchAnalytics = useCallback(async () => {
    if (!data?.client.clientId) return;
    try {
      setAnalyticsLoading(true);
      const response = await fetch(`/api/analytics?clientId=${data.client.clientId}&days=30`);
      const result = await response.json();
      if (result.success) setAnalyticsData(result.analytics);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setAnalyticsLoading(false);
    }
  }, [data?.client.clientId]);

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
        body: JSON.stringify({ clientId: data.client.clientId, spreadsheetId: spreadsheetId.trim() }),
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

  // --- Effects ---

  useEffect(() => {
    if (params.id) fetchClientData(params.id as string);
  }, [params.id, fetchClientData]);

  useEffect(() => {
    if (data?.client.clientId && activeTab === 'ai-settings') fetchAISettings();
    if (data?.client.clientId && activeTab === 'knowledge') fetchKnowledge();
    if (data?.client.clientId && activeTab === 'analytics') fetchAnalytics();
  }, [activeTab, data?.client.clientId, fetchAISettings, fetchKnowledge, fetchAnalytics]);

  useEffect(() => {
    if (activeTab === 'ai-settings' && templates.length === 0) fetchTemplates();
    if (activeTab === 'history' && data?.client.clientId) fetchChatLogs();
  }, [activeTab, templates.length, data?.client.clientId, fetchTemplates, fetchChatLogs]);

  // --- Loading & Error states ---

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
                        fetchClientData(client.clientId);
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

        {/* Tabs Navigation */}
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

        {/* Tab Content */}
        {activeTab === 'ai-settings' && (
          <AISettingsTab
            aiSettings={aiSettings}
            setAiSettings={setAiSettings}
            aiSettingsLoading={aiSettingsLoading}
            aiSettingsSaving={aiSettingsSaving}
            saveAISettings={saveAISettings}
            availableModels={availableModels}
            templates={templates}
            applyTemplate={applyTemplate}
            aiSettingsMessage={aiSettingsMessage}
            testMessage={testMessage}
            setTestMessage={setTestMessage}
            testChat={testChat}
            testLoading={testLoading}
            testResponse={testResponse}
          />
        )}

        {activeTab === 'knowledge' && (
          <KnowledgeTab
            uploadFile={uploadFile}
            uploadingFile={uploadingFile}
            uploadMessage={uploadMessage}
            newKnowledgeSource={newKnowledgeSource}
            setNewKnowledgeSource={setNewKnowledgeSource}
            newKnowledgeText={newKnowledgeText}
            setNewKnowledgeText={setNewKnowledgeText}
            addKnowledge={addKnowledge}
            addingKnowledge={addingKnowledge}
            knowledgeChunks={knowledgeChunks}
            knowledgeLoading={knowledgeLoading}
            deleteKnowledge={deleteKnowledge}
          />
        )}

        {activeTab === 'history' && (
          <ChatHistoryTab
            chatLogs={chatLogs}
            chatLogsLoading={chatLogsLoading}
            viewChatLog={viewChatLog}
            selectedLog={selectedLog}
            setSelectedLog={() => setSelectedLog(null)}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsTab
            analyticsLoading={analyticsLoading}
            analyticsData={analyticsData}
            fetchAnalytics={fetchAnalytics}
            spreadsheetId={spreadsheetId}
            setSpreadsheetId={setSpreadsheetId}
            exportToSheets={exportToSheets}
            sheetsExporting={sheetsExporting}
            exportMessage={exportMessage}
          />
        )}

        {activeTab === 'billing' && <BillingTab client={client} daysUntilPayment={daysUntilPayment} />}

        {activeTab === 'info' && (
          <ClientInfoTab
            client={client}
            scriptUrl={scriptUrl}
            startDate={startDate}
            daysUntilPayment={daysUntilPayment}
          />
        )}

        {activeTab === 'files' && <FilesTab files={files} folderPath={client.folderPath} />}

        {activeTab === 'usage' && <UsageTab tokens={client.tokens} requests={client.requests} />}

        {activeTab === 'demo' && <DemoTab clientId={client.clientId} website={client.website} />}
      </main>
    </div>
  );
}
