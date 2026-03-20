'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Plus, Loader2, Layers, Clock, Eye, Boxes, Search, LayoutGrid } from 'lucide-react';

interface WidgetProject {
  _id: string;
  name: string;
  description: string;
  componentCount: number;
  lastModified: string;
  thumbnail: string | null;
  status: 'draft' | 'published';
  createdAt: string;
}

export default function WidgetBuilderV2Page() {
  const [projects, setProjects] = useState<WidgetProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  // Create form
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/widget-builder-v2');
      const data = await res.json();
      if (data.success) {
        setProjects(data.data.projects || []);
      } else {
        setError(data.error || 'Failed to load projects');
      }
    } catch {
      setError('Failed to load projects');
    }
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!formName) return;
    setCreating(true);
    setError('');
    try {
      const res = await fetch('/api/widget-builder-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formName, description: formDesc }),
      });
      const data = await res.json();
      if (data.success) {
        setFormName('');
        setFormDesc('');
        setShowCreate(false);
        fetchProjects();
      } else {
        setError(data.error || 'Failed to create project');
      }
    } catch {
      setError('Failed to create project');
    }
    setCreating(false);
  };

  const filtered = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) || p.description?.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <div className="mb-1 flex items-center gap-3">
              <LayoutGrid className="h-6 w-6 text-blue-400" />
              <h1 className="text-2xl font-bold text-white">Widget Builder v2</h1>
            </div>
            <p className="text-sm text-gray-400">Build custom widget projects with visual components</p>
          </div>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-2 rounded-xl bg-blue-500/20 px-4 py-2 text-sm font-medium text-blue-400 transition-colors hover:bg-blue-500/30"
          >
            <Plus className="h-4 w-4" />
            New Project
          </button>
        </motion.div>

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400"
          >
            {error}
          </motion.div>
        )}

        {/* Create Form */}
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 backdrop-blur"
          >
            <h3 className="flex items-center gap-2 font-semibold text-white">
              <Plus className="h-4 w-4 text-blue-400" /> Create New Widget Project
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-gray-400">Project Name</label>
                <input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-white outline-none focus:border-blue-500/50"
                  placeholder="My Widget Project"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-400">Description</label>
                <input
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-white outline-none focus:border-blue-500/50"
                  placeholder="A brief description"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                disabled={creating || !formName}
                className="flex items-center gap-2 rounded-xl bg-blue-500/20 px-4 py-2 text-sm font-medium text-blue-400 transition-colors hover:bg-blue-500/30 disabled:opacity-50"
              >
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {creating ? 'Creating...' : 'Create Project'}
              </button>
              <button
                onClick={() => setShowCreate(false)}
                className="rounded-xl bg-white/[0.03] px-4 py-2 text-sm text-gray-400 transition-colors hover:text-white"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}

        {/* Search */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <div className="relative max-w-md">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] py-2 pr-4 pl-10 text-sm text-white outline-none placeholder:text-gray-500 focus:border-blue-500/50"
            />
          </div>
        </motion.div>

        {/* Projects Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20"
          >
            <Layers className="mb-3 h-12 w-12 text-gray-600" />
            <p className="text-sm text-gray-400">
              {projects.length === 0
                ? 'No widget projects yet. Create your first one!'
                : 'No projects match your search.'}
            </p>
          </motion.div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((project, index) => (
              <motion.div
                key={project._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link
                  href={`/dashboard/widget-builder-v2/${project._id}`}
                  className="group block rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur transition-all hover:border-blue-500/30 hover:bg-white/[0.05]"
                >
                  {/* Thumbnail */}
                  <div className="flex h-40 items-center justify-center rounded-t-2xl border-b border-white/[0.04] bg-white/[0.02]">
                    {project.thumbnail ? (
                      <img
                        src={project.thumbnail}
                        alt={project.name}
                        className="h-full w-full rounded-t-2xl object-cover"
                      />
                    ) : (
                      <Boxes className="h-10 w-10 text-gray-700 transition-colors group-hover:text-blue-500/50" />
                    )}
                  </div>

                  <div className="p-5">
                    <div className="mb-2 flex items-start justify-between">
                      <h3 className="text-sm font-semibold text-white transition-colors group-hover:text-blue-400">
                        {project.name}
                      </h3>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          project.status === 'published'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-yellow-500/20 text-yellow-400'
                        }`}
                      >
                        {project.status}
                      </span>
                    </div>

                    {project.description && (
                      <p className="mb-3 line-clamp-2 text-xs text-gray-500">{project.description}</p>
                    )}

                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Layers className="h-3 w-3" />
                          {project.componentCount} components
                        </span>
                      </div>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(project.lastModified || project.createdAt)}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center gap-2 text-xs text-blue-400 opacity-0 transition-opacity group-hover:opacity-100">
                      <Eye className="h-3 w-3" />
                      Open Editor
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
