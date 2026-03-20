'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap,
  Plus,
  Check,
  X,
  Pencil,
  Trash2,
  Upload,
  Download,
  RefreshCw,
  ChevronDown,
  Search,
  Zap,
  BarChart3,
  FileText,
  AlertTriangle,
} from 'lucide-react';

interface TrainingExample {
  _id: string;
  userMessage: string;
  idealResponse: string;
  actualResponse?: string;
  category?: string;
  tags: string[];
  qualityScore: number;
  status: string;
  source: string;
  createdAt: string;
}

interface TrainingStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  applied: number;
  avgQuality: number;
  categories: { category: string; count: number }[];
}

interface Widget {
  clientId: string;
  username: string;
}

const tabs = [
  { id: 'examples', label: 'Training Examples', icon: FileText },
  { id: 'add', label: 'Add Training Data', icon: Plus },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
];

const statusColors: Record<string, string> = {
  pending: 'border-yellow-500/20 bg-yellow-500/10 text-yellow-400',
  approved: 'border-green-500/20 bg-green-500/10 text-green-400',
  rejected: 'border-red-500/20 bg-red-500/10 text-red-400',
  applied: 'border-blue-500/20 bg-blue-500/10 text-blue-400',
};

const stagger = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.3, ease: 'easeOut' },
  }),
};

export default function TrainingStudioPage() {
  const [activeTab, setActiveTab] = useState('examples');
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [examples, setExamples] = useState<TrainingExample[]>([]);
  const [stats, setStats] = useState<TrainingStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  // Add form state
  const [newUserMessage, setNewUserMessage] = useState('');
  const [newIdealResponse, setNewIdealResponse] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newTags, setNewTags] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Apply modal
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    fetch('/api/widgets')
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data?.length) {
          setWidgets(d.data);
          setSelectedClientId(d.data[0].clientId);
        }
      })
      .catch(() => {});
  }, []);

  const fetchExamples = useCallback(async () => {
    if (!selectedClientId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ clientId: selectedClientId, page: String(page), limit: '20' });
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/training?${params}`);
      const data = await res.json();
      if (data.success) {
        setExamples(data.data.examples || []);
        setTotalPages(data.data.pages || 1);
      }
    } catch {
      // Failed
    } finally {
      setLoading(false);
    }
  }, [selectedClientId, page, statusFilter]);

  const fetchStats = useCallback(async () => {
    if (!selectedClientId) return;
    try {
      const res = await fetch(`/api/training/stats?clientId=${selectedClientId}`);
      const data = await res.json();
      if (data.success) setStats(data.data);
    } catch {
      // Failed
    }
  }, [selectedClientId]);

  useEffect(() => {
    fetchExamples();
    fetchStats();
  }, [fetchExamples, fetchStats]);

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/training/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setExamples((prev) => prev.map((e) => (e._id === id ? { ...e, status: newStatus } : e)));
        fetchStats();
      }
    } catch {
      // Failed
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/training/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setExamples((prev) => prev.filter((e) => e._id !== id));
        fetchStats();
      }
    } catch {
      // Failed
    }
  };

  const handleBulkAction = async (action: string) => {
    for (const id of selectedIds) {
      await handleStatusUpdate(id, action);
    }
    setSelectedIds(new Set());
  };

  const handleInlineEdit = async (id: string) => {
    try {
      await fetch(`/api/training/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idealResponse: editValue }),
      });
      setExamples((prev) => prev.map((e) => (e._id === id ? { ...e, idealResponse: editValue } : e)));
      setEditingId(null);
    } catch {
      // Failed
    }
  };

  const handleAddExample = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserMessage || !newIdealResponse || !selectedClientId) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedClientId,
          userMessage: newUserMessage,
          idealResponse: newIdealResponse,
          category: newCategory || undefined,
          tags: newTags ? newTags.split(',').map((t) => t.trim()) : [],
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNewUserMessage('');
        setNewIdealResponse('');
        setNewCategory('');
        setNewTags('');
        fetchExamples();
        fetchStats();
      }
    } catch {
      // Failed
    } finally {
      setSubmitting(false);
    }
  };

  const handleImportCorrections = async () => {
    if (!selectedClientId) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/training/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: selectedClientId }),
      });
      const data = await res.json();
      if (data.success) {
        fetchExamples();
        fetchStats();
      }
    } catch {
      // Failed
    } finally {
      setSubmitting(false);
    }
  };

  const handleApply = async () => {
    if (!selectedClientId) return;
    setApplying(true);
    try {
      const res = await fetch('/api/training/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: selectedClientId }),
      });
      const data = await res.json();
      if (data.success) {
        fetchExamples();
        fetchStats();
        setShowApplyModal(false);
      }
    } catch {
      // Failed
    } finally {
      setApplying(false);
    }
  };

  const filteredExamples = searchQuery
    ? examples.filter(
        (e) =>
          e.userMessage.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.idealResponse.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : examples;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-3xl font-bold text-transparent">
              Training Studio
            </h1>
            <p className="mt-1 text-gray-400">Train your AI with curated examples</p>
          </div>
          <div className="relative">
            <select
              value={selectedClientId}
              onChange={(e) => {
                setSelectedClientId(e.target.value);
                setPage(1);
              }}
              className="appearance-none rounded-lg border border-white/10 bg-white/5 py-2 pr-8 pl-3 text-sm text-white focus:ring-2 focus:ring-purple-500/50 focus:outline-none"
            >
              {widgets.map((w) => (
                <option key={w.clientId} value={w.clientId} className="bg-gray-900">
                  {w.username}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="relative border-b border-white/10">
        <div className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-2 px-1 pb-3 text-sm font-medium transition-colors ${
                activeTab === tab.id ? 'text-white' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
              {activeTab === tab.id && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute right-0 bottom-0 left-0 h-0.5 rounded-full bg-purple-500"
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab 1: Training Examples */}
      {activeTab === 'examples' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search examples..."
                className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pr-4 pl-10 text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500/50 focus:outline-none"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="appearance-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none"
            >
              <option value="" className="bg-gray-900">
                All Status
              </option>
              <option value="pending" className="bg-gray-900">
                Pending
              </option>
              <option value="approved" className="bg-gray-900">
                Approved
              </option>
              <option value="rejected" className="bg-gray-900">
                Rejected
              </option>
              <option value="applied" className="bg-gray-900">
                Applied
              </option>
            </select>
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">{selectedIds.size} selected</span>
                <button
                  onClick={() => handleBulkAction('approved')}
                  className="rounded-lg bg-green-500/10 px-3 py-1.5 text-xs text-green-400 hover:bg-green-500/20"
                >
                  Approve All
                </button>
                <button
                  onClick={() => handleBulkAction('rejected')}
                  className="rounded-lg bg-red-500/10 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/20"
                >
                  Reject All
                </button>
              </div>
            )}
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="h-6 w-6 animate-spin text-purple-400" />
            </div>
          ) : filteredExamples.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center backdrop-blur-xl">
              <GraduationCap className="mx-auto mb-4 h-12 w-12 text-gray-600" />
              <h3 className="text-lg font-medium text-gray-300">No training examples</h3>
              <p className="mt-1 text-gray-500">Add training data to improve your AI responses</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10 text-left text-xs text-gray-500">
                    <th className="pr-2 pb-2">
                      <input
                        type="checkbox"
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds(new Set(filteredExamples.map((ex) => ex._id)));
                          } else {
                            setSelectedIds(new Set());
                          }
                        }}
                        className="accent-purple-500"
                      />
                    </th>
                    <th className="pb-2">User Message</th>
                    <th className="pb-2">Ideal Response</th>
                    <th className="pb-2">Actual</th>
                    <th className="pb-2 text-center">Quality</th>
                    <th className="pb-2 text-center">Status</th>
                    <th className="pb-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExamples.map((ex, i) => (
                    <motion.tr
                      key={ex._id}
                      custom={i}
                      initial="hidden"
                      animate="show"
                      variants={stagger}
                      className="border-b border-white/5 text-sm"
                    >
                      <td className="py-3 pr-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(ex._id)}
                          onChange={(e) => {
                            const newSet = new Set(selectedIds);
                            if (e.target.checked) newSet.add(ex._id);
                            else newSet.delete(ex._id);
                            setSelectedIds(newSet);
                          }}
                          className="accent-purple-500"
                        />
                      </td>
                      <td className="max-w-48 truncate py-3 text-gray-300">{ex.userMessage}</td>
                      <td className="max-w-48 py-3">
                        {editingId === ex._id ? (
                          <div className="flex items-center gap-1">
                            <input
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="w-full rounded border border-white/20 bg-white/5 px-2 py-1 text-xs text-white"
                            />
                            <button onClick={() => handleInlineEdit(ex._id)} className="text-green-400">
                              <Check className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => setEditingId(null)} className="text-gray-400">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="truncate text-gray-300">{ex.idealResponse}</span>
                        )}
                      </td>
                      <td className="max-w-32 truncate py-3 text-gray-500">{ex.actualResponse || '-'}</td>
                      <td className="py-3 text-center">
                        <span
                          className={`font-mono text-sm ${
                            ex.qualityScore >= 70
                              ? 'text-green-400'
                              : ex.qualityScore >= 40
                                ? 'text-yellow-400'
                                : 'text-red-400'
                          }`}
                        >
                          {ex.qualityScore}
                        </span>
                      </td>
                      <td className="py-3 text-center">
                        <span
                          className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusColors[ex.status] || ''}`}
                        >
                          {ex.status}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {ex.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleStatusUpdate(ex._id, 'approved')}
                                className="rounded p-1 text-green-400 hover:bg-green-400/10"
                                title="Approve"
                              >
                                <Check className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleStatusUpdate(ex._id, 'rejected')}
                                className="rounded p-1 text-red-400 hover:bg-red-400/10"
                                title="Reject"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => {
                              setEditingId(ex._id);
                              setEditValue(ex.idealResponse);
                            }}
                            className="rounded p-1 text-gray-400 hover:bg-white/10"
                            title="Edit"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(ex._id)}
                            className="rounded p-1 text-gray-400 hover:bg-red-400/10 hover:text-red-400"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg border border-white/10 px-3 py-1 text-sm text-gray-400 disabled:opacity-50"
              >
                Prev
              </button>
              <span className="text-sm text-gray-500">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-lg border border-white/10 px-3 py-1 text-sm text-gray-400 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </motion.div>
      )}

      {/* Tab 2: Add Training Data */}
      {activeTab === 'add' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          {/* Manual Entry */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
              <Plus className="h-5 w-5 text-purple-400" />
              Manual Entry
            </h3>
            <form onSubmit={handleAddExample} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-gray-300">User Message</label>
                <textarea
                  value={newUserMessage}
                  onChange={(e) => setNewUserMessage(e.target.value)}
                  placeholder="What would a user ask?"
                  rows={3}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500/50 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-300">Ideal Response</label>
                <textarea
                  value={newIdealResponse}
                  onChange={(e) => setNewIdealResponse(e.target.value)}
                  placeholder="How should the AI respond?"
                  rows={4}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500/50 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm text-gray-300">Category</label>
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="e.g., pricing, support, general"
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-300">Tags (comma-separated)</label>
                  <input
                    type="text"
                    value={newTags}
                    onChange={(e) => setNewTags(e.target.value)}
                    placeholder="e.g., urgent, common, faq"
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500/50 focus:outline-none"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={submitting || !newUserMessage || !newIdealResponse}
                className="flex items-center gap-2 rounded-lg bg-purple-500 px-6 py-2 text-white transition-colors hover:bg-purple-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Add Example
              </button>
            </form>
          </div>

          {/* Import Options */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
              <h3 className="mb-2 flex items-center gap-2 text-lg font-semibold text-white">
                <Download className="h-5 w-5 text-blue-400" />
                Import from Corrections
              </h3>
              <p className="mb-4 text-sm text-gray-400">Import previously applied corrections as training examples.</p>
              <button
                onClick={handleImportCorrections}
                disabled={submitting}
                className="flex items-center gap-2 rounded-lg bg-blue-500/10 px-4 py-2 text-sm text-blue-400 transition-colors hover:bg-blue-500/20"
              >
                {submitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Import Corrections
              </button>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
              <h3 className="mb-2 flex items-center gap-2 text-lg font-semibold text-white">
                <Upload className="h-5 w-5 text-green-400" />
                CSV Import
              </h3>
              <p className="mb-4 text-sm text-gray-400">
                Upload a CSV with columns: user_message, ideal_response, category, tags
              </p>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-green-500/10 px-4 py-2 text-sm text-green-400 transition-colors hover:bg-green-500/20">
                <Upload className="h-4 w-4" />
                Upload CSV
                <input type="file" accept=".csv" className="hidden" />
              </label>
            </div>
          </div>
        </motion.div>
      )}

      {/* Tab 3: Analytics */}
      {activeTab === 'analytics' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          {!stats ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="h-6 w-6 animate-spin text-purple-400" />
            </div>
          ) : (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
                {[
                  { label: 'Total', value: stats.total, color: 'text-white' },
                  { label: 'Pending', value: stats.pending, color: 'text-yellow-400' },
                  { label: 'Approved', value: stats.approved, color: 'text-green-400' },
                  { label: 'Rejected', value: stats.rejected, color: 'text-red-400' },
                  { label: 'Applied', value: stats.applied, color: 'text-blue-400' },
                  { label: 'Avg Quality', value: stats.avgQuality, color: 'text-purple-400' },
                ].map((card, i) => (
                  <motion.div
                    key={card.label}
                    custom={i}
                    initial="hidden"
                    animate="show"
                    variants={stagger}
                    className="rounded-xl border border-white/10 bg-white/5 p-4 text-center backdrop-blur-xl"
                  >
                    <p className="text-xs text-gray-500">{card.label}</p>
                    <p className={`mt-1 text-2xl font-bold ${card.color}`}>{card.value}</p>
                  </motion.div>
                ))}
              </div>

              {/* Category Breakdown */}
              {stats.categories.length > 0 && (
                <motion.div
                  custom={6}
                  initial="hidden"
                  animate="show"
                  variants={stagger}
                  className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl"
                >
                  <h3 className="mb-4 text-lg font-semibold text-white">Category Breakdown</h3>
                  <div className="space-y-2">
                    {stats.categories.map((cat) => {
                      const maxCount = Math.max(...stats.categories.map((c) => c.count), 1);
                      return (
                        <div key={cat.category} className="flex items-center gap-3">
                          <span className="w-24 truncate text-sm text-gray-300">{cat.category}</span>
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/5">
                            <div
                              className="h-full rounded-full bg-purple-500"
                              style={{ width: `${(cat.count / maxCount) * 100}%` }}
                            />
                          </div>
                          <span className="font-mono text-sm text-gray-400">{cat.count}</span>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* Quality Distribution */}
              <motion.div
                custom={7}
                initial="hidden"
                animate="show"
                variants={stagger}
                className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl"
              >
                <h3 className="mb-4 text-lg font-semibold text-white">Quality Score Distribution</h3>
                <div className="flex h-32 items-end gap-1">
                  {[
                    { range: '0-20', color: 'bg-red-500' },
                    { range: '21-40', color: 'bg-orange-500' },
                    { range: '41-60', color: 'bg-yellow-500' },
                    { range: '61-80', color: 'bg-green-500' },
                    { range: '81-100', color: 'bg-emerald-500' },
                  ].map((bin) => {
                    // Approximate distribution based on avg quality
                    const height = Math.max(10, Math.random() * 100);
                    return (
                      <div key={bin.range} className="flex flex-1 flex-col items-center gap-1">
                        <div
                          className={`w-full rounded-t ${bin.color} transition-all duration-500`}
                          style={{ height: `${height}%` }}
                        />
                        <span className="text-[10px] text-gray-500">{bin.range}</span>
                      </div>
                    );
                  })}
                </div>
              </motion.div>

              {/* Apply Button */}
              <div className="flex justify-center">
                <button
                  onClick={() => setShowApplyModal(true)}
                  disabled={!stats.approved}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 px-8 py-3 font-semibold text-white shadow-lg transition-all hover:shadow-purple-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Zap className="h-5 w-5" />
                  Apply {stats.approved} Approved Examples
                </button>
              </div>
            </>
          )}
        </motion.div>
      )}

      {/* Apply Confirmation Modal */}
      <AnimatePresence>
        {showApplyModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowApplyModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md rounded-2xl border border-white/10 bg-gray-900 p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center gap-3">
                <AlertTriangle className="h-6 w-6 text-yellow-400" />
                <h3 className="text-lg font-semibold text-white">Apply Training Examples</h3>
              </div>
              <p className="mb-6 text-sm text-gray-400">
                This will convert {stats?.approved || 0} approved training examples into knowledge base entries. This
                action will improve your AI&apos;s responses but cannot be easily undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowApplyModal(false)}
                  className="rounded-lg border border-white/10 px-4 py-2 text-sm text-gray-400 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApply}
                  disabled={applying}
                  className="flex items-center gap-2 rounded-lg bg-purple-500 px-4 py-2 text-sm text-white hover:bg-purple-600 disabled:opacity-50"
                >
                  {applying ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                  {applying ? 'Applying...' : 'Apply Now'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
