'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { PageTransition, MotionList, MotionItem, AnimatedNumber } from '@/components/ui/motion';
import { IClient } from '@/models/Client';
import { useMoodTheme } from '@/hooks/use-mood-theme';

// --- Interfaces ---

interface ClientDetailsData {
  client: IClient;
  files: string[];
  telegramBotUsername?: string;
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
  source?: string;
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

// Stats & Analytics Types
interface AnalyticsData {
  totalChats: number;
  totalMessages: number;
  avgMessagesPerChat: number;
  dailyStats: Array<{ date: string; totalChats: number; totalMessages: number }>;
  hourlyDistribution: Array<{ hour: number; count: number }>;
  topQuestions: Array<{ text: string; count: number }>;
}

type TabType = 'analytics' | 'ai-settings' | 'knowledge' | 'history' | 'billing' | 'embed';

// --- Loading Component ---

function CabinetLoading() {
  return (
    <div className="bg-gradient-animated flex min-h-screen items-center justify-center">
      <div className="glass-card p-8 text-center">
        <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-4 border-[var(--neon-cyan)] border-t-transparent" />
        <p className="text-gray-400">Loading your cabinet...</p>
      </div>
    </div>
  );
}

// --- Main Page Component ---

export default function ClientCabinetPage() {
  return (
    <Suspense fallback={<CabinetLoading />}>
      <ClientCabinetContent />
    </Suspense>
  );
}

function ClientCabinetContent() {
  const router = useRouter();
  const [data, setData] = useState<ClientDetailsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('analytics');

  // --- State for Features ---
  const [aiSettings, setAiSettings] = useState<AISettings | null>(null);

  // --- MOOD THEME ENGINE ---
  // Default to 0.7 if settings not loaded
  const moodTheme = useMoodTheme(aiSettings?.temperature ?? 0.7);

  // AI Settings
  const [availableModels, setAvailableModels] = useState<AIModelInfo[]>([]);
  const [aiSettingsLoading, setAiSettingsLoading] = useState(false);
  const [aiSettingsSaving, setAiSettingsSaving] = useState(false);
  const [aiSettingsMessage, setAiSettingsMessage] = useState<string | null>(null);
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);

  // Knowledge Base
  const [knowledgeChunks, setKnowledgeChunks] = useState<KnowledgeChunk[]>([]);
  const [knowledgeLoading, setKnowledgeLoading] = useState(false);
  const [newKnowledgeText, setNewKnowledgeText] = useState('');
  const [newKnowledgeSource, setNewKnowledgeSource] = useState('');
  const [addingKnowledge, setAddingKnowledge] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);

  // Chat Test
  const [testMessage, setTestMessage] = useState('');
  const [testResponse, setTestResponse] = useState('');
  const [testLoading, setTestLoading] = useState(false);

  // History
  const [chatLogs, setChatLogs] = useState<ChatLogSummary[]>([]);
  const [chatLogsLoading, setChatLogsLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<{
    _id: string;
    sessionId: string;
    messages: Array<{ role: string; content: string; timestamp: string }>;
  } | null>(null);

  // Analytics
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [sheetsExporting, setSheetsExporting] = useState(false);
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  // --- 1. Initial Data Fetch ---

  useEffect(() => {
    fetchClientData();
  }, []);

  const fetchClientData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/clients/me');

      if (response.status === 401) {
        setError('Unauthorized: Please log in again.');
        setLoading(false);
        return;
      }

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

  // --- 2. Tab Data Fetchers ---

  useEffect(() => {
    if (!data?.client.clientId) return;

    if (activeTab === 'ai-settings') {
      fetchAISettings();
      if (templates.length === 0) fetchTemplates();
    } else if (activeTab === 'knowledge') {
      fetchKnowledge();
    } else if (activeTab === 'analytics') {
      fetchAnalytics();
    } else if (activeTab === 'history') {
      fetchChatLogs();
    }
  }, [activeTab, data?.client.clientId]);

  // --- AI Settings Methods ---

  const fetchAISettings = async () => {
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
      console.error(err);
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
        setAiSettingsMessage('✅ Settings saved!');
        setTimeout(() => setAiSettingsMessage(null), 3000);
      }
    } catch (err) {
      console.error(err);
      setAiSettingsMessage('❌ Save failed');
    } finally {
      setAiSettingsSaving(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/templates');
      const result = await response.json();
      if (result.success) setTemplates(result.templates);
    } catch (err) {
      console.error(err);
    }
  };

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
        setAiSettingsMessage('Template applied! Please save.');
        setTimeout(() => setAiSettingsMessage(null), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // --- Knowledge Base Methods ---

  const fetchKnowledge = async () => {
    if (!data?.client.clientId) return;
    try {
      setKnowledgeLoading(true);
      const response = await fetch(`/api/knowledge?clientId=${data.client.clientId}`);
      const result = await response.json();
      if (result.success) setKnowledgeChunks(result.chunks);
    } catch (err) {
      console.error(err);
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
      console.error(err);
    } finally {
      setAddingKnowledge(false);
    }
  };

  const deleteKnowledge = async (chunkId: string) => {
    if (!data?.client.clientId) return;
    if (!confirm('Are you sure you want to delete this knowledge chunk?')) return;
    try {
      await fetch(`/api/knowledge?id=${chunkId}&clientId=${data.client.clientId}`, { method: 'DELETE' });
      fetchKnowledge();
    } catch (err) {
      console.error(err);
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
        setUploadMessage(`✅ ${result.metadata.filename}: ${result.chunksCreated} chunks added`);
        fetchKnowledge();
      } else {
        setUploadMessage(`❌ Error: ${result.error}`);
      }
    } catch (err) {
      console.error(err);
      setUploadMessage('❌ Upload failed');
    } finally {
      setUploadingFile(false);
    }
  };

  // --- Chat Test Methods ---

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
        setTestResponse('Error: ' + result.error);
      }
    } catch (err) {
      console.error(err);
      setTestResponse('Connection error');
    } finally {
      setTestLoading(false);
    }
  };

  // --- History & Analytics Methods ---

  const fetchChatLogs = async () => {
    if (!data?.client.clientId) return;
    try {
      setChatLogsLoading(true);
      const response = await fetch(`/api/chat-logs?clientId=${data.client.clientId}&limit=50`);
      const result = await response.json();
      if (result.success) setChatLogs(result.logs);
    } catch (err) {
      console.error(err);
    } finally {
      setChatLogsLoading(false);
    }
  };

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

  const fetchAnalytics = async () => {
    if (!data?.client.clientId) return;
    try {
      setAnalyticsLoading(true);
      const response = await fetch(`/api/analytics?clientId=${data.client.clientId}&days=30`);
      const result = await response.json();
      if (result.success) setAnalyticsData(result.analytics);
    } catch (err) {
      console.error(err);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const exportToSheets = async () => {
    if (!data?.client.clientId || !spreadsheetId.trim()) {
      setExportMessage('Please enter Google Sheet ID');
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
      if (result.success) setExportMessage(`✅ Exported ${result.rowsExported} rows!`);
      else setExportMessage(`❌ ${result.error}`);
    } catch (err) {
      setExportMessage('❌ Export error');
      console.error(err);
    } finally {
      setSheetsExporting(false);
    }
  };

  // --- Render Logic ---

  if (loading) return <CabinetLoading />;

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
          <h2 className="mb-2 text-xl font-bold text-white">Access Denied</h2>
          <p className="mb-6 text-gray-400">{error}</p>
          <button onClick={() => router.push('/')} className="neon-button">
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  const { client } = data;
  const scriptUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/widgets/${client.folderPath}/script.js`;

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'analytics', label: 'Analytics', icon: '📊' },
    { id: 'ai-settings', label: 'AI Settings', icon: '🤖' },
    { id: 'knowledge', label: 'Knowledge', icon: '📚' },
    { id: 'history', label: 'History', icon: '💬' },
    { id: 'billing', label: 'Billing', icon: '💳' },
    { id: 'embed', label: 'Install', icon: '🔌' },
  ];

  return (
    <div className="bg-gradient-animated min-h-screen">
      {/* Header */}
      <header className="glass-card sticky top-0 z-50 rounded-none border-0 border-b border-white/10 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--neon-cyan)] to-[var(--neon-purple)] shadow-[var(--neon-cyan)]/20 shadow-lg">
              <span className="text-lg font-bold text-black">{client.username.charAt(0).toUpperCase()}</span>
            </div>
            <div>
              <h1 className="gradient-text text-xl font-bold">Client Cabinet</h1>
              <p className="text-xs text-gray-400">{client.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="rounded-full border border-[var(--neon-cyan)]/30 bg-[var(--neon-cyan)]/10 px-4 py-1.5 text-sm text-[var(--neon-cyan)]">
              Active Plan
            </span>
            <Link
              href="/"
              className="rounded-lg bg-white/5 px-4 py-2 text-sm text-gray-400 transition-all hover:bg-white/10 hover:text-white"
            >
              Logout
            </Link>
          </div>
        </div>
      </header>

      <PageTransition className="mx-auto max-w-7xl px-6 py-8">
        {/* Stats Grid */}
        <MotionList className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-4">
          <MotionItem className="stat-premium group">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--neon-cyan)]/10">
                <svg className="h-5 w-5 text-[var(--neon-cyan)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <span className="stat-label mb-0">Total Requests</span>
            </div>
            <p className="stat-value">
              <AnimatedNumber value={client.requests || 0} />
            </p>
          </MotionItem>
          <MotionItem className="stat-premium group">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--neon-purple)]/10">
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
                    d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z"
                  />
                </svg>
              </div>
              <span className="stat-label mb-0">Tokens Used</span>
            </div>
            <p
              className="stat-value"
              style={{
                background: 'linear-gradient(135deg, var(--neon-purple), var(--neon-pink))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              <AnimatedNumber value={client.tokens || 0} />
            </p>
          </MotionItem>
          <MotionItem className="stat-premium group">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-400/10">
                <svg className="h-5 w-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <span className="stat-label mb-0">Monthly Cost</span>
            </div>
            <p
              className="stat-value"
              style={{
                background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              <AnimatedNumber value={client.monthlyCostUsd || 0} prefix="$" decimals={2} />
            </p>
          </MotionItem>
          <MotionItem className="stat-premium group">
            <div className="mb-3 flex items-center gap-3">
              <div
                className={`h-10 w-10 rounded-xl ${client.isActive ? 'bg-green-400/10' : 'bg-red-400/10'} flex items-center justify-center`}
              >
                <svg
                  className={`h-5 w-5 ${client.isActive ? 'text-green-400' : 'text-red-400'}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <span className="stat-label mb-0">Status</span>
            </div>
            <p
              className="stat-value"
              style={{
                background: client.isActive
                  ? 'linear-gradient(135deg, #34d399, #10b981)'
                  : 'linear-gradient(135deg, #ef4444, #dc2626)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {client.isActive ? 'Active' : 'Inactive'}
            </p>
          </MotionItem>
        </MotionList>

        {/* Tabs Navigation */}
        <div className="tab-nav mb-8 overflow-x-auto p-1.5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`tab-item flex items-center gap-2.5 ${activeTab === tab.id ? 'active' : ''}`}
            >
              <span className="text-lg">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {/* ANALYTICS TAB */}
            {activeTab === 'analytics' && (
              <div className="space-y-6">
                {analyticsLoading ? (
                  <div className="card-premium flex flex-col items-center gap-4 p-12 text-center text-gray-400">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--neon-cyan)] border-t-transparent" />
                    Loading analytics...
                  </div>
                ) : analyticsData ? (
                  <MotionList>
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                      <MotionItem className="card-premium p-6">
                        <h3 className="mb-6 flex items-center gap-2 text-lg font-bold text-white">
                          <span className="text-[var(--neon-cyan)]">📈</span> Daily Activity (30 Days)
                        </h3>
                        <div className="flex h-64 items-end gap-2 px-2 pb-2">
                          {analyticsData.dailyStats.map((stat, i) => (
                            <div key={i} className="group relative flex h-full flex-1 items-end">
                              <div
                                className="relative w-full overflow-hidden rounded-t-sm bg-gradient-to-t from-[var(--neon-cyan)]/20 to-[var(--neon-cyan)]/60 transition-all duration-300 group-hover:to-[var(--neon-cyan)]"
                                style={{
                                  height: `${Math.max((stat.totalMessages / Math.max(...analyticsData.dailyStats.map((s) => s.totalMessages))) * 100, 4)}%`,
                                  boxShadow: '0 0 10px rgba(0, 229, 255, 0.2)',
                                }}
                              >
                                <div className="absolute inset-0 translate-y-full transform bg-white/20 transition-transform duration-500 group-hover:translate-y-0" />
                              </div>
                              <div className="pointer-events-none absolute -top-12 left-1/2 z-10 -translate-x-1/2 translate-y-2 transform rounded-lg border border-white/10 bg-[#050507] px-3 py-1.5 text-xs whitespace-nowrap opacity-0 shadow-xl transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                                <div className="mb-0.5 font-bold text-white">{stat.totalMessages} msgs</div>
                                <div className="text-[10px] text-gray-400">
                                  {new Date(stat.date).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </MotionItem>
                      <MotionItem className="card-premium p-6">
                        <h3 className="mb-6 flex items-center gap-2 text-lg font-bold text-white">
                          <span className="text-[var(--neon-purple)]">⏰</span> Hourly Distribution
                        </h3>
                        <div className="flex h-64 items-end gap-1 px-2 pb-2">
                          {analyticsData.hourlyDistribution.map((stat, i) => (
                            <div key={i} className="group relative flex h-full flex-1 items-end">
                              <div
                                className="relative w-full overflow-hidden rounded-t-sm bg-gradient-to-t from-[var(--neon-purple)]/20 to-[var(--neon-purple)]/60 transition-all duration-300 group-hover:to-[var(--neon-purple)]"
                                style={{
                                  height: `${Math.max((stat.count / Math.max(...analyticsData.hourlyDistribution.map((s) => s.count))) * 100, 4)}%`,
                                  boxShadow: '0 0 10px rgba(184, 77, 255, 0.2)',
                                }}
                              >
                                <div className="absolute inset-0 translate-y-full transform bg-white/20 transition-transform duration-500 group-hover:translate-y-0" />
                              </div>
                              <div className="pointer-events-none absolute -top-12 left-1/2 z-10 -translate-x-1/2 translate-y-2 transform rounded-lg border border-white/10 bg-[#050507] px-3 py-1.5 text-xs whitespace-nowrap opacity-0 shadow-xl transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                                <div className="mb-0.5 font-bold text-white">{stat.count} msgs</div>
                                <div className="text-[10px] text-gray-400">{stat.hour}:00</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </MotionItem>
                    </div>
                    <MotionItem>
                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div className="glass-card p-6">
                          <h3 className="mb-4 text-lg font-bold text-white">Export to Google Sheets</h3>
                          <div className="flex gap-4">
                            <input
                              type="text"
                              value={spreadsheetId}
                              onChange={(e) => setSpreadsheetId(e.target.value)}
                              className="flex-1 rounded-lg border border-white/10 bg-black/30 p-3 text-white focus:border-[var(--neon-cyan)] focus:outline-none"
                              placeholder="Enter Google Spreadsheet ID..."
                            />
                            <button
                              onClick={exportToSheets}
                              disabled={sheetsExporting}
                              className="neon-button disabled:opacity-50"
                            >
                              {sheetsExporting ? 'Exporting...' : 'Export'}
                            </button>
                          </div>
                          {exportMessage && (
                            <p
                              className={`mt-2 text-sm ${exportMessage.includes('❌') ? 'text-red-400' : 'text-green-400'}`}
                            >
                              {exportMessage}
                            </p>
                          )}
                        </div>

                        <div className="glass-card p-6">
                          <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-white">
                            <span className="text-blue-400">✈️</span> Telegram Notifications
                          </h3>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="mb-2 text-sm text-gray-400">Get alerts about new leads and payments.</p>
                              <div className="flex items-center gap-2">
                                <span
                                  className={`h-2 w-2 rounded-full ${client.telegram ? 'bg-green-500' : 'bg-red-500'}`}
                                ></span>
                                <span className="text-sm font-medium text-white">
                                  {client.telegram ? 'Connected' : 'Not Connected'}
                                </span>
                              </div>
                            </div>
                            {client.telegram ? (
                              <button
                                disabled
                                className="cursor-default rounded-lg border border-green-500/30 bg-green-500/20 px-4 py-2 text-green-400"
                              >
                                Active
                              </button>
                            ) : data.telegramBotUsername ? (
                              <a
                                href={`https://t.me/${data.telegramBotUsername}?start=${client.clientToken}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="neon-button flex items-center gap-2"
                              >
                                Connect Bot
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                  />
                                </svg>
                              </a>
                            ) : (
                              <span className="text-xs text-red-400">Bot not configured</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </MotionItem>
                  </MotionList>
                ) : (
                  <div className="text-center text-gray-500">No data available</div>
                )}
              </div>
            )}

            {/* AI SETTINGS TAB */}
            {activeTab === 'ai-settings' && (
              <div className="space-y-6">
                {/* Templates */}
                <div className="card-premium p-6">
                  <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
                    <span>📋</span> Quick Templates
                  </h3>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
                    {templates.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => applyTemplate(template.id)}
                        className="group rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 text-center transition-all hover:-translate-y-1 hover:border-[var(--neon-cyan)]/30 hover:bg-white/[0.08] hover:shadow-lg"
                      >
                        <span className="mb-2 block transform text-2xl transition-transform group-hover:scale-110">
                          {template.icon}
                        </span>
                        <span className="text-xs font-medium text-gray-300">{template.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {aiSettingsLoading ? (
                  <div className="p-8 text-center text-gray-400">Loading settings...</div>
                ) : aiSettings ? (
                  <>
                    <div className="card-premium border-l-4 border-l-[var(--neon-cyan)] p-6">
                      <div className="mb-4 flex items-center justify-between">
                        <h3 className="flex items-center gap-2 text-lg font-bold text-white">🧠 AI Model</h3>
                        <span className="rounded-full border border-[var(--neon-cyan)]/20 bg-[var(--neon-cyan)]/10 px-2.5 py-1 text-xs font-medium text-[var(--neon-cyan)]">
                          {availableModels.find((m) => m.id === aiSettings.model)?.name ||
                            aiSettings.model ||
                            'Default'}
                        </span>
                      </div>
                      <select
                        value={aiSettings.model || ''}
                        onChange={(e) => setAiSettings({ ...aiSettings, model: e.target.value })}
                        className="input-premium mb-3 bg-[#0a0a0c]"
                      >
                        {availableModels.map((model) => (
                          <option key={model.id} value={model.id}>
                            {model.name}
                          </option>
                        ))}
                        {!aiSettings.model && <option value="">Select a model...</option>}
                      </select>
                      <p className="pl-1 text-xs text-gray-400">
                        {availableModels.find((m) => m.id === aiSettings.model)?.description ||
                          'Select the brain power for your agent.'}
                      </p>
                    </div>

                    <div className="card-premium p-6">
                      <h3 className="mb-4 text-lg font-bold text-white">🤖 System Prompt</h3>
                      <textarea
                        value={aiSettings.systemPrompt}
                        onChange={(e) => setAiSettings({ ...aiSettings, systemPrompt: e.target.value })}
                        className="input-premium mb-3 h-40 resize-none bg-[#0a0a0c] font-mono text-sm"
                        placeholder="Instructions for the AI..."
                      />
                      <p className="pl-1 text-xs text-gray-500">Define the bot&apos;s role, tone, and behavior.</p>
                    </div>

                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      <div className="card-premium p-6">
                        <h3 className="mb-4 text-lg font-bold text-white">💬 Greeting Message</h3>
                        <input
                          type="text"
                          value={aiSettings.greeting}
                          onChange={(e) => setAiSettings({ ...aiSettings, greeting: e.target.value })}
                          className="input-premium bg-[#0a0a0c]"
                        />
                      </div>
                      <motion.div
                        className="card-premium p-6 transition-all duration-300"
                        style={{ borderRadius: moodTheme.borderRadius }}
                      >
                        <div className="mb-4 flex justify-between">
                          <h3 className="flex items-center gap-2 text-lg font-bold text-white">
                            <span>{moodTheme.mokkIcon}</span> Mood:{' '}
                            <motion.span style={{ color: moodTheme.primaryColor }}>{moodTheme.moodLabel}</motion.span>
                          </h3>
                          <motion.span className="font-mono font-bold" style={{ color: moodTheme.primaryColor }}>
                            {aiSettings.temperature}
                          </motion.span>
                        </div>

                        <div className="group relative mb-6 h-6 overflow-hidden rounded-full bg-gray-700/50">
                          {/* Dynamic Bar */}
                          <motion.div
                            className="absolute top-0 left-0 h-full rounded-full"
                            style={{
                              width: `${aiSettings.temperature * 100}%`,
                              backgroundColor: moodTheme.primaryColor,
                            }}
                          />

                          {/* Input */}
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={aiSettings.temperature}
                            onChange={(e) => setAiSettings({ ...aiSettings, temperature: parseFloat(e.target.value) })}
                            className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                          />

                          {/* Hover Effect */}
                          <div className="pointer-events-none absolute inset-0 bg-white/5 opacity-0 transition-opacity group-hover:opacity-100" />
                        </div>
                        <p className="text-xs text-gray-400">
                          Adjust slider to change bot personality and interface mood.
                        </p>
                      </motion.div>
                    </div>

                    <div className="flex items-center gap-4">
                      <button
                        onClick={saveAISettings}
                        disabled={aiSettingsSaving}
                        className="btn-premium disabled:opacity-50"
                      >
                        {aiSettingsSaving ? 'Saving...' : 'Save Settings'}
                      </button>
                      {aiSettingsMessage && (
                        <span className="animate-pulse font-medium text-[var(--neon-cyan)]">{aiSettingsMessage}</span>
                      )}
                    </div>

                    {/* Test Chat */}
                    <div className="card-premium mt-8 overflow-visible p-6">
                      <div className="absolute top-0 right-0 -mt-6 -mr-6">
                        <div className="pointer-events-none h-24 w-24 rounded-full bg-[var(--neon-cyan)]/20 blur-2xl" />
                      </div>
                      <h3 className="relative z-10 mb-4 text-lg font-bold text-white">🧪 Test Your Bot</h3>
                      <div className="relative z-10 mb-4 flex gap-4">
                        <input
                          type="text"
                          value={testMessage}
                          onChange={(e) => setTestMessage(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && testChat()}
                          className="input-premium flex-1 bg-[#0a0a0c]"
                          placeholder="Type a message..."
                        />
                        <button
                          onClick={testChat}
                          disabled={testLoading}
                          className="btn-premium px-6 disabled:opacity-50"
                        >
                          {testLoading ? '...' : 'Send'}
                        </button>
                      </div>
                      {testResponse && (
                        <div className="animate-fade-in relative z-10 rounded-xl border-l-4 border-[var(--neon-cyan)] bg-[#0a0a0c]/50 p-5 text-gray-300 shadow-inner">
                          <span className="mb-2 block text-xs font-bold tracking-wider text-[var(--neon-cyan)] uppercase">
                            AI Response
                          </span>
                          {testResponse}
                        </div>
                      )}
                    </div>
                  </>
                ) : null}
              </div>
            )}

            {/* KNOWLEDGE TAB */}
            {activeTab === 'knowledge' && (
              <div className="space-y-6">
                {/* Upload */}
                <div
                  className="card-premium group relative cursor-pointer overflow-hidden border-2 border-dashed border-white/10 p-10 text-center transition-all hover:border-[var(--neon-cyan)]/50"
                  onClick={() => document.getElementById('fileInput')?.click()}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-[var(--neon-cyan)]/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

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
                    <div className="relative z-10">
                      <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-[var(--neon-cyan)] border-t-transparent" />
                      <p className="font-medium text-[var(--neon-cyan)]">Processing document...</p>
                    </div>
                  ) : (
                    <div className="relative z-10 transform transition-transform duration-300 group-hover:scale-105">
                      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--neon-cyan)]/10 shadow-[0_0_20px_rgba(0,229,255,0.15)] transition-shadow group-hover:shadow-[0_0_30px_rgba(0,229,255,0.25)]">
                        <span className="text-3xl">📄</span>
                      </div>
                      <h3 className="mb-2 text-2xl font-bold text-white transition-colors group-hover:text-[var(--neon-cyan)]">
                        Upload Document
                      </h3>
                      <p className="text-gray-400">Drag & drop or click to upload TXT, PDF, DOCX</p>
                    </div>
                  )}
                  {uploadMessage && (
                    <p className="relative z-10 mt-4 font-medium text-[var(--neon-cyan)]">{uploadMessage}</p>
                  )}
                </div>

                {/* Add Text Manual */}
                <div className="card-premium p-6">
                  <h3 className="mb-4 text-lg font-bold text-white">➕ Add Knowledge Manually</h3>
                  <textarea
                    value={newKnowledgeText}
                    onChange={(e) => setNewKnowledgeText(e.target.value)}
                    className="input-premium mb-4 h-32 resize-none bg-[#0a0a0c]"
                    placeholder="Enter facts, FAQs, or business info..."
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={addKnowledge}
                      disabled={addingKnowledge}
                      className="btn-premium disabled:opacity-50"
                    >
                      {addingKnowledge ? 'Adding...' : 'Add Knowledge'}
                    </button>
                  </div>
                </div>

                {/* Knowledge List */}
                <div className="space-y-4">
                  <h3 className="flex items-center gap-2 text-lg font-bold text-white">
                    <span>📚</span> Knowledge Chunks{' '}
                    <span className="rounded-full bg-white/5 px-2 py-0.5 text-sm font-normal text-gray-500">
                      ({knowledgeChunks.length})
                    </span>
                  </h3>
                  {knowledgeLoading ? (
                    <p className="text-gray-500 italic">Loading knowledge base...</p>
                  ) : (
                    knowledgeChunks.map((chunk) => (
                      <div
                        key={chunk._id}
                        className="glass group flex items-start justify-between rounded-xl border border-white/[0.05] p-5 transition-colors hover:bg-white/[0.03]"
                      >
                        <div className="pr-4">
                          <p className="mb-3 text-sm leading-relaxed text-gray-300">{chunk.text}</p>
                          <span className="rounded border border-white/[0.05] bg-white/5 px-2 py-1 text-[10px] font-medium tracking-wide text-gray-500 uppercase">
                            Src: {chunk.source || 'manual'}
                          </span>
                        </div>
                        <button
                          onClick={() => deleteKnowledge(chunk._id)}
                          className="rounded-lg p-2 text-gray-600 opacity-0 transition-all group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-400"
                          title="Delete chunk"
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
                    ))
                  )}
                </div>
              </div>
            )}

            {/* HISTORY TAB */}
            {activeTab === 'history' && (
              <div className="grid h-[600px] grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Web View */}
                <div className="card-premium flex flex-col overflow-hidden p-0">
                  <h3 className="border-b border-white/10 bg-white/[0.02] p-4 text-lg font-bold text-white">
                    Chat Sessions
                  </h3>
                  <div className="custom-scrollbar flex-1 space-y-2 overflow-y-auto p-2">
                    {chatLogsLoading ? (
                      <div className="flex h-full items-center justify-center">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--neon-cyan)] border-t-transparent" />
                      </div>
                    ) : chatLogs.length === 0 ? (
                      <p className="p-4 text-center text-gray-500">No history found</p>
                    ) : (
                      chatLogs.map((log) => (
                        <button
                          key={log._id}
                          onClick={() => viewChatLog(log._id)}
                          className={`group relative w-full overflow-hidden rounded-xl p-3.5 text-left transition-all ${
                            selectedLog && selectedLog._id === log._id
                              ? 'border border-[var(--neon-cyan)]/30 bg-[var(--neon-cyan)]/10'
                              : 'border border-transparent hover:border-white/10 hover:bg-white/5'
                          }`}
                        >
                          <div className="relative z-10 mb-1.5 flex justify-between">
                            <span className="text-xs font-medium text-gray-400">
                              {new Date(log.createdAt).toLocaleString()}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${selectedLog && selectedLog._id === log._id ? 'bg-[var(--neon-cyan)] text-black' : 'bg-white/10 text-gray-300'}`}
                            >
                              {log.messageCount} msgs
                            </span>
                          </div>
                          <p
                            className={`relative z-10 truncate text-sm ${selectedLog && selectedLog._id === log._id ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'}`}
                          >
                            {log.lastMessage || 'No content'}
                          </p>
                          {selectedLog && selectedLog._id === log._id && (
                            <div className="absolute inset-0 bg-gradient-to-r from-[var(--neon-cyan)]/10 to-transparent blur-sm" />
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* Details View */}
                <div className="card-premium relative flex flex-col overflow-hidden p-0 lg:col-span-2">
                  {selectedLog ? (
                    <>
                      <div className="z-10 flex items-center justify-between border-b border-white/10 bg-white/[0.02] p-4 backdrop-blur-md">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[var(--neon-cyan)] to-[var(--neon-blue)] text-xs font-bold text-black">
                            AI
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-white">Session Transcript</h3>
                            <p className="font-mono text-[10px] text-gray-500">{selectedLog.sessionId}</p>
                          </div>
                        </div>
                        <button className="text-gray-500 transition-colors hover:text-white">
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                            />
                          </svg>
                        </button>
                      </div>
                      <div className="custom-scrollbar flex-1 space-y-6 overflow-y-auto bg-black/20 p-6">
                        {selectedLog.messages.map((msg, i) => (
                          <div
                            key={i}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up`}
                            style={{ animationDelay: `${i * 50}ms` }}
                          >
                            <div
                              className={`max-w-[80%] rounded-2xl p-4 shadow-lg backdrop-blur-sm ${
                                msg.role === 'user'
                                  ? 'rounded-tr-none border border-[var(--neon-cyan)]/30 bg-gradient-to-br from-[var(--neon-cyan)]/20 to-[var(--neon-blue)]/20 text-white'
                                  : 'rounded-tl-none border border-white/10 bg-white/5 text-gray-200'
                              }`}
                            >
                              <p className="text-sm leading-relaxed">{msg.content}</p>
                              <p
                                className={`mt-1.5 text-right text-[10px] font-medium opacity-60 ${msg.role === 'user' ? 'text-[var(--neon-cyan)]' : 'text-gray-500'}`}
                              >
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-1 flex-col items-center justify-center text-gray-500 opacity-50">
                      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white/5">
                        <span className="text-4xl">💬</span>
                      </div>
                      <p className="font-medium">Select a chat session to view history</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* EMBED TAB */}
            {activeTab === 'embed' && (
              <div className="card-premium relative overflow-hidden p-8">
                <div className="pointer-events-none absolute top-0 right-0 -mt-20 -mr-20 h-64 w-64 rounded-full bg-[var(--neon-cyan)]/5 blur-3xl"></div>

                <h3 className="relative z-10 mb-8 flex items-center gap-3 text-2xl font-bold text-white">
                  <span className="rounded-lg bg-white/5 p-2">🔌</span> Installation Instructions
                </h3>

                <div className="relative z-10 space-y-8">
                  <div>
                    <h4 className="mb-3 flex items-center gap-2 text-sm font-bold tracking-wider text-[var(--neon-cyan)] uppercase">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full border border-[var(--neon-cyan)]/20 bg-[var(--neon-cyan)]/10 text-xs text-[var(--neon-cyan)]">
                        1
                      </span>
                      Copy the Code
                    </h4>
                    <div className="group relative rounded-xl border border-white/10 bg-[#050507] p-5 shadow-inner">
                      <code className="block font-mono text-sm leading-relaxed break-all text-gray-300">
                        {`<script src="${scriptUrl}" data-client-id="${client.clientId}" async></script>`}
                      </code>
                      <button
                        onClick={() =>
                          navigator.clipboard.writeText(
                            `<script src="${scriptUrl}" data-client-id="${client.clientId}" async></script>`
                          )
                        }
                        className="absolute top-3 right-3 translate-x-2 transform rounded-lg border border-[var(--neon-cyan)]/20 bg-[var(--neon-cyan)]/10 px-3 py-1.5 text-xs font-bold text-[var(--neon-cyan)] opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100 hover:bg-[var(--neon-cyan)]/20"
                      >
                        Copy Code
                      </button>
                    </div>
                  </div>

                  <div>
                    <h4 className="mb-3 flex items-center gap-2 text-sm font-bold tracking-wider text-[var(--neon-cyan)] uppercase">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full border border-[var(--neon-cyan)]/20 bg-[var(--neon-cyan)]/10 text-xs text-[var(--neon-cyan)]">
                        2
                      </span>
                      Paste into your Website
                    </h4>
                    <p className="max-w-2xl rounded-xl border border-white/5 bg-white/5 p-4 text-sm leading-relaxed text-gray-400">
                      Paste the code snippet above into the{' '}
                      <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs text-white">
                        &lt;head&gt;
                      </code>{' '}
                      or just before the closing{' '}
                      <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs text-white">
                        &lt;/body&gt;
                      </code>{' '}
                      tag of your website HTML.
                    </p>
                  </div>

                  <div className="flex items-start gap-3 rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4">
                    <span className="mt-0.5 text-xl text-yellow-500">⚠️</span>
                    <p className="text-sm leading-relaxed text-yellow-200/80">
                      It might take up to <strong>60 seconds</strong> for changes in settings to propagate to the live
                      widget due to global CDN caching.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* BILLING TAB */}
            {activeTab === 'billing' && (
              <div className="mx-auto max-w-4xl space-y-6">
                <div className="card-premium relative overflow-hidden p-8">
                  <div className="pointer-events-none absolute top-0 right-0 -mt-20 -mr-20 h-96 w-96 rounded-full bg-gradient-to-b from-[var(--neon-purple)]/10 to-transparent blur-3xl"></div>

                  <h2 className="relative z-10 mb-8 flex items-center gap-3 text-2xl font-bold text-white">
                    <span className="rounded-lg bg-white/5 p-2">💳</span> Billing & Usage
                  </h2>

                  <div className="relative z-10 mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
                    <div className="group rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 transition-colors hover:bg-white/[0.05]">
                      <p className="mb-2 text-xs font-bold tracking-wider text-gray-500 uppercase">Current Month</p>
                      <p className="text-4xl font-bold text-white transition-colors group-hover:text-yellow-400">
                        ${(client.monthlyCostUsd || 0).toFixed(2)}
                      </p>
                      <p className="mt-3 flex items-center gap-1 text-[10px] text-gray-500">
                        <span>📅</span> Reset on {new Date(client.costResetDate || Date.now()).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="group rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 transition-colors hover:bg-white/[0.05]">
                      <p className="mb-2 text-xs font-bold tracking-wider text-gray-500 uppercase">Lifetime Cost</p>
                      <p className="text-4xl font-bold text-white transition-colors group-hover:text-[var(--neon-cyan)]">
                        ${(client.costUsd || 0).toFixed(2)}
                      </p>
                      <p className="mt-3 text-[10px] text-gray-500">Total accumulated value</p>
                    </div>
                    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 transition-colors hover:bg-white/[0.05]">
                      <div className="mb-2 flex items-end justify-between">
                        <p className="text-xs font-bold tracking-wider text-gray-500 uppercase">Credit Limit</p>
                        <span className="rounded bg-white/10 px-2 py-0.5 text-xs text-white">$40.00</span>
                      </div>
                      <div className="relative mt-4 h-2 w-full overflow-hidden rounded-full bg-gray-800">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ${(client.monthlyCostUsd || 0) > 35 ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]'}`}
                          style={{ width: `${Math.min(((client.monthlyCostUsd || 0) / 40) * 100, 100)}%` }}
                        />
                      </div>
                      <p className="mt-3 text-right text-[10px] text-gray-500">
                        {(((client.monthlyCostUsd || 0) / 40) * 100).toFixed(1)}% used
                      </p>
                    </div>
                  </div>

                  <div className="relative z-10 border-t border-white/[0.06] pt-6 text-center">
                    <button className="btn-premium px-8 py-3 shadow-[0_0_20px_rgba(0,229,255,0.15)] hover:shadow-[0_0_30px_rgba(0,229,255,0.25)]">
                      Manage Subscription
                    </button>
                    <p className="mt-4 flex items-center justify-center gap-1 text-[10px] text-gray-600 opacity-60 transition-opacity hover:opacity-100">
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                      </svg>
                      Payments secured by Cryptomus
                    </p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </PageTransition>
    </div>
  );
}
