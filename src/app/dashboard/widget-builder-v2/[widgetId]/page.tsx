'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Layers,
  Plus,
  Loader2,
  GripVertical,
  Eye,
  EyeOff,
  Settings,
  Download,
  ArrowLeft,
  Save,
  Trash2,
  ChevronRight,
  Monitor,
  Code2,
} from 'lucide-react';
import Link from 'next/link';

interface WidgetComponent {
  _id: string;
  name: string;
  type: string;
  enabled: boolean;
  order: number;
  props: Record<string, unknown>;
}

interface WidgetProject {
  _id: string;
  name: string;
  description: string;
  status: string;
  components: WidgetComponent[];
}

export default function WidgetEditorPage() {
  const params = useParams();
  const widgetId = params.widgetId as string;

  const [project, setProject] = useState<WidgetProject | null>(null);
  const [components, setComponents] = useState<WidgetComponent[]>([]);
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [previewMode, setPreviewMode] = useState(false);

  // New component form
  const [showAddComponent, setShowAddComponent] = useState(false);
  const [newCompName, setNewCompName] = useState('');
  const [newCompType, setNewCompType] = useState('text');

  const COMPONENT_TYPES = ['text', 'button', 'image', 'form', 'carousel', 'video', 'divider', 'card', 'list', 'custom'];

  const fetchProject = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/widget-builder-v2/${widgetId}`);
      const data = await res.json();
      if (data.success) {
        setProject(data.data.project);
        setComponents(data.data.project.components || []);
      } else {
        setError(data.error || 'Failed to load project');
      }
    } catch {
      setError('Failed to load project');
    }
    setLoading(false);
  }, [widgetId]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  const fetchComponents = async () => {
    try {
      const res = await fetch(`/api/widget-builder-v2/${widgetId}/components`);
      const data = await res.json();
      if (data.success) {
        setComponents(data.data.components || []);
      }
    } catch {
      /* empty */
    }
  };

  const addComponent = async () => {
    if (!newCompName) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/widget-builder-v2/${widgetId}/components`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCompName,
          type: newCompType,
          enabled: true,
          order: components.length,
          props: {},
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNewCompName('');
        setShowAddComponent(false);
        fetchComponents();
        setSuccess('Component added');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Failed to add component');
      }
    } catch {
      setError('Failed to add component');
    }
    setSaving(false);
  };

  const toggleComponent = async (compId: string, enabled: boolean) => {
    setComponents((prev) => prev.map((c) => (c._id === compId ? { ...c, enabled } : c)));
    try {
      await fetch(`/api/widget-builder-v2/${widgetId}/components`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ componentId: compId, enabled }),
      });
    } catch {
      /* empty */
    }
  };

  const moveComponent = (index: number, direction: 'up' | 'down') => {
    const newComponents = [...components];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newComponents.length) return;
    [newComponents[index], newComponents[targetIndex]] = [newComponents[targetIndex], newComponents[index]];
    newComponents.forEach((c, i) => {
      c.order = i;
    });
    setComponents(newComponents);
  };

  const handleExport = async () => {
    setExporting(true);
    setError('');
    try {
      const res = await fetch(`/api/widget-builder-v2/${widgetId}/export`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSuccess('Widget exported successfully!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Export failed');
      }
    } catch {
      setError('Export failed');
    }
    setExporting(false);
  };

  const selectedComp = components.find((c) => c._id === selectedComponent);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <Link href="/dashboard/widget-builder-v2" className="text-gray-500 transition-colors hover:text-white">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-blue-400" />
                <h1 className="text-xl font-bold text-white">{project?.name || 'Widget Editor'}</h1>
              </div>
              {project?.description && <p className="mt-0.5 text-xs text-gray-500">{project.description}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPreviewMode(!previewMode)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                previewMode ? 'bg-green-500/20 text-green-400' : 'bg-white/[0.03] text-gray-400 hover:text-white'
              }`}
            >
              <Monitor className="h-4 w-4" />
              {previewMode ? 'Editing' : 'Preview'}
            </button>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-2 rounded-xl bg-blue-500/20 px-4 py-2 text-sm font-medium text-blue-400 transition-colors hover:bg-blue-500/30 disabled:opacity-50"
            >
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Export
            </button>
          </div>
        </motion.div>

        {/* Messages */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400"
          >
            {error}
          </motion.div>
        )}
        {success && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-400"
          >
            {success}
          </motion.div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Component List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="space-y-4 lg:col-span-1"
          >
            <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur">
              <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Layers className="h-4 w-4 text-blue-400" />
                  Components ({components.length})
                </h3>
                <button
                  onClick={() => setShowAddComponent(!showAddComponent)}
                  className="text-blue-400 transition-colors hover:text-blue-300"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {/* Add Component Form */}
              {showAddComponent && (
                <div className="space-y-2 border-b border-white/[0.06] p-3">
                  <input
                    value={newCompName}
                    onChange={(e) => setNewCompName(e.target.value)}
                    className="w-full rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-xs text-white outline-none focus:border-blue-500/50"
                    placeholder="Component name"
                  />
                  <select
                    value={newCompType}
                    onChange={(e) => setNewCompType(e.target.value)}
                    className="w-full rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-xs text-white outline-none"
                  >
                    {COMPONENT_TYPES.map((t) => (
                      <option key={t} value={t} className="bg-[#0a0a0f]">
                        {t}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={addComponent}
                    disabled={saving || !newCompName}
                    className="flex w-full items-center justify-center gap-1 rounded-lg bg-blue-500/20 px-3 py-1.5 text-xs font-medium text-blue-400 transition-colors hover:bg-blue-500/30 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                    Add
                  </button>
                </div>
              )}

              {/* Component Entries */}
              <div className="divide-y divide-white/[0.04]">
                {components.length === 0 ? (
                  <div className="px-4 py-8 text-center text-xs text-gray-600">
                    No components yet. Add one to start building.
                  </div>
                ) : (
                  components.map((comp, index) => (
                    <div
                      key={comp._id}
                      onClick={() => setSelectedComponent(comp._id)}
                      className={`flex cursor-pointer items-center gap-2 px-3 py-2.5 transition-colors ${
                        selectedComponent === comp._id
                          ? 'border-l-2 border-blue-400 bg-blue-500/10'
                          : 'border-l-2 border-transparent hover:bg-white/[0.03]'
                      }`}
                    >
                      <GripVertical className="h-3 w-3 shrink-0 cursor-grab text-gray-600" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-xs font-medium text-white">{comp.name}</span>
                          <span className="rounded bg-white/[0.03] px-1 py-0.5 text-[10px] text-gray-600">
                            {comp.type}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {/* Move buttons */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            moveComponent(index, 'up');
                          }}
                          disabled={index === 0}
                          className="px-1 text-[10px] text-gray-600 hover:text-white disabled:opacity-30"
                        >
                          ↑
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            moveComponent(index, 'down');
                          }}
                          disabled={index === components.length - 1}
                          className="px-1 text-[10px] text-gray-600 hover:text-white disabled:opacity-30"
                        >
                          ↓
                        </button>
                        {/* Toggle */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleComponent(comp._id, !comp.enabled);
                          }}
                          className={`rounded p-1 transition-colors ${comp.enabled ? 'text-green-400' : 'text-gray-600'}`}
                        >
                          {comp.enabled ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>

          {/* Properties Panel + Preview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-4 lg:col-span-2"
          >
            {/* Properties Panel */}
            {selectedComp && !previewMode && (
              <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur">
                <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                    <Settings className="h-4 w-4 text-blue-400" />
                    Properties: {selectedComp.name}
                  </h3>
                  <span className="rounded bg-white/[0.03] px-2 py-0.5 text-[10px] text-gray-500">
                    {selectedComp.type}
                  </span>
                </div>
                <div className="space-y-3 p-4">
                  <div>
                    <label className="mb-1 block text-xs text-gray-400">Name</label>
                    <input
                      value={selectedComp.name}
                      readOnly
                      className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-400">Type</label>
                    <input
                      value={selectedComp.type}
                      readOnly
                      className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-400">Status</label>
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2 w-2 rounded-full ${selectedComp.enabled ? 'bg-green-400' : 'bg-gray-600'}`}
                      />
                      <span className="text-sm text-white">{selectedComp.enabled ? 'Enabled' : 'Disabled'}</span>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-400">Custom Props (JSON)</label>
                    <pre className="max-h-40 overflow-auto rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 font-mono text-xs text-gray-400">
                      {JSON.stringify(selectedComp.props || {}, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            )}

            {/* Preview Panel */}
            <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur">
              <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
                <Monitor className="h-4 w-4 text-blue-400" />
                <h3 className="text-sm font-semibold text-white">Preview</h3>
              </div>
              <div className="min-h-[300px] p-6">
                {components.filter((c) => c.enabled).length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center py-12 text-gray-600">
                    <Code2 className="mb-3 h-10 w-10" />
                    <p className="text-sm">Add and enable components to see a preview</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {components
                      .filter((c) => c.enabled)
                      .sort((a, b) => a.order - b.order)
                      .map((comp) => (
                        <div
                          key={comp._id}
                          className={`rounded-xl border p-4 transition-all ${
                            selectedComponent === comp._id
                              ? 'border-blue-500/40 bg-blue-500/5'
                              : 'border-white/[0.06] bg-white/[0.02]'
                          }`}
                          onClick={() => setSelectedComponent(comp._id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <ChevronRight className="h-3 w-3 text-gray-600" />
                              <span className="text-sm font-medium text-white">{comp.name}</span>
                            </div>
                            <span className="text-[10px] text-gray-600">{comp.type}</span>
                          </div>
                          {comp.type === 'text' && (
                            <div className="mt-2 text-xs text-gray-500">Text content placeholder</div>
                          )}
                          {comp.type === 'button' && (
                            <div className="mt-2">
                              <span className="rounded-lg bg-blue-500/20 px-3 py-1 text-xs text-blue-400">Button</span>
                            </div>
                          )}
                          {comp.type === 'image' && (
                            <div className="mt-2 flex h-20 items-center justify-center rounded-lg bg-white/[0.03] text-xs text-gray-600">
                              Image placeholder
                            </div>
                          )}
                          {comp.type === 'divider' && <div className="mt-2 border-t border-white/[0.06]" />}
                          {comp.type === 'form' && (
                            <div className="mt-2 space-y-1">
                              <div className="h-6 rounded bg-white/[0.03]" />
                              <div className="h-6 rounded bg-white/[0.03]" />
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
