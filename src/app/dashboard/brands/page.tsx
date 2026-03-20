'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Palette, Plus, Trash2, Loader2, Globe, Star, X, Image, Tag } from 'lucide-react';

interface Brand {
  _id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  domain?: string;
  description?: string;
  isDefault: boolean;
  createdAt: string;
}

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    slug: '',
    logoUrl: '',
    primaryColor: '#3B82F6',
    secondaryColor: '#8B5CF6',
    domain: '',
    description: '',
  });

  const fetchBrands = useCallback(async () => {
    try {
      const res = await fetch('/api/brands');
      const json = await res.json();
      if (json.success) {
        setBrands(json.data || []);
      } else {
        setError(json.error || 'Failed to load brands');
      }
    } catch {
      setError('Failed to fetch brands');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  const createBrand = async () => {
    if (!createForm.name || !createForm.slug) return;
    setCreating(true);
    try {
      const res = await fetch('/api/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });
      const json = await res.json();
      if (json.success) {
        setShowCreate(false);
        setCreateForm({
          name: '',
          slug: '',
          logoUrl: '',
          primaryColor: '#3B82F6',
          secondaryColor: '#8B5CF6',
          domain: '',
          description: '',
        });
        fetchBrands();
      }
    } catch {
      // ignore
    } finally {
      setCreating(false);
    }
  };

  const deleteBrand = async (id: string) => {
    try {
      await fetch(`/api/brands/${id}`, { method: 'DELETE' });
      fetchBrands();
    } catch {
      // ignore
    }
  };

  const setDefault = async (id: string) => {
    try {
      await fetch(`/api/brands/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDefault: true }),
      });
      fetchBrands();
    } catch {
      // ignore
    }
  };

  const autoSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  return (
    <div className="min-h-screen space-y-6 bg-[#0a0a0f] p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-pink-500/20 p-2.5">
            <Palette className="h-6 w-6 text-pink-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Brands</h1>
            <p className="text-sm text-gray-400">Manage white-label brand configurations</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-xl bg-blue-500/20 px-4 py-2 text-blue-400 transition-colors hover:bg-blue-500/30"
        >
          <Plus className="h-4 w-4" />
          Create Brand
        </button>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          {
            label: 'Total Brands',
            value: brands.length,
            icon: Tag,
            color: 'text-blue-400',
            bg: 'bg-blue-500/10',
          },
          {
            label: 'Default Brand',
            value: brands.find((b) => b.isDefault)?.name || 'None',
            icon: Star,
            color: 'text-amber-400',
            bg: 'bg-amber-500/10',
          },
          {
            label: 'With Domains',
            value: brands.filter((b) => b.domain).length,
            icon: Globe,
            color: 'text-emerald-400',
            bg: 'bg-emerald-500/10',
          },
        ].map((card, index) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 backdrop-blur"
          >
            <div className="mb-3 flex items-center gap-3">
              <div className={`rounded-lg p-2 ${card.bg}`}>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
              <span className="text-sm text-gray-400">{card.label}</span>
            </div>
            <div className="text-3xl font-bold text-white">{card.value}</div>
          </motion.div>
        ))}
      </div>

      {/* Create Brand Form */}
      {showCreate && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 backdrop-blur"
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Create New Brand</h3>
            <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs text-gray-400">Brand Name *</label>
              <input
                type="text"
                placeholder="My Brand"
                value={createForm.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setCreateForm({ ...createForm, name, slug: createForm.slug || autoSlug(name) });
                }}
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.05] px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500/50 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-gray-400">Slug *</label>
              <input
                type="text"
                placeholder="my-brand"
                value={createForm.slug}
                onChange={(e) => setCreateForm({ ...createForm, slug: e.target.value })}
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.05] px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500/50 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-gray-400">Logo URL</label>
              <input
                type="text"
                placeholder="https://example.com/logo.png"
                value={createForm.logoUrl}
                onChange={(e) => setCreateForm({ ...createForm, logoUrl: e.target.value })}
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.05] px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500/50 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-gray-400">Primary Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={createForm.primaryColor}
                  onChange={(e) => setCreateForm({ ...createForm, primaryColor: e.target.value })}
                  className="h-10 w-10 cursor-pointer rounded-lg border-0 bg-transparent"
                />
                <input
                  type="text"
                  value={createForm.primaryColor}
                  onChange={(e) => setCreateForm({ ...createForm, primaryColor: e.target.value })}
                  className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.05] px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500/50 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-gray-400">Secondary Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={createForm.secondaryColor}
                  onChange={(e) => setCreateForm({ ...createForm, secondaryColor: e.target.value })}
                  className="h-10 w-10 cursor-pointer rounded-lg border-0 bg-transparent"
                />
                <input
                  type="text"
                  value={createForm.secondaryColor}
                  onChange={(e) => setCreateForm({ ...createForm, secondaryColor: e.target.value })}
                  className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.05] px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500/50 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-gray-400">Domain</label>
              <input
                type="text"
                placeholder="brand.example.com"
                value={createForm.domain}
                onChange={(e) => setCreateForm({ ...createForm, domain: e.target.value })}
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.05] px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500/50 focus:outline-none"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="mb-1.5 block text-xs text-gray-400">Description</label>
              <textarea
                placeholder="Brand description..."
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                rows={2}
                className="w-full resize-none rounded-xl border border-white/[0.08] bg-white/[0.05] px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500/50 focus:outline-none"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={createBrand}
              disabled={creating || !createForm.name || !createForm.slug}
              className="flex items-center gap-2 rounded-xl bg-blue-500/20 px-4 py-2 text-blue-400 transition-colors hover:bg-blue-500/30 disabled:opacity-40"
            >
              {creating && <Loader2 className="h-4 w-4 animate-spin" />}
              Create Brand
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="rounded-xl bg-white/[0.05] px-4 py-2 text-gray-300 transition-colors hover:bg-white/[0.1]"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <Loader2 className="mr-2 h-6 w-6 animate-spin" />
          Loading brands...
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="py-12 text-center text-red-400">
          <p>{error}</p>
          <button onClick={fetchBrands} className="mt-3 text-sm text-blue-400 hover:underline">
            Retry
          </button>
        </div>
      )}

      {/* Brands Grid */}
      {!loading && !error && (
        <>
          {brands.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-16 text-center text-gray-400">
              <Palette className="mx-auto mb-3 h-12 w-12 opacity-30" />
              <p>No brands configured yet</p>
              <p className="mt-1 text-sm">Create your first brand to enable white-labeling</p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {brands.map((brand, index) => (
                <motion.div
                  key={brand._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur"
                >
                  {/* Color Banner */}
                  <div
                    className="relative h-20"
                    style={{
                      background: `linear-gradient(135deg, ${brand.primaryColor}, ${brand.secondaryColor})`,
                    }}
                  >
                    {brand.isDefault && (
                      <span className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-black/40 px-2 py-1 text-xs font-medium text-amber-400 backdrop-blur">
                        <Star className="h-3 w-3 fill-amber-400" />
                        Default
                      </span>
                    )}
                    {brand.logoUrl ? (
                      <div className="absolute bottom-0 left-4 flex h-12 w-12 translate-y-1/2 items-center justify-center overflow-hidden rounded-xl border border-white/20 bg-white/10 backdrop-blur">
                        <img src={brand.logoUrl} alt={brand.name} className="h-8 w-8 object-contain" />
                      </div>
                    ) : (
                      <div className="absolute bottom-0 left-4 flex h-12 w-12 translate-y-1/2 items-center justify-center rounded-xl border border-white/20 bg-white/10 backdrop-blur">
                        <Image className="h-5 w-5 text-white/60" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-4 pt-8">
                    <h3 className="text-lg font-semibold text-white">{brand.name}</h3>
                    <p className="mt-0.5 font-mono text-xs text-gray-400">/{brand.slug}</p>
                    {brand.description && (
                      <p className="mt-2 line-clamp-2 text-sm text-gray-400">{brand.description}</p>
                    )}

                    <div className="mt-3 flex items-center gap-3 text-xs text-gray-400">
                      {brand.domain && (
                        <span className="flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          {brand.domain}
                        </span>
                      )}
                      <div className="flex items-center gap-1.5">
                        <span
                          className="h-3 w-3 rounded-sm border border-white/10"
                          style={{ backgroundColor: brand.primaryColor }}
                        />
                        <span
                          className="h-3 w-3 rounded-sm border border-white/10"
                          style={{ backgroundColor: brand.secondaryColor }}
                        />
                      </div>
                    </div>

                    <div className="mt-4 flex gap-2">
                      {!brand.isDefault && (
                        <button
                          onClick={() => setDefault(brand._id)}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-amber-500/10 px-3 py-2 text-sm text-amber-400 transition-colors hover:bg-amber-500/20"
                        >
                          <Star className="h-3.5 w-3.5" />
                          Set Default
                        </button>
                      )}
                      <button
                        onClick={() => deleteBrand(brand._id)}
                        className="flex items-center justify-center gap-1.5 rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/20"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
