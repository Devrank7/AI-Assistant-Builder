'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { IClient } from '@/models/Client';
import {
  PageTransition,
  MotionList,
  MotionItem,
  AnimatedNumber,
  AnimatedTabs,
  TabContent,
  SkeletonCard,
} from '@/components/ui/motion';

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
import ProactiveTab from '@/components/admin/tabs/ProactiveTab';
import TrainingTab from '@/components/admin/tabs/TrainingTab';
import ChannelDetailTab from '@/components/admin/tabs/ChannelDetailTab';

type DetectedChannel = 'instagram' | 'whatsapp' | 'telegram-bot';

interface ChannelInfo {
  channel: DetectedChannel;
  folderExists: boolean;
  isActive: boolean;
}

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
  handoffEnabled?: boolean;
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

type TabType =
  | 'info'
  | 'files'
  | 'usage'
  | 'demo'
  | 'ai-settings'
  | 'knowledge'
  | 'history'
  | 'billing'
  | 'analytics'
  | 'proactive'
  | 'training'
  | 'channel-instagram'
  | 'channel-whatsapp'
  | 'channel-telegram';

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
    avgResponseTimeMs: number;
    satisfactionPercent: number;
    feedbackCount: number;
    dailyStats: Array<{ date: string; totalChats: number; totalMessages: number; avgResponseTimeMs: number }>;
    hourlyDistribution: Array<{ hour: number; count: number }>;
    topQuestions: Array<{ text: string; count: number }>;
    channelStats: Array<{ channel: string; count: number; percentage: number }>;
  } | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [sheetsExporting, setSheetsExporting] = useState(false);
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  // Detected channel folders state
  const [detectedChannels, setDetectedChannels] = useState<ChannelInfo[]>([]);

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

  const fetchDetectedChannels = useCallback(async () => {
    if (!data?.client.clientId) return;
    try {
      const response = await fetch(`/api/clients/${data.client.clientId}/channels`);
      const result = await response.json();
      if (result.success) {
        setDetectedChannels((result.channels || []).filter((ch: ChannelInfo) => ch.folderExists));
      }
    } catch (err) {
      console.error('Failed to fetch detected channels:', err);
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
    if (data?.client.clientId) fetchDetectedChannels();
  }, [data?.client.clientId, fetchDetectedChannels]);

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
  const isQuick = client.clientType === 'quick';
  const startDate = new Date(client.startDate);
  const daysActive = Math.floor((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const daysUntilPayment = 30 - (daysActive % 30);
  const widgetBase = isQuick ? 'quickwidgets' : 'widgets';
  const scriptUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/${widgetBase}/${client.folderPath}/script.js`;

  const CHANNEL_TAB_META: Record<DetectedChannel, { tabId: TabType; label: string; icon: string }> = {
    instagram: { tabId: 'channel-instagram', label: 'Instagram', icon: '📸' },
    whatsapp: { tabId: 'channel-whatsapp', label: 'WhatsApp', icon: '💬' },
    'telegram-bot': { tabId: 'channel-telegram', label: 'Telegram Bot', icon: '📱' },
  };

  const dynamicChannelTabs = detectedChannels.map((ch) => ({
    id: CHANNEL_TAB_META[ch.channel].tabId,
    label: CHANNEL_TAB_META[ch.channel].label,
    icon: CHANNEL_TAB_META[ch.channel].icon,
  }));

  const tabs: { id: TabType; label: string; icon?: string }[] = isQuick
    ? [
        { id: 'info', label: 'Info' },
        { id: 'ai-settings', label: 'AI Settings', icon: '🤖' },
        { id: 'knowledge', label: 'Knowledge', icon: '📚' },
        { id: 'history', label: 'History', icon: '💬' },
        { id: 'demo', label: 'Demo' },
      ]
    : [
        { id: 'info', label: 'Info' },
        { id: 'analytics', label: 'Analytics', icon: '📊' },
        { id: 'billing', label: 'Billing', icon: '💳' },
        { id: 'ai-settings', label: 'AI Settings', icon: '🤖' },
        { id: 'knowledge', label: 'Knowledge', icon: '📚' },
        { id: 'history', label: 'History', icon: '💬' },
        ...dynamicChannelTabs,
        { id: 'proactive', label: 'Proactive', icon: '🎯' },
        { id: 'training', label: 'Training', icon: '🧠' },
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
              {isQuick ? (
                <>
                  <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-sm font-medium text-amber-400">
                    Demo Widget
                  </span>
                  <button
                    onClick={async () => {
                      if (
                        !confirm(
                          'Delete this quick widget? This will remove the folder, DB record, knowledge base, and chat logs.'
                        )
                      )
                        return;
                      try {
                        const res = await fetch(`/api/clients/${client.clientId}/delete`, { method: 'DELETE' });
                        const json = await res.json();
                        if (json.success) {
                          router.push('/admin');
                        } else {
                          alert('Error: ' + json.error);
                        }
                      } catch (e) {
                        console.error(e);
                        alert('Failed to delete');
                      }
                    }}
                    className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-bold text-red-400 transition-all hover:bg-red-500/20"
                  >
                    Delete
                  </button>
                </>
              ) : client.subscriptionStatus === 'pending' ? (
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

      <PageTransition className="mx-auto max-w-7xl px-6 py-8">
        {/* Stats Cards */}
        <MotionList className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-4">
          <MotionItem className="glass-card stat-card p-6">
            <p className="mb-1 text-sm text-gray-400">Total Requests</p>
            <p className="text-3xl font-bold text-[var(--neon-cyan)]">
              <AnimatedNumber value={client.requests} />
            </p>
          </MotionItem>
          <MotionItem className="glass-card stat-card p-6">
            <p className="mb-1 text-sm text-gray-400">Tokens Used</p>
            <p className="text-3xl font-bold text-[var(--neon-purple)]">
              <AnimatedNumber value={client.tokens} />
            </p>
          </MotionItem>
          <MotionItem className="glass-card stat-card p-6">
            <p className="mb-1 text-sm text-gray-400">Earnings (USD)</p>
            <p className="text-3xl font-bold text-green-400">
              <AnimatedNumber value={client.monthlyCostUsd || 0} prefix="$" decimals={2} />
            </p>
          </MotionItem>
          <MotionItem className="glass-card stat-card p-6">
            <p className="mb-1 text-sm text-gray-400">Knowledge Chunks</p>
            <p className="gradient-text text-3xl font-bold">
              <AnimatedNumber value={knowledgeChunks.length} />
            </p>
          </MotionItem>
        </MotionList>

        {/* Tabs Navigation */}
        <AnimatedTabs
          tabs={tabs}
          activeTab={activeTab}
          onChange={(id) => setActiveTab(id as TabType)}
          className="mb-6"
        />

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
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

            {activeTab === 'billing' && (
              <BillingTab
                client={client}
                daysUntilPayment={daysUntilPayment}
                onClientUpdate={() => fetchClientData(client.clientId)}
              />
            )}

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

            {activeTab === 'proactive' && <ProactiveTab clientId={client.clientId} />}

            {activeTab === 'training' && <TrainingTab clientId={client.clientId} />}

            {activeTab === 'channel-instagram' && <ChannelDetailTab clientId={client.clientId} channel="instagram" />}
            {activeTab === 'channel-whatsapp' && <ChannelDetailTab clientId={client.clientId} channel="whatsapp" />}
            {activeTab === 'channel-telegram' && <ChannelDetailTab clientId={client.clientId} channel="telegram-bot" />}
          </motion.div>
        </AnimatePresence>
      </PageTransition>
    </div>
  );
}
