'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  Plus,
  Trash2,
  X,
  ChevronDown,
  GripVertical,
  Loader2,
  ToggleLeft,
  ToggleRight,
  Zap,
  Shield,
  AlertTriangle,
  MessageCircle,
  Search,
} from 'lucide-react';

interface RoutingCondition {
  type: 'intent' | 'keyword' | 'sentiment' | 'handoff_request';
  value: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'not_equals';
}

interface RoutingRule {
  _id: string;
  clientId: string;
  name: string;
  priority: number;
  fromPersonaId: string;
  toPersonaId: string;
  conditions: RoutingCondition[];
  matchMode: 'all' | 'any';
  isActive: boolean;
  handoffMessage: string;
}

interface Persona {
  _id: string;
  name: string;
  role: string;
}

const CONDITION_TYPES = [
  { value: 'intent', label: 'Intent', icon: Zap },
  { value: 'keyword', label: 'Keyword', icon: Search },
  { value: 'sentiment', label: 'Sentiment', icon: MessageCircle },
  { value: 'handoff_request', label: 'Handoff Request', icon: AlertTriangle },
];

const OPERATORS = [
  { value: 'equals', label: '=' },
  { value: 'contains', label: 'contains' },
  { value: 'not_equals', label: '!=' },
  { value: 'greater_than', label: '>' },
  { value: 'less_than', label: '<' },
];

const INTENT_OPTIONS = [
  'pricing_inquiry',
  'booking_request',
  'complaint',
  'support_request',
  'cancellation',
  'product_interest',
  'feature_request',
  'billing',
  'general_question',
];

const RULE_TEMPLATES = [
  {
    name: 'Complaint to Support',
    fromPersonaId: '*',
    conditions: [{ type: 'intent' as const, value: 'complaint', operator: 'equals' as const }],
    matchMode: 'any' as const,
    handoffMessage: 'I can see you need some help. Let me connect you with our support specialist.',
  },
  {
    name: 'Pricing to Sales',
    fromPersonaId: '*',
    conditions: [{ type: 'intent' as const, value: 'pricing_inquiry', operator: 'equals' as const }],
    matchMode: 'any' as const,
    handoffMessage: 'Great question about pricing! Let me connect you with our sales team.',
  },
  {
    name: 'Human Handoff',
    fromPersonaId: '*',
    conditions: [{ type: 'handoff_request' as const, value: 'true', operator: 'equals' as const }],
    matchMode: 'any' as const,
    handoffMessage: "I understand you'd like to speak with a person. Transferring you now.",
  },
  {
    name: 'Negative Sentiment Escalation',
    fromPersonaId: '*',
    conditions: [{ type: 'sentiment' as const, value: 'negative', operator: 'equals' as const }],
    matchMode: 'any' as const,
    handoffMessage: 'I want to make sure you get the best help. Let me connect you with a specialist.',
  },
];

export default function RoutingPage() {
  const [rules, setRules] = useState<RoutingRule[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [widgets, setWidgets] = useState<Array<{ clientId: string; name?: string; username?: string }>>([]);
  const [selectedWidget, setSelectedWidget] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formFromPersona, setFormFromPersona] = useState('*');
  const [formToPersona, setFormToPersona] = useState('');
  const [formMatchMode, setFormMatchMode] = useState<'all' | 'any'>('any');
  const [formConditions, setFormConditions] = useState<RoutingCondition[]>([]);
  const [formHandoffMessage, setFormHandoffMessage] = useState('');
  const [formPriority, setFormPriority] = useState(0);

  // Test
  const [testInput, setTestInput] = useState('');
  const [testResult, setTestResult] = useState<string | null>(null);

  const fetchWidgets = useCallback(async () => {
    try {
      const { fetchWithRetry } = await import('@/lib/fetchWithRetry');
      const res = await fetchWithRetry('/api/clients');
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

  const fetchRules = useCallback(async () => {
    if (!selectedWidget) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/agent-routing?clientId=${selectedWidget}`);
      const data = await res.json();
      if (data.success) setRules(data.data || []);
    } catch (err) {
      console.error('Failed to fetch rules:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedWidget]);

  const fetchPersonas = useCallback(async () => {
    if (!selectedWidget) return;
    try {
      const res = await fetch(`/api/agent-personas?clientId=${selectedWidget}`);
      const data = await res.json();
      if (data.success) setPersonas(data.data || []);
    } catch (err) {
      console.error('Failed to fetch personas:', err);
    }
  }, [selectedWidget]);

  useEffect(() => {
    fetchWidgets();
  }, [fetchWidgets]);

  useEffect(() => {
    fetchRules();
    fetchPersonas();
  }, [fetchRules, fetchPersonas]);

  const resetForm = () => {
    setFormName('');
    setFormFromPersona('*');
    setFormToPersona('');
    setFormMatchMode('any');
    setFormConditions([]);
    setFormHandoffMessage('');
    setFormPriority(0);
  };

  const handleCreateRule = async () => {
    try {
      const res = await fetch('/api/agent-routing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedWidget,
          name: formName,
          priority: formPriority,
          fromPersonaId: formFromPersona,
          toPersonaId: formToPersona,
          conditions: formConditions,
          matchMode: formMatchMode,
          handoffMessage: formHandoffMessage,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowCreateModal(false);
        resetForm();
        fetchRules();
      }
    } catch (err) {
      console.error('Create rule error:', err);
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!confirm('Delete this routing rule?')) return;
    try {
      await fetch(`/api/agent-routing/${id}`, { method: 'DELETE' });
      fetchRules();
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const handleToggleRule = async (rule: RoutingRule) => {
    try {
      await fetch(`/api/agent-routing/${rule._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !rule.isActive }),
      });
      fetchRules();
    } catch (err) {
      console.error('Toggle error:', err);
    }
  };

  const applyTemplate = (template: (typeof RULE_TEMPLATES)[0]) => {
    setFormName(template.name);
    setFormFromPersona(template.fromPersonaId);
    setFormConditions(template.conditions);
    setFormMatchMode(template.matchMode);
    setFormHandoffMessage(template.handoffMessage);
  };

  const addCondition = () => {
    setFormConditions([...formConditions, { type: 'keyword', value: '', operator: 'contains' }]);
  };

  const removeCondition = (index: number) => {
    setFormConditions(formConditions.filter((_, i) => i !== index));
  };

  const updateCondition = (index: number, field: string, value: string) => {
    const updated = [...formConditions];
    (updated[index] as unknown as Record<string, string>)[field] = value;
    setFormConditions(updated);
  };

  const handleTestRule = () => {
    if (!testInput.trim()) return;

    // Simple client-side test using keyword matching
    const lower = testInput.toLowerCase();
    let matched: RoutingRule | null = null;

    const INTENT_KEYWORDS: Record<string, string[]> = {
      pricing_inquiry: ['price', 'pricing', 'cost', 'how much', 'fee', 'charge', 'rate', 'plan'],
      booking_request: ['book', 'appointment', 'schedule', 'reserve', 'reservation'],
      complaint: [
        'complaint',
        'unhappy',
        'dissatisfied',
        'terrible',
        'awful',
        'broken',
        'not working',
        'issue',
        'problem',
      ],
      support_request: ['help', 'support', 'issue', 'problem', 'stuck', 'error', 'bug', 'broken'],
      cancellation: ['cancel', 'cancellation', 'unsubscribe', 'stop', 'end subscription'],
      product_interest: ['interested', 'tell me more', 'learn more', 'demo', 'trial', 'features'],
      feature_request: ['feature', 'would be great', 'suggestion', 'idea', 'wish', 'can you add'],
      billing: ['invoice', 'bill', 'payment', 'charge', 'refund', 'receipt'],
      general_question: ['what', 'how', 'when', 'where', 'who', 'why', '?'],
    };
    const POSITIVE_WORDS = ['great', 'good', 'love', 'excellent', 'happy', 'thanks', 'awesome', 'fantastic', 'perfect'];
    const NEGATIVE_WORDS = [
      'bad',
      'terrible',
      'awful',
      'hate',
      'horrible',
      'disappointed',
      'frustrated',
      'angry',
      'poor',
      'worst',
    ];

    for (const rule of rules.filter((r) => r.isActive)) {
      const conditionResults = rule.conditions.map((cond) => {
        if (cond.type === 'keyword') return lower.includes(cond.value.toLowerCase());
        if (cond.type === 'handoff_request') {
          return lower.includes('human') || lower.includes('agent') || lower.includes('person');
        }
        if (cond.type === 'intent') {
          const keywords = INTENT_KEYWORDS[cond.value] || [];
          return keywords.some((kw) => lower.includes(kw));
        }
        if (cond.type === 'sentiment') {
          const isPositive = POSITIVE_WORDS.some((w) => lower.includes(w));
          const isNegative = NEGATIVE_WORDS.some((w) => lower.includes(w));
          if (cond.value === 'positive') return isPositive && !isNegative;
          if (cond.value === 'negative') return isNegative;
          if (cond.value === 'neutral') return !isPositive && !isNegative;
          return false;
        }
        return false;
      });

      const isMatch = rule.matchMode === 'all' ? conditionResults.every(Boolean) : conditionResults.some(Boolean);
      if (isMatch) {
        matched = rule;
        break;
      }
    }

    if (matched) {
      const toPersona = personas.find((p) => p._id === matched!.toPersonaId);
      setTestResult(`Route to: ${toPersona?.name || matched.toPersonaId} (Rule: ${matched.name})`);
    } else {
      setTestResult('No routing rule matched. Stays with current persona.');
    }
  };

  const getPersonaName = (id: string) => {
    if (id === '*') return 'Any Persona';
    return personas.find((p) => p._id === id)?.name || id;
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-text-primary text-2xl font-bold">Agent Routing</h1>
          <p className="text-text-secondary mt-1 text-sm">Define rules for automatic persona switching</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              value={selectedWidget}
              onChange={(e) => setSelectedWidget(e.target.value)}
              className="bg-bg-secondary border-border text-text-primary appearance-none rounded-lg border py-2 pr-8 pl-3 text-sm"
            >
              {widgets.length === 0 && <option value="">Select widget...</option>}
              {widgets.map((w) => (
                <option key={w.clientId} value={w.clientId}>
                  {w.username || w.name || w.clientId}
                </option>
              ))}
            </select>
            <ChevronDown className="text-text-tertiary pointer-events-none absolute top-2.5 right-2 h-4 w-4" />
          </div>

          <button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="bg-accent flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white"
          >
            <Plus className="h-4 w-4" />
            New Rule
          </button>
        </div>
      </div>

      {/* Test Rule Input */}
      <div className="bg-bg-secondary/60 border-border rounded-xl border p-4 backdrop-blur-md">
        <div className="text-text-secondary mb-2 text-sm font-medium">Test Routing Rules</div>
        <div className="flex gap-2">
          <input
            value={testInput}
            onChange={(e) => setTestInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleTestRule()}
            className="bg-bg-tertiary border-border text-text-primary flex-1 rounded-lg border px-3 py-2 text-sm"
            placeholder="Type a test message to see which rule matches..."
          />
          <button onClick={handleTestRule} className="bg-accent rounded-lg px-4 py-2 text-sm text-white">
            Test
          </button>
        </div>
        {testResult && (
          <div className="mt-2 rounded-lg bg-blue-500/10 px-3 py-2 text-sm text-blue-400">{testResult}</div>
        )}
      </div>

      {/* Rules List */}
      {loading ? (
        <div className="text-text-tertiary flex items-center justify-center py-20">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading rules...
        </div>
      ) : rules.length === 0 ? (
        <div className="text-text-tertiary py-20 text-center">
          <Shield className="mx-auto mb-3 h-12 w-12 opacity-30" />
          <p>No routing rules yet. Create one to automate persona switching.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule, index) => (
            <motion.div
              key={rule._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`bg-bg-secondary/60 border-border rounded-xl border p-4 backdrop-blur-md ${!rule.isActive ? 'opacity-50' : ''}`}
            >
              <div className="flex items-start gap-3">
                <GripVertical className="text-text-tertiary mt-1 h-4 w-4 flex-shrink-0" />

                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-text-primary text-sm font-medium">{rule.name}</span>
                    <span className="bg-bg-tertiary text-text-tertiary rounded-full px-2 py-0.5 text-xs">
                      Priority: {rule.priority}
                    </span>
                    <span className="bg-bg-tertiary text-text-tertiary rounded-full px-2 py-0.5 text-xs">
                      {rule.matchMode === 'all' ? 'ALL conditions' : 'ANY condition'}
                    </span>
                  </div>

                  {/* Route visualization */}
                  <div className="text-text-secondary mb-2 flex items-center gap-2 text-sm">
                    <span className="rounded bg-purple-500/20 px-2 py-0.5 text-xs text-purple-400">
                      {getPersonaName(rule.fromPersonaId)}
                    </span>
                    <ArrowRight className="h-3 w-3" />
                    <span className="rounded bg-blue-500/20 px-2 py-0.5 text-xs text-blue-400">
                      {getPersonaName(rule.toPersonaId)}
                    </span>
                  </div>

                  {/* Conditions */}
                  <div className="flex flex-wrap gap-1.5">
                    {rule.conditions.map((cond, ci) => (
                      <span key={ci} className="bg-bg-tertiary text-text-tertiary rounded px-2 py-0.5 text-xs">
                        {cond.type}: {cond.value} ({cond.operator})
                      </span>
                    ))}
                  </div>

                  {rule.handoffMessage && (
                    <div className="text-text-tertiary mt-2 text-xs italic">&ldquo;{rule.handoffMessage}&rdquo;</div>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleToggleRule(rule)}
                    className="rounded p-1.5 transition-colors"
                    title={rule.isActive ? 'Deactivate' : 'Activate'}
                  >
                    {rule.isActive ? (
                      <ToggleRight className="h-4 w-4 text-green-500" />
                    ) : (
                      <ToggleLeft className="text-text-tertiary h-4 w-4" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDeleteRule(rule._id)}
                    className="text-text-tertiary rounded p-1.5 transition-colors hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-bg-secondary border-border max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border p-6 shadow-2xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-text-primary text-lg font-semibold">Create Routing Rule</h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-text-tertiary hover:text-text-primary"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Templates */}
              <div className="mb-4">
                <div className="text-text-tertiary mb-2 text-xs font-medium">Quick Templates</div>
                <div className="flex flex-wrap gap-2">
                  {RULE_TEMPLATES.map((t) => (
                    <button
                      key={t.name}
                      onClick={() => applyTemplate(t)}
                      className="bg-bg-tertiary border-border hover:border-accent/50 rounded-lg border px-3 py-1.5 text-xs transition-colors"
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-text-secondary mb-1 block text-sm">Rule Name</label>
                    <input
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="bg-bg-tertiary border-border text-text-primary w-full rounded-lg border px-3 py-2 text-sm"
                      placeholder="Route complaints to support"
                    />
                  </div>
                  <div>
                    <label className="text-text-secondary mb-1 block text-sm">Priority</label>
                    <input
                      type="number"
                      value={formPriority}
                      onChange={(e) => setFormPriority(parseInt(e.target.value) || 0)}
                      className="bg-bg-tertiary border-border text-text-primary w-full rounded-lg border px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-text-secondary mb-1 block text-sm">From Persona</label>
                    <select
                      value={formFromPersona}
                      onChange={(e) => setFormFromPersona(e.target.value)}
                      className="bg-bg-tertiary border-border text-text-primary w-full rounded-lg border px-3 py-2 text-sm"
                    >
                      <option value="*">Any Persona</option>
                      {personas.map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-text-secondary mb-1 block text-sm">To Persona</label>
                    <select
                      value={formToPersona}
                      onChange={(e) => setFormToPersona(e.target.value)}
                      className="bg-bg-tertiary border-border text-text-primary w-full rounded-lg border px-3 py-2 text-sm"
                    >
                      <option value="">Select target persona</option>
                      {personas.map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Match Mode */}
                <div>
                  <label className="text-text-secondary mb-1 block text-sm">Match Mode</label>
                  <div className="flex gap-2">
                    {(['any', 'all'] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setFormMatchMode(mode)}
                        className={`rounded-lg px-4 py-2 text-sm ${
                          formMatchMode === mode
                            ? 'bg-accent text-white'
                            : 'bg-bg-tertiary text-text-secondary border-border border'
                        }`}
                      >
                        {mode === 'any' ? 'Any condition' : 'All conditions'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Conditions */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-text-secondary text-sm">Conditions</label>
                    <button
                      onClick={addCondition}
                      className="text-accent flex items-center gap-1 text-xs hover:underline"
                    >
                      <Plus className="h-3 w-3" />
                      Add condition
                    </button>
                  </div>

                  <div className="space-y-2">
                    {formConditions.map((cond, i) => (
                      <div key={i} className="bg-bg-tertiary flex items-center gap-2 rounded-lg p-2">
                        <select
                          value={cond.type}
                          onChange={(e) => updateCondition(i, 'type', e.target.value)}
                          className="bg-bg-secondary border-border text-text-primary rounded border px-2 py-1 text-xs"
                        >
                          {CONDITION_TYPES.map((ct) => (
                            <option key={ct.value} value={ct.value}>
                              {ct.label}
                            </option>
                          ))}
                        </select>

                        <select
                          value={cond.operator}
                          onChange={(e) => updateCondition(i, 'operator', e.target.value)}
                          className="bg-bg-secondary border-border text-text-primary rounded border px-2 py-1 text-xs"
                        >
                          {OPERATORS.map((op) => (
                            <option key={op.value} value={op.value}>
                              {op.label}
                            </option>
                          ))}
                        </select>

                        {cond.type === 'intent' ? (
                          <select
                            value={cond.value}
                            onChange={(e) => updateCondition(i, 'value', e.target.value)}
                            className="bg-bg-secondary border-border text-text-primary flex-1 rounded border px-2 py-1 text-xs"
                          >
                            <option value="">Select intent</option>
                            {INTENT_OPTIONS.map((io) => (
                              <option key={io} value={io}>
                                {io}
                              </option>
                            ))}
                          </select>
                        ) : cond.type === 'sentiment' ? (
                          <select
                            value={cond.value}
                            onChange={(e) => updateCondition(i, 'value', e.target.value)}
                            className="bg-bg-secondary border-border text-text-primary flex-1 rounded border px-2 py-1 text-xs"
                          >
                            <option value="positive">Positive</option>
                            <option value="negative">Negative</option>
                            <option value="neutral">Neutral</option>
                          </select>
                        ) : (
                          <input
                            value={cond.value}
                            onChange={(e) => updateCondition(i, 'value', e.target.value)}
                            className="bg-bg-secondary border-border text-text-primary flex-1 rounded border px-2 py-1 text-xs"
                            placeholder="Value..."
                          />
                        )}

                        <button onClick={() => removeCondition(i)} className="text-text-tertiary hover:text-red-400">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Handoff Message */}
                <div>
                  <label className="text-text-secondary mb-1 block text-sm">Handoff Message</label>
                  <input
                    value={formHandoffMessage}
                    onChange={(e) => setFormHandoffMessage(e.target.value)}
                    className="bg-bg-tertiary border-border text-text-primary w-full rounded-lg border px-3 py-2 text-sm"
                    placeholder="Let me connect you with the right specialist..."
                  />
                </div>

                <button
                  onClick={handleCreateRule}
                  disabled={!formName.trim() || !formToPersona}
                  className="bg-accent hover:bg-accent/90 w-full rounded-lg px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
                >
                  Create Rule
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
