'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  Plus,
  Pencil,
  Trash2,
  Brain,
  Zap,
  MessageSquare,
  X,
  Send,
  ChevronDown,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Loader2,
} from 'lucide-react';

interface Persona {
  _id: string;
  clientId: string;
  name: string;
  avatar?: string;
  role: string;
  tone: string;
  language?: string;
  systemPromptOverlay: string;
  triggerKeywords: string[];
  triggerIntents: string[];
  isDefault: boolean;
  isActive: boolean;
  nicheTemplate?: string;
  modelPreference: 'gemini' | 'claude' | 'openai' | 'auto';
  memoryEnabled: boolean;
  maxMemoryFacts: number;
}

interface Template {
  id: string;
  name: string;
  niche: string;
  role: string;
  tone: string;
  description: string;
  systemPromptOverlay: string;
  triggerKeywords: string[];
  triggerIntents: string[];
  modelPreference: string;
}

interface Widget {
  clientId: string;
  name?: string;
}

const MODEL_LABELS: Record<string, string> = {
  auto: 'Auto (Fallback)',
  gemini: 'Google Gemini',
  claude: 'Anthropic Claude',
  openai: 'OpenAI GPT',
};

const ROLE_COLORS: Record<string, string> = {
  sales: 'bg-green-500/20 text-green-400',
  support: 'bg-blue-500/20 text-blue-400',
  onboarding: 'bg-purple-500/20 text-purple-400',
  billing: 'bg-amber-500/20 text-amber-400',
  general: 'bg-gray-500/20 text-gray-400',
};

export default function AgentsPage() {
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [selectedWidget, setSelectedWidget] = useState<string>('');
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTestChat, setShowTestChat] = useState(false);
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formRole, setFormRole] = useState('general');
  const [formTone, setFormTone] = useState('friendly');
  const [formPrompt, setFormPrompt] = useState('');
  const [formKeywords, setFormKeywords] = useState('');
  const [formModel, setFormModel] = useState<'auto' | 'gemini' | 'claude' | 'openai'>('auto');
  const [formMemory, setFormMemory] = useState(false);
  const [formFormality, setFormFormality] = useState(50);
  const [formEmpathy, setFormEmpathy] = useState(50);

  // Test chat state
  const [testMessages, setTestMessages] = useState<Array<{ role: string; text: string }>>([]);
  const [testInput, setTestInput] = useState('');
  const [testLoading, setTestLoading] = useState(false);

  const fetchWidgets = useCallback(async () => {
    try {
      const res = await fetch('/api/clients');
      const data = await res.json();
      if (data.success && data.data) {
        setWidgets(data.data);
        if (data.data.length > 0 && !selectedWidget) {
          setSelectedWidget(data.data[0].clientId);
        }
      }
    } catch (err) {
      console.error('Failed to fetch widgets:', err);
    }
  }, [selectedWidget]);

  const fetchPersonas = useCallback(async () => {
    if (!selectedWidget) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/agent-personas?clientId=${selectedWidget}`);
      const data = await res.json();
      if (data.success) setPersonas(data.data || []);
    } catch (err) {
      console.error('Failed to fetch personas:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedWidget]);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch('/api/agent-personas/templates');
      const data = await res.json();
      if (data.success) setTemplates(data.data || []);
    } catch (err) {
      console.error('Failed to fetch templates:', err);
    }
  }, []);

  useEffect(() => {
    fetchWidgets();
    fetchTemplates();
  }, [fetchWidgets, fetchTemplates]);

  useEffect(() => {
    fetchPersonas();
  }, [fetchPersonas]);

  const resetForm = () => {
    setFormName('');
    setFormRole('general');
    setFormTone('friendly');
    setFormPrompt('');
    setFormKeywords('');
    setFormModel('auto');
    setFormMemory(false);
    setFormFormality(50);
    setFormEmpathy(50);
  };

  const handleCreateFromTemplate = (template: Template) => {
    setFormName(template.name);
    setFormRole(template.role);
    setFormTone(template.tone);
    setFormPrompt(template.systemPromptOverlay);
    setFormKeywords(template.triggerKeywords.join(', '));
    setFormModel(template.modelPreference as 'auto' | 'gemini' | 'claude' | 'openai');
    setShowTemplates(false);
    setShowCreateModal(true);
  };

  const handleCreate = async () => {
    try {
      const res = await fetch('/api/agent-personas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedWidget,
          name: formName,
          role: formRole,
          tone: formTone,
          systemPromptOverlay: formPrompt,
          triggerKeywords: formKeywords
            .split(',')
            .map((k) => k.trim())
            .filter(Boolean),
          modelPreference: formModel,
          memoryEnabled: formMemory,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowCreateModal(false);
        resetForm();
        fetchPersonas();
      }
    } catch (err) {
      console.error('Create persona error:', err);
    }
  };

  const handleEdit = (persona: Persona) => {
    setEditingPersona(persona);
    setFormName(persona.name);
    setFormRole(persona.role);
    setFormTone(persona.tone);
    setFormPrompt(persona.systemPromptOverlay);
    setFormKeywords(persona.triggerKeywords.join(', '));
    setFormModel(persona.modelPreference);
    setFormMemory(persona.memoryEnabled);
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    if (!editingPersona) return;
    try {
      const res = await fetch(`/api/agent-personas/${editingPersona._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          role: formRole,
          tone: formTone,
          systemPromptOverlay: formPrompt,
          triggerKeywords: formKeywords
            .split(',')
            .map((k) => k.trim())
            .filter(Boolean),
          modelPreference: formModel,
          memoryEnabled: formMemory,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowEditModal(false);
        setEditingPersona(null);
        resetForm();
        fetchPersonas();
      }
    } catch (err) {
      console.error('Update persona error:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this persona?')) return;
    try {
      await fetch(`/api/agent-personas/${id}`, { method: 'DELETE' });
      fetchPersonas();
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const handleToggleActive = async (persona: Persona) => {
    try {
      await fetch(`/api/agent-personas/${persona._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !persona.isActive }),
      });
      fetchPersonas();
    } catch (err) {
      console.error('Toggle error:', err);
    }
  };

  const handleTestChat = async () => {
    if (!testInput.trim() || !selectedWidget) return;
    const userMsg = testInput.trim();
    setTestInput('');
    setTestMessages((prev) => [...prev, { role: 'user', text: userMsg }]);
    setTestLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedWidget,
          message: userMsg,
          sessionId: `test-${Date.now()}`,
        }),
      });
      const data = await res.json();
      setTestMessages((prev) => [
        ...prev,
        { role: 'assistant', text: data.response || data.data?.response || 'No response' },
      ]);
    } catch {
      setTestMessages((prev) => [...prev, { role: 'assistant', text: 'Error getting response' }]);
    } finally {
      setTestLoading(false);
    }
  };

  const PersonaFormModal = ({
    isEdit,
    onSubmit,
    onClose,
  }: {
    isEdit: boolean;
    onSubmit: () => void;
    onClose: () => void;
  }) => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-bg-secondary border-border max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-2xl border p-6 shadow-2xl backdrop-blur-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-text-primary text-lg font-semibold">{isEdit ? 'Edit Agent' : 'Create Agent'}</h3>
          <button onClick={onClose} className="text-text-tertiary hover:text-text-primary">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-text-secondary mb-1 block text-sm">Name</label>
            <input
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="bg-bg-tertiary border-border text-text-primary w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="Sales Assistant"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-text-secondary mb-1 block text-sm">Role</label>
              <select
                value={formRole}
                onChange={(e) => setFormRole(e.target.value)}
                className="bg-bg-tertiary border-border text-text-primary w-full rounded-lg border px-3 py-2 text-sm"
              >
                <option value="general">General</option>
                <option value="sales">Sales</option>
                <option value="support">Support</option>
                <option value="onboarding">Onboarding</option>
                <option value="billing">Billing</option>
              </select>
            </div>
            <div>
              <label className="text-text-secondary mb-1 block text-sm">Model</label>
              <select
                value={formModel}
                onChange={(e) => setFormModel(e.target.value as typeof formModel)}
                className="bg-bg-tertiary border-border text-text-primary w-full rounded-lg border px-3 py-2 text-sm"
              >
                {Object.entries(MODEL_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Personality Sliders */}
          <div>
            <label className="text-text-secondary mb-2 block text-sm">Tone: {formTone}</label>
            <div className="space-y-3">
              <div>
                <div className="text-text-tertiary mb-1 flex justify-between text-xs">
                  <span>Casual</span>
                  <span>Formal</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={formFormality}
                  onChange={(e) => {
                    const v = parseInt(e.target.value);
                    setFormFormality(v);
                    setFormTone(v < 33 ? 'casual' : v < 66 ? 'friendly' : 'formal');
                  }}
                  className="w-full accent-blue-500"
                />
              </div>
              <div>
                <div className="text-text-tertiary mb-1 flex justify-between text-xs">
                  <span>Direct</span>
                  <span>Empathetic</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={formEmpathy}
                  onChange={(e) => setFormEmpathy(parseInt(e.target.value))}
                  className="w-full accent-pink-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-text-secondary mb-1 block text-sm">System Prompt Overlay</label>
            <textarea
              value={formPrompt}
              onChange={(e) => setFormPrompt(e.target.value)}
              rows={4}
              className="bg-bg-tertiary border-border text-text-primary w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="Additional instructions for this persona..."
            />
          </div>

          <div>
            <label className="text-text-secondary mb-1 block text-sm">Trigger Keywords (comma-separated)</label>
            <input
              value={formKeywords}
              onChange={(e) => setFormKeywords(e.target.value)}
              className="bg-bg-tertiary border-border text-text-primary w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="pricing, buy, order, discount"
            />
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => setFormMemory(!formMemory)} className="flex items-center gap-2">
              {formMemory ? (
                <ToggleRight className="h-5 w-5 text-blue-500" />
              ) : (
                <ToggleLeft className="h-5 w-5 text-gray-400" />
              )}
              <span className="text-text-secondary text-sm">Enable Agent Memory</span>
            </button>
          </div>

          <button
            onClick={onSubmit}
            disabled={!formName.trim()}
            className="bg-accent hover:bg-accent/90 w-full rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-colors disabled:opacity-50"
          >
            {isEdit ? 'Save Changes' : 'Create Agent'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-text-primary text-2xl font-bold">AI Agents</h1>
          <p className="text-text-secondary mt-1 text-sm">Create and manage AI personas for your widgets</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Widget Selector */}
          <div className="relative">
            <select
              value={selectedWidget}
              onChange={(e) => setSelectedWidget(e.target.value)}
              className="bg-bg-secondary border-border text-text-primary appearance-none rounded-lg border py-2 pr-8 pl-3 text-sm"
            >
              {widgets.map((w) => (
                <option key={w.clientId} value={w.clientId}>
                  {w.name || w.clientId}
                </option>
              ))}
            </select>
            <ChevronDown className="text-text-tertiary pointer-events-none absolute top-2.5 right-2 h-4 w-4" />
          </div>

          <button
            onClick={() => setShowTemplates(true)}
            className="bg-bg-secondary border-border text-text-secondary hover:text-text-primary flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors"
          >
            <Sparkles className="h-4 w-4" />
            Templates
          </button>

          <button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="bg-accent flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white"
          >
            <Plus className="h-4 w-4" />
            New Agent
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Total Agents', value: personas.length, icon: Bot },
          { label: 'Active', value: personas.filter((p) => p.isActive).length, icon: Zap },
          { label: 'Memory Enabled', value: personas.filter((p) => p.memoryEnabled).length, icon: Brain },
          { label: 'Conversations', value: '--', icon: MessageSquare },
        ].map((stat) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-bg-secondary/60 border-border rounded-xl border p-4 backdrop-blur-md"
          >
            <div className="text-text-tertiary mb-1 flex items-center gap-2 text-xs">
              <stat.icon className="h-3.5 w-3.5" />
              {stat.label}
            </div>
            <div className="text-text-primary text-xl font-semibold">{stat.value}</div>
          </motion.div>
        ))}
      </div>

      {/* Agent Cards Grid */}
      {loading ? (
        <div className="text-text-tertiary flex items-center justify-center py-20">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading agents...
        </div>
      ) : personas.length === 0 ? (
        <div className="text-text-tertiary py-20 text-center">
          <Bot className="mx-auto mb-3 h-12 w-12 opacity-30" />
          <p>No agents yet. Create one from a template or from scratch.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {personas.map((persona) => (
            <motion.div
              key={persona._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-bg-secondary/60 border-border group relative rounded-xl border p-5 backdrop-blur-md transition-all hover:shadow-lg ${
                !persona.isActive ? 'opacity-60' : ''
              }`}
            >
              {/* Status indicator */}
              <div
                className={`absolute top-4 right-4 h-2.5 w-2.5 rounded-full ${persona.isActive ? 'bg-green-500' : 'bg-gray-500'}`}
              />

              {/* Avatar + Name */}
              <div className="mb-3 flex items-center gap-3">
                <div className="bg-accent/20 flex h-10 w-10 items-center justify-center rounded-full text-lg">
                  {persona.avatar ? <span>{persona.avatar}</span> : <Bot className="text-accent h-5 w-5" />}
                </div>
                <div>
                  <h3 className="text-text-primary font-medium">{persona.name}</h3>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${ROLE_COLORS[persona.role] || ROLE_COLORS.general}`}
                    >
                      {persona.role}
                    </span>
                    {persona.isDefault && <span className="text-text-tertiary text-xs">Default</span>}
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="text-text-tertiary mb-4 space-y-1 text-xs">
                <div className="flex items-center gap-1.5">
                  <Zap className="h-3 w-3" />
                  {MODEL_LABELS[persona.modelPreference]}
                </div>
                <div className="flex items-center gap-1.5">
                  <Brain className="h-3 w-3" />
                  Memory: {persona.memoryEnabled ? 'On' : 'Off'}
                </div>
                {persona.triggerKeywords.length > 0 && (
                  <div className="truncate">
                    Keywords: {persona.triggerKeywords.slice(0, 3).join(', ')}
                    {persona.triggerKeywords.length > 3 && '...'}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleEdit(persona)}
                  className="text-text-tertiary hover:text-accent rounded p-1.5 transition-colors"
                  title="Edit"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleToggleActive(persona)}
                  className="text-text-tertiary rounded p-1.5 transition-colors hover:text-amber-400"
                  title={persona.isActive ? 'Deactivate' : 'Activate'}
                >
                  {persona.isActive ? (
                    <ToggleRight className="h-4 w-4 text-green-500" />
                  ) : (
                    <ToggleLeft className="h-4 w-4" />
                  )}
                </button>
                <button
                  onClick={() => {
                    setTestMessages([]);
                    setShowTestChat(true);
                  }}
                  className="text-text-tertiary rounded p-1.5 transition-colors hover:text-blue-400"
                  title="Test Chat"
                >
                  <MessageSquare className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(persona._id)}
                  className="text-text-tertiary ml-auto rounded p-1.5 transition-colors hover:text-red-400"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {showCreateModal && (
          <PersonaFormModal isEdit={false} onSubmit={handleCreate} onClose={() => setShowCreateModal(false)} />
        )}
        {showEditModal && (
          <PersonaFormModal
            isEdit={true}
            onSubmit={handleUpdate}
            onClose={() => {
              setShowEditModal(false);
              setEditingPersona(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Templates Modal */}
      <AnimatePresence>
        {showTemplates && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => setShowTemplates(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-bg-secondary border-border max-h-[80vh] w-full max-w-3xl overflow-y-auto rounded-2xl border p-6 shadow-2xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-text-primary text-lg font-semibold">Agent Templates</h3>
                <button onClick={() => setShowTemplates(false)} className="text-text-tertiary hover:text-text-primary">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleCreateFromTemplate(t)}
                    className="bg-bg-tertiary border-border hover:border-accent/50 rounded-xl border p-4 text-left transition-all"
                  >
                    <div className="text-text-primary mb-1 text-sm font-medium">{t.name}</div>
                    <div className="text-text-tertiary mb-2 line-clamp-2 text-xs">{t.description}</div>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${ROLE_COLORS[t.role] || ROLE_COLORS.general}`}>
                      {t.role}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Test Chat Panel */}
      <AnimatePresence>
        {showTestChat && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="bg-bg-secondary border-border fixed top-0 right-0 bottom-0 z-50 flex w-96 flex-col border-l shadow-2xl"
          >
            <div className="border-border flex items-center justify-between border-b px-4 py-3">
              <h3 className="text-text-primary text-sm font-semibold">Test Chat</h3>
              <button onClick={() => setShowTestChat(false)} className="text-text-tertiary hover:text-text-primary">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {testMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                      msg.role === 'user' ? 'bg-accent text-white' : 'bg-bg-tertiary text-text-primary'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {testLoading && (
                <div className="flex justify-start">
                  <div className="bg-bg-tertiary rounded-lg px-3 py-2">
                    <Loader2 className="text-text-tertiary h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>
            <div className="border-border flex items-center gap-2 border-t p-4">
              <input
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleTestChat()}
                className="bg-bg-tertiary border-border text-text-primary flex-1 rounded-lg border px-3 py-2 text-sm"
                placeholder="Type a message..."
              />
              <button
                onClick={handleTestChat}
                disabled={!testInput.trim() || testLoading}
                className="bg-accent rounded-lg p-2 text-white disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
