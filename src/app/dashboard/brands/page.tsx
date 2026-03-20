'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Building2, Plus, Trash2, Star, Globe, Palette, Box, Loader2, Edit3 } from 'lucide-react';

interface BrandItem {
  _id: string;
  name: string;
  slug: string;
  logo: string;
  primaryColor: string;
  secondaryColor: string;
  domain?: string;
  description: string;
  widgetIds: string[];
  isDefault: boolean;
}

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function BrandsPage() {
  const [brands, setBrands] = useState<BrandItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<BrandItem | null>(null);
  const [form, setForm] = useState({
    name: '',
    slug: '',
    primaryColor: '#3B82F6',
    secondaryColor: '#1E40AF',
    domain: '',
    description: '',
    isDefault: false,
  });

  const fetchBrands = useCallback(async () => {
    try {
      const res = await fetch('/api/brands');
      const json = await res.json();
      if (json.success) setBrands(json.data || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  const createBrand = async () => {
    if (!form.name || !form.slug) return;
    try {
      await fetch('/api/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      setShowCreate(false);
      setForm({
        name: '',
        slug: '',
        primaryColor: '#3B82F6',
        secondaryColor: '#1E40AF',
        domain: '',
        description: '',
        isDefault: false,
      });
      fetchBrands();
    } catch {
      // ignore
    }
  };

  const deleteBrand = async (id: string) => {
    try {
      await fetch(`/api/brands/${id}`, { method: 'DELETE' });
      if (selectedBrand?._id === id) setSelectedBrand(null);
      fetchBrands();
    } catch {
      // ignore
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6 p-6">
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-indigo-500/20 p-2">
            <Building2 className="h-6 w-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Multi-Brand Management</h1>
            <p className="text-sm text-gray-400">Manage brands for your agency or organization</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-white transition-colors hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          Create Brand
        </button>
      </motion.div>

      {/* Create Modal */}
      {showCreate && (
        <motion.div variants={fadeUp} className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
          <h3 className="mb-4 text-lg font-semibold text-white">Create New Brand</h3>
          <div className="mb-4 grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs text-gray-500">Brand Name</label>
              <input
                type="text"
                placeholder="My Brand"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">Slug</label>
              <input
                type="text"
                placeholder="my-brand"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">Primary Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.primaryColor}
                  onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                  className="h-10 w-10 cursor-pointer rounded border-0"
                />
                <input
                  type="text"
                  value={form.primaryColor}
                  onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                  className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">Secondary Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.secondaryColor}
                  onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })}
                  className="h-10 w-10 cursor-pointer rounded border-0"
                />
                <input
                  type="text"
                  value={form.secondaryColor}
                  onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })}
                  className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">Domain (optional)</label>
              <input
                type="text"
                placeholder="brand.example.com"
                value={form.domain}
                onChange={(e) => setForm({ ...form, domain: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">Description</label>
              <input
                type="text"
                placeholder="Brand description..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>
          <label className="mb-4 flex cursor-pointer items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
              className="accent-indigo-500"
            />
            Set as default brand
          </label>
          <div className="flex gap-2">
            <button
              onClick={createBrand}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-white transition-colors hover:bg-indigo-700"
            >
              Create
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="rounded-lg bg-white/10 px-4 py-2 text-white transition-colors hover:bg-white/20"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      )}

      {/* Brand Grid */}
      <motion.div variants={stagger} className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {brands.length === 0 && (
          <motion.div variants={fadeUp} className="col-span-full py-12 text-center text-gray-400">
            <Building2 className="mx-auto mb-3 h-12 w-12 opacity-50" />
            <p>No brands created yet</p>
          </motion.div>
        )}
        {brands.map((brand) => (
          <motion.div
            key={brand._id}
            variants={fadeUp}
            onClick={() => setSelectedBrand(brand)}
            className={`cursor-pointer rounded-xl border bg-white/5 p-5 backdrop-blur-xl transition-all hover:bg-white/10 ${
              selectedBrand?._id === brand._id ? 'border-indigo-500 ring-1 ring-indigo-500/30' : 'border-white/10'
            }`}
          >
            <div className="mb-3 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold text-white"
                  style={{ backgroundColor: brand.primaryColor }}
                >
                  {brand.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="flex items-center gap-1.5 font-semibold text-white">
                    {brand.name}
                    {brand.isDefault && <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />}
                  </h3>
                  <span className="text-xs text-gray-400">/{brand.slug}</span>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteBrand(brand._id);
                }}
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-500/20 hover:text-red-400"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-gray-400">
                <Palette className="h-3.5 w-3.5" />
                <div className="flex gap-1.5">
                  <div className="h-4 w-4 rounded" style={{ backgroundColor: brand.primaryColor }} />
                  <div className="h-4 w-4 rounded" style={{ backgroundColor: brand.secondaryColor }} />
                </div>
              </div>
              {brand.domain && (
                <div className="flex items-center gap-2 text-gray-400">
                  <Globe className="h-3.5 w-3.5" />
                  <span>{brand.domain}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-gray-400">
                <Box className="h-3.5 w-3.5" />
                <span>{brand.widgetIds.length} widgets</span>
              </div>
            </div>

            {brand.description && <p className="mt-3 line-clamp-2 text-xs text-gray-500">{brand.description}</p>}
          </motion.div>
        ))}
      </motion.div>

      {/* Brand Detail */}
      {selectedBrand && (
        <motion.div variants={fadeUp} className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
              <div className="h-6 w-6 rounded" style={{ backgroundColor: selectedBrand.primaryColor }} />
              {selectedBrand.name}
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
            <div>
              <span className="mb-1 block text-gray-500">Slug</span>
              <span className="text-white">{selectedBrand.slug}</span>
            </div>
            <div>
              <span className="mb-1 block text-gray-500">Domain</span>
              <span className="text-white">{selectedBrand.domain || 'None'}</span>
            </div>
            <div>
              <span className="mb-1 block text-gray-500">Widgets</span>
              <span className="text-white">{selectedBrand.widgetIds.length}</span>
            </div>
            <div>
              <span className="mb-1 block text-gray-500">Default</span>
              <span className="text-white">{selectedBrand.isDefault ? 'Yes' : 'No'}</span>
            </div>
          </div>
          {selectedBrand.widgetIds.length > 0 && (
            <div className="mt-4">
              <span className="mb-2 block text-sm text-gray-500">Assigned Widgets</span>
              <div className="flex flex-wrap gap-2">
                {selectedBrand.widgetIds.map((wid) => (
                  <span key={wid} className="rounded bg-white/10 px-2 py-1 text-xs text-gray-300">
                    {wid}
                  </span>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
