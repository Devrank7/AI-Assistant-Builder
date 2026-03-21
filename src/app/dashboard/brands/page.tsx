'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Palette,
  Plus,
  Trash2,
  Loader2,
  Globe,
  Star,
  X,
  Edit3,
  Check,
  Layers,
  Link2,
  Type,
  Eye,
  EyeOff,
  AlertTriangle,
  RefreshCw,
  Zap,
  Twitter,
  Instagram,
  Facebook,
  Linkedin,
  Youtube,
  ChevronDown,
  ChevronUp,
  Copy,
  CheckCircle2,
  ToggleLeft,
  ToggleRight,
  Upload,
} from 'lucide-react';

/* ─────────────────────────── Types ─────────────────────────── */

interface SocialLink {
  platform: string;
  url: string;
}

interface Brand {
  _id: string;
  brandId: string;
  organizationId: string;
  name: string;
  logo: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  domain: string;
  tagline: string;
  description: string;
  socialLinks: SocialLink[];
  widgetIds: string[];
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
}

interface Widget {
  clientId: string;
  widgetName: string;
  clientType: string;
}

/* ─────────────────────────── Constants ─────────────────────── */

const FONT_OPTIONS = [
  'Inter',
  'Roboto',
  'Open Sans',
  'Lato',
  'Montserrat',
  'Poppins',
  'Raleway',
  'Nunito',
  'Source Sans Pro',
  'Playfair Display',
  'Merriweather',
  'Ubuntu',
];

const SOCIAL_PLATFORMS = [
  { id: 'twitter', label: 'Twitter / X', icon: Twitter, placeholder: 'https://twitter.com/username' },
  { id: 'instagram', label: 'Instagram', icon: Instagram, placeholder: 'https://instagram.com/username' },
  { id: 'facebook', label: 'Facebook', icon: Facebook, placeholder: 'https://facebook.com/page' },
  { id: 'linkedin', label: 'LinkedIn', icon: Linkedin, placeholder: 'https://linkedin.com/company/name' },
  { id: 'youtube', label: 'YouTube', icon: Youtube, placeholder: 'https://youtube.com/@channel' },
];

interface BrandFormData {
  name: string;
  logo: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  domain: string;
  tagline: string;
  description: string;
  socialLinks: SocialLink[];
  isDefault: boolean;
  isActive: boolean;
}

const EMPTY_FORM: BrandFormData = {
  name: '',
  logo: '',
  primaryColor: '#3B82F6',
  secondaryColor: '#8B5CF6',
  accentColor: '#06B6D4',
  fontFamily: 'Inter',
  domain: '',
  tagline: '',
  description: '',
  socialLinks: [],
  isDefault: false,
  isActive: true,
};

/* ─────────────────────────── Animations ─────────────────────── */

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.25, 0.4, 0.25, 1] as const } },
};

const cardAnim = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 110, damping: 16 },
  },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
};

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};

/* ─────────────────────────── Helpers ─────────────────────────── */

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : null;
}

function luminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastColor(hex: string): string {
  return luminance(hex) > 0.4 ? '#111827' : '#ffffff';
}

function platformIcon(platform: string) {
  switch (platform.toLowerCase()) {
    case 'twitter':
      return Twitter;
    case 'instagram':
      return Instagram;
    case 'facebook':
      return Facebook;
    case 'linkedin':
      return Linkedin;
    case 'youtube':
      return Youtube;
    default:
      return Link2;
  }
}

/* ─────────────────────────── ColorField ─────────────────────── */

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs text-gray-400">{label}</label>
      <div className="flex items-center gap-2">
        <div className="relative h-9 w-9 flex-shrink-0 overflow-hidden rounded-lg border border-white/10">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer border-0 bg-transparent opacity-0"
          />
          <div className="h-full w-full rounded-lg" style={{ backgroundColor: value }} />
        </div>
        <input
          type="text"
          value={value}
          maxLength={7}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 font-mono text-xs text-white placeholder-gray-500 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 focus:outline-none"
        />
      </div>
    </div>
  );
}

/* ─────────────────────────── SocialLinksEditor ──────────────── */

function SocialLinksEditor({ links, onChange }: { links: SocialLink[]; onChange: (links: SocialLink[]) => void }) {
  const addLink = (platform: string) => {
    if (links.find((l) => l.platform === platform)) return;
    onChange([...links, { platform, url: '' }]);
  };
  const updateUrl = (platform: string, url: string) => {
    onChange(links.map((l) => (l.platform === platform ? { ...l, url } : l)));
  };
  const removeLink = (platform: string) => {
    onChange(links.filter((l) => l.platform !== platform));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {SOCIAL_PLATFORMS.map(({ id, label, icon: Icon }) => {
          const active = links.find((l) => l.platform === id);
          return (
            <button
              key={id}
              type="button"
              onClick={() => (active ? removeLink(id) : addLink(id))}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition-all ${
                active
                  ? 'border border-blue-500/40 bg-blue-500/20 text-blue-300'
                  : 'border border-white/[0.06] bg-white/[0.03] text-gray-400 hover:border-white/10 hover:text-gray-300'
              }`}
            >
              <Icon className="h-3 w-3" />
              {label}
            </button>
          );
        })}
      </div>
      <AnimatePresence>
        {links.map(({ platform, url }) => {
          const meta = SOCIAL_PLATFORMS.find((p) => p.id === platform);
          const Icon = platformIcon(platform);
          return (
            <motion.div
              key={platform}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2"
            >
              <Icon className="h-4 w-4 flex-shrink-0 text-gray-400" />
              <input
                type="url"
                placeholder={meta?.placeholder || 'https://'}
                value={url}
                onChange={(e) => updateUrl(platform, e.target.value)}
                className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => removeLink(platform)}
                className="rounded-lg p-1.5 text-gray-500 hover:text-red-400"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────────── BrandPreviewCard ───────────────── */

function BrandPreviewCard({ form }: { form: BrandFormData }) {
  const textColor = contrastColor(form.primaryColor);
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 shadow-lg">
      <div
        className="relative flex h-24 items-center justify-between px-5"
        style={{ background: `linear-gradient(135deg, ${form.primaryColor} 0%, ${form.secondaryColor} 100%)` }}
      >
        {form.logo ? (
          <img src={form.logo} alt="logo" className="h-10 w-10 rounded-lg object-contain" />
        ) : (
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold"
            style={{ backgroundColor: `${form.accentColor}33`, color: textColor }}
          >
            {form.name ? form.name.charAt(0).toUpperCase() : 'B'}
          </div>
        )}
        <div className="flex-1 px-4">
          <p className="leading-tight font-semibold" style={{ color: textColor, fontFamily: form.fontFamily }}>
            {form.name || 'Brand Name'}
          </p>
          {form.tagline && (
            <p className="mt-0.5 text-xs opacity-80" style={{ color: textColor, fontFamily: form.fontFamily }}>
              {form.tagline}
            </p>
          )}
        </div>
        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: form.accentColor }} />
      </div>
      <div className="bg-white/[0.02] p-4">
        {form.description && <p className="mb-3 line-clamp-2 text-xs text-gray-400">{form.description}</p>}
        <div className="flex items-center gap-2">
          {(['primaryColor', 'secondaryColor', 'accentColor'] as const).map((key) => (
            <div key={key} className="flex items-center gap-1.5">
              <div className="h-4 w-4 rounded border border-white/10" style={{ backgroundColor: form[key] }} />
              <span className="font-mono text-xs text-gray-500">{form[key]}</span>
            </div>
          ))}
        </div>
        {form.domain && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-400">
            <Globe className="h-3 w-3" />
            {form.domain}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────── BrandModal ─────────────────────── */

function BrandModal({
  initial,
  title,
  onSave,
  onClose,
  saving,
}: {
  initial: BrandFormData;
  title: string;
  onSave: (data: BrandFormData) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<BrandFormData>(initial);
  const [showPreview, setShowPreview] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('identity');
  const logoInputRef = useRef<HTMLInputElement>(null);

  const set = (key: keyof BrandFormData, value: unknown) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => set('logo', reader.result as string);
    reader.readAsDataURL(file);
  };

  const sections = [
    { id: 'identity', label: 'Identity', icon: Type },
    { id: 'colors', label: 'Colors', icon: Palette },
    { id: 'social', label: 'Social', icon: Link2 },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', stiffness: 280, damping: 28 }}
        className="relative my-8 w-full max-w-2xl rounded-2xl border border-white/[0.08] bg-[#0f0f18] shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-pink-500/20 p-2">
              <Palette className="h-5 w-5 text-pink-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">{title}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-xs text-gray-400 transition-colors hover:text-white"
            >
              {showPreview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              Preview
            </button>
            <button onClick={onClose} className="rounded-lg p-1.5 text-gray-500 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Live Preview */}
          <AnimatePresence>
            {showPreview && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-5 overflow-hidden"
              >
                <BrandPreviewCard form={form} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Section tabs */}
          <div className="mb-5 flex gap-1 rounded-xl border border-white/[0.06] bg-white/[0.02] p-1">
            {sections.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveSection(id)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition-all ${
                  activeSection === id ? 'bg-white/[0.08] text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>

          {/* Identity */}
          {activeSection === 'identity' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-xs text-gray-400">Brand Name *</label>
                  <input
                    type="text"
                    placeholder="Acme Corp"
                    value={form.name}
                    onChange={(e) => set('name', e.target.value)}
                    className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs text-gray-400">Tagline</label>
                  <input
                    type="text"
                    placeholder="Empowering your business"
                    value={form.tagline}
                    onChange={(e) => set('tagline', e.target.value)}
                    className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs text-gray-400">Custom Domain</label>
                  <div className="flex items-center rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/20">
                    <Globe className="mr-2 h-4 w-4 flex-shrink-0 text-gray-500" />
                    <input
                      type="text"
                      placeholder="chat.yourcompany.com"
                      value={form.domain}
                      onChange={(e) => set('domain', e.target.value)}
                      className="w-full bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-xs text-gray-400">Description</label>
                  <textarea
                    placeholder="Brief description of this brand..."
                    value={form.description}
                    onChange={(e) => set('description', e.target.value)}
                    rows={3}
                    className="w-full resize-none rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 focus:outline-none"
                  />
                </div>
              </div>

              {/* Logo */}
              <div>
                <label className="mb-1.5 block text-xs text-gray-400">Logo</label>
                <div className="flex items-start gap-3">
                  <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.03]">
                    {form.logo ? (
                      <img src={form.logo} alt="logo" className="h-12 w-12 object-contain" />
                    ) : (
                      <Palette className="h-6 w-6 text-gray-600" />
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-2">
                    <input
                      type="text"
                      placeholder="https://example.com/logo.png"
                      value={form.logo.startsWith('data:') ? '' : form.logo}
                      onChange={(e) => set('logo', e.target.value)}
                      className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-xs text-gray-400 transition-colors hover:border-white/10 hover:text-white"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      Upload image (base64)
                    </button>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoUpload}
                    />
                  </div>
                </div>
              </div>

              {/* Font family */}
              <div>
                <label className="mb-1.5 block text-xs text-gray-400">Font Family</label>
                <div className="relative">
                  <Type className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-500" />
                  <select
                    value={form.fontFamily}
                    onChange={(e) => set('fontFamily', e.target.value)}
                    className="w-full appearance-none rounded-xl border border-white/[0.08] bg-white/[0.04] py-2.5 pr-8 pl-9 text-sm text-white focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 focus:outline-none"
                  >
                    {FONT_OPTIONS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-gray-500" />
                </div>
              </div>

              {/* Toggles */}
              <div className="flex flex-wrap gap-4 pt-1">
                <button
                  type="button"
                  onClick={() => set('isActive', !form.isActive)}
                  className="flex items-center gap-2 text-sm"
                >
                  {form.isActive ? (
                    <ToggleRight className="h-5 w-5 text-emerald-400" />
                  ) : (
                    <ToggleLeft className="h-5 w-5 text-gray-500" />
                  )}
                  <span className={form.isActive ? 'text-emerald-400' : 'text-gray-500'}>Active</span>
                </button>
                <button
                  type="button"
                  onClick={() => set('isDefault', !form.isDefault)}
                  className="flex items-center gap-2 text-sm"
                >
                  <Star className={`h-4 w-4 ${form.isDefault ? 'fill-amber-400 text-amber-400' : 'text-gray-500'}`} />
                  <span className={form.isDefault ? 'text-amber-400' : 'text-gray-500'}>Set as default</span>
                </button>
              </div>
            </div>
          )}

          {/* Colors */}
          {activeSection === 'colors' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <ColorField label="Primary" value={form.primaryColor} onChange={(v) => set('primaryColor', v)} />
                <ColorField label="Secondary" value={form.secondaryColor} onChange={(v) => set('secondaryColor', v)} />
                <ColorField label="Accent" value={form.accentColor} onChange={(v) => set('accentColor', v)} />
              </div>

              {/* Gradient preview */}
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                <p className="mb-3 text-xs font-medium text-gray-400">Gradient preview</p>
                <div
                  className="h-16 rounded-xl"
                  style={{
                    background: `linear-gradient(135deg, ${form.primaryColor} 0%, ${form.secondaryColor} 50%, ${form.accentColor} 100%)`,
                  }}
                />
              </div>

              {/* Contrast check */}
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <p className="mb-2 text-xs font-medium text-gray-400">Text contrast</p>
                <div className="flex gap-2">
                  {[form.primaryColor, form.secondaryColor, form.accentColor].map((c, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-lg px-3 py-2 text-center text-xs font-medium"
                      style={{ backgroundColor: c, color: contrastColor(c) }}
                    >
                      Aa
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Social */}
          {activeSection === 'social' && (
            <div>
              <p className="mb-3 text-xs text-gray-500">Social links that appear on your branded widgets.</p>
              <SocialLinksEditor links={form.socialLinks} onChange={(links) => set('socialLinks', links)} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-white/[0.06] px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-xl bg-white/[0.04] px-4 py-2 text-sm text-gray-400 transition-colors hover:bg-white/[0.07] hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={saving || !form.name.trim()}
            className="flex items-center gap-2 rounded-xl bg-blue-600/80 px-5 py-2 text-sm font-medium text-white transition-all hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {saving ? 'Saving…' : 'Save Brand'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─────────────────────────── ApplyBrandModal ────────────────── */

function ApplyBrandModal({
  brand,
  widgets,
  onApply,
  onClose,
  applying,
}: {
  brand: Brand;
  widgets: Widget[];
  onApply: (widgetIds: string[]) => void;
  onClose: () => void;
  applying: boolean;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(brand.widgetIds));

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const allSelected = widgets.length > 0 && selected.size === widgets.length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 280, damping: 28 }}
        className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#0f0f18] shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <div>
            <h3 className="font-semibold text-white">Apply Brand to Widgets</h3>
            <p className="mt-0.5 text-xs text-gray-500">
              Apply <span className="text-blue-400">{brand.name}</span> theme to selected widgets
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-500 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4">
          <div
            className="mb-4 h-2 w-full rounded-full"
            style={{
              background: `linear-gradient(90deg, ${brand.primaryColor}, ${brand.secondaryColor}, ${brand.accentColor})`,
            }}
          />

          {widgets.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">No widgets found for your account.</p>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs text-gray-500">{widgets.length} widget(s)</span>
                <button
                  onClick={() => setSelected(allSelected ? new Set() : new Set(widgets.map((w) => w.clientId)))}
                  className="text-xs text-blue-400 hover:underline"
                >
                  {allSelected ? 'Deselect all' : 'Select all'}
                </button>
              </div>
              <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
                {widgets.map((w) => (
                  <label
                    key={w.clientId}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-all ${
                      selected.has(w.clientId)
                        ? 'border-blue-500/30 bg-blue-500/10'
                        : 'border-white/[0.06] bg-white/[0.02] hover:border-white/10'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(w.clientId)}
                      onChange={() => toggle(w.clientId)}
                      className="hidden"
                    />
                    <div
                      className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border ${
                        selected.has(w.clientId) ? 'border-blue-500 bg-blue-500' : 'border-white/20 bg-transparent'
                      }`}
                    >
                      {selected.has(w.clientId) && <Check className="h-2.5 w-2.5 text-white" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">{w.widgetName || w.clientId}</p>
                      <p className="text-xs text-gray-500 capitalize">{w.clientType}</p>
                    </div>
                  </label>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-white/[0.06] px-5 py-4">
          <button
            onClick={onClose}
            className="rounded-xl bg-white/[0.04] px-4 py-2 text-sm text-gray-400 transition-colors hover:bg-white/[0.07]"
          >
            Cancel
          </button>
          <button
            onClick={() => onApply([...selected])}
            disabled={applying}
            className="flex items-center gap-2 rounded-xl bg-blue-600/80 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-blue-600 disabled:opacity-40"
          >
            {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            Apply to {selected.size} widget{selected.size !== 1 ? 's' : ''}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─────────────────────────── DeleteConfirmModal ─────────────── */

function DeleteConfirmModal({
  brand,
  onConfirm,
  onClose,
  deleting,
}: {
  brand: Brand;
  onConfirm: () => void;
  onClose: () => void;
  deleting: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="w-full max-w-sm rounded-2xl border border-red-500/20 bg-[#0f0f18] p-6 shadow-2xl"
      >
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10">
          <AlertTriangle className="h-6 w-6 text-red-400" />
        </div>
        <h3 className="mb-1 text-base font-semibold text-white">Delete Brand</h3>
        <p className="mb-4 text-sm text-gray-400">
          Are you sure you want to delete <span className="font-medium text-white">{brand.name}</span>? This cannot be
          undone.
          {brand.widgetIds.length > 0 && (
            <span className="mt-1 block text-amber-400">
              This brand is applied to {brand.widgetIds.length} widget(s).
            </span>
          )}
        </p>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl bg-white/[0.04] py-2 text-sm text-gray-400 transition-colors hover:bg-white/[0.07]"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-red-500/20 py-2 text-sm text-red-400 transition-all hover:bg-red-500/30 disabled:opacity-40"
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Delete
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─────────────────────────── BrandCard ─────────────────────── */

function BrandCard({
  brand,
  onEdit,
  onDelete,
  onApply,
  onToggleActive,
  onSetDefault,
  copiedId,
  onCopy,
}: {
  brand: Brand;
  onEdit: (b: Brand) => void;
  onDelete: (b: Brand) => void;
  onApply: (b: Brand) => void;
  onToggleActive: (b: Brand) => void;
  onSetDefault: (b: Brand) => void;
  copiedId: string | null;
  onCopy: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      variants={cardAnim}
      layout
      className={`overflow-hidden rounded-2xl border transition-all ${
        brand.isActive ? 'border-white/[0.07]' : 'border-white/[0.03] opacity-60'
      } bg-white/[0.02] backdrop-blur`}
    >
      {/* Color Banner */}
      <div
        className="relative h-24"
        style={{
          background: `linear-gradient(135deg, ${brand.primaryColor} 0%, ${brand.secondaryColor} 60%, ${brand.accentColor} 100%)`,
        }}
      >
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          {brand.isDefault && (
            <span className="flex items-center gap-1 rounded-full bg-black/40 px-2 py-0.5 text-xs font-medium text-amber-400 backdrop-blur">
              <Star className="h-3 w-3 fill-amber-400" />
              Default
            </span>
          )}
          {!brand.isActive && (
            <span className="rounded-full bg-black/40 px-2 py-0.5 text-xs font-medium text-gray-400 backdrop-blur">
              Inactive
            </span>
          )}
        </div>

        {/* Logo or initial */}
        <div className="absolute bottom-0 left-4 translate-y-1/2">
          {brand.logo ? (
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border border-white/20 bg-white/10 backdrop-blur">
              <img src={brand.logo} alt={brand.name} className="h-9 w-9 object-contain" />
            </div>
          ) : (
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-sm font-bold backdrop-blur"
              style={{ color: contrastColor(brand.primaryColor) }}
            >
              {brand.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Color dots */}
        <div className="absolute right-3 bottom-3 flex gap-1">
          {[brand.primaryColor, brand.secondaryColor, brand.accentColor].map((c, i) => (
            <div key={i} className="h-3 w-3 rounded-full border border-white/20" style={{ backgroundColor: c }} />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pt-7 pb-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-semibold text-white">{brand.name}</h3>
            {brand.tagline && <p className="truncate text-xs text-gray-500">{brand.tagline}</p>}
          </div>
          <button
            onClick={() => onCopy(brand._id)}
            className="mt-0.5 rounded-lg p-1 text-gray-600 transition-colors hover:text-gray-400"
            title="Copy brand ID"
          >
            {copiedId === brand._id ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>
        </div>

        {/* Stats row */}
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Layers className="h-3 w-3" />
            {brand.widgetIds.length} widget{brand.widgetIds.length !== 1 ? 's' : ''}
          </span>
          {brand.domain && (
            <span className="flex items-center gap-1 truncate">
              <Globe className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{brand.domain}</span>
            </span>
          )}
          {brand.fontFamily && (
            <span className="flex items-center gap-1">
              <Type className="h-3 w-3" />
              {brand.fontFamily}
            </span>
          )}
        </div>

        {/* Description */}
        {brand.description && (
          <div className="mt-2">
            <p className={`text-xs text-gray-400 ${!expanded ? 'line-clamp-2' : ''}`}>{brand.description}</p>
            {brand.description.length > 90 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="mt-0.5 flex items-center gap-0.5 text-xs text-blue-400 hover:underline"
              >
                {expanded ? (
                  <>
                    <ChevronUp className="h-3 w-3" /> Less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3" /> More
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Social links */}
        {brand.socialLinks.length > 0 && (
          <div className="mt-2 flex gap-2">
            {brand.socialLinks.slice(0, 4).map((s) => {
              const Icon = platformIcon(s.platform);
              return (
                <a
                  key={s.platform}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg bg-white/[0.04] p-1.5 text-gray-500 transition-colors hover:text-white"
                >
                  <Icon className="h-3 w-3" />
                </a>
              );
            })}
          </div>
        )}

        {/* Actions */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          <button
            onClick={() => onEdit(brand)}
            className="flex items-center gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-xs text-gray-400 transition-all hover:border-blue-500/30 hover:bg-blue-500/10 hover:text-blue-300"
          >
            <Edit3 className="h-3 w-3" /> Edit
          </button>
          <button
            onClick={() => onApply(brand)}
            className="flex items-center gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-xs text-gray-400 transition-all hover:border-purple-500/30 hover:bg-purple-500/10 hover:text-purple-300"
          >
            <Zap className="h-3 w-3" /> Apply
          </button>
          {!brand.isDefault && (
            <button
              onClick={() => onSetDefault(brand)}
              className="flex items-center gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-xs text-gray-400 transition-all hover:border-amber-500/30 hover:bg-amber-500/10 hover:text-amber-300"
            >
              <Star className="h-3 w-3" /> Default
            </button>
          )}
          <button
            onClick={() => onToggleActive(brand)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs transition-all ${
              brand.isActive
                ? 'border-white/[0.06] bg-white/[0.03] text-gray-400 hover:border-orange-500/30 hover:bg-orange-500/10 hover:text-orange-300'
                : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
            }`}
          >
            {brand.isActive ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            {brand.isActive ? 'Deactivate' : 'Activate'}
          </button>
          <button
            onClick={() => onDelete(brand)}
            className="flex items-center gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-xs text-gray-400 transition-all hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────── Main Page ─────────────────────── */

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [deletingBrand, setDeletingBrand] = useState<Brand | null>(null);
  const [applyingBrand, setApplyingBrand] = useState<Brand | null>(null);
  const [savingBrand, setSavingBrand] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchBrands = useCallback(
    async (isRetry = false) => {
      if (!isRetry) setLoading(true);
      setError('');
      try {
        const res = await fetch('/api/brands');
        if (res.status === 401) {
          if (retryCount < 1) {
            setRetryCount((c) => c + 1);
            await new Promise((r) => setTimeout(r, 800));
            return fetchBrands(true);
          }
          setError('Session expired. Please refresh the page.');
          return;
        }
        const json = await res.json();
        if (json.success) setBrands(json.data || []);
        else setError(json.error || 'Failed to load brands');
      } catch {
        setError('Network error — unable to reach the server.');
      } finally {
        setLoading(false);
      }
    },
    [retryCount]
  );

  const fetchWidgets = useCallback(async () => {
    try {
      const res = await fetch('/api/clients');
      const json = await res.json();
      if (json.success) {
        setWidgets(
          (json.data || []).map((c: { clientId: string; widgetName?: string; clientType?: string }) => ({
            clientId: c.clientId,
            widgetName: c.widgetName || c.clientId,
            clientType: c.clientType || 'quick',
          }))
        );
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    fetchBrands();
    fetchWidgets();
  }, [fetchBrands, fetchWidgets]);

  const handleCreateBrand = async (form: BrandFormData) => {
    setSavingBrand(true);
    try {
      const res = await fetch('/api/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) {
        setShowCreate(false);
        fetchBrands();
      } else alert(json.error || 'Failed to create brand');
    } catch {
      alert('Network error');
    } finally {
      setSavingBrand(false);
    }
  };

  const handleUpdateBrand = async (form: BrandFormData) => {
    if (!editingBrand) return;
    setSavingBrand(true);
    try {
      const res = await fetch(`/api/brands/${editingBrand._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) {
        setEditingBrand(null);
        fetchBrands();
      } else alert(json.error || 'Failed to update brand');
    } catch {
      alert('Network error');
    } finally {
      setSavingBrand(false);
    }
  };

  const handleDeleteBrand = async () => {
    if (!deletingBrand) return;
    setDeletingId(deletingBrand._id);
    try {
      const res = await fetch(`/api/brands/${deletingBrand._id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setDeletingBrand(null);
        fetchBrands();
      } else alert(json.error || 'Failed to delete');
    } catch {
      alert('Network error');
    } finally {
      setDeletingId(null);
    }
  };

  const handleApplyBrand = async (widgetIds: string[]) => {
    if (!applyingBrand) return;
    setApplyingId(applyingBrand._id);
    try {
      const res = await fetch(`/api/brands/${applyingBrand._id}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ widgetIds }),
      });
      const json = await res.json();
      if (json.success) {
        setApplyingBrand(null);
        fetchBrands();
      } else alert(json.error || 'Failed to apply brand');
    } catch {
      alert('Network error');
    } finally {
      setApplyingId(null);
    }
  };

  const handleToggleActive = async (brand: Brand) => {
    try {
      await fetch(`/api/brands/${brand._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !brand.isActive }),
      });
      fetchBrands();
    } catch {
      alert('Network error');
    }
  };

  const handleSetDefault = async (brand: Brand) => {
    try {
      await fetch(`/api/brands/${brand._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDefault: true }),
      });
      fetchBrands();
    } catch {
      alert('Network error');
    }
  };

  const handleCopy = (id: string) => {
    navigator.clipboard.writeText(id).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const totalWidgetsLinked = brands.reduce((acc, b) => acc + b.widgetIds.length, 0);
  const activeBrands = brands.filter((b) => b.isActive).length;
  const defaultBrand = brands.find((b) => b.isDefault);

  return (
    <div className="min-h-screen space-y-6 bg-[#0a0a0f] p-6">
      {/* Header */}
      <motion.div {...fadeUp} className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-pink-500/20 p-2.5">
            <Palette className="h-6 w-6 text-pink-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Brand Management</h1>
            <p className="text-sm text-gray-500">White-label identities for your AI widgets</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-xl bg-blue-500/20 px-4 py-2.5 text-sm font-medium text-blue-400 transition-all hover:bg-blue-500/30"
        >
          <Plus className="h-4 w-4" />
          New Brand
        </button>
      </motion.div>

      {/* Stats */}
      <motion.div {...fadeUp} className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Total Brands', value: brands.length, icon: Palette, color: 'text-pink-400', bg: 'bg-pink-500/10' },
          { label: 'Active', value: activeBrands, icon: Eye, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          {
            label: 'Default Brand',
            value: defaultBrand?.name || '—',
            icon: Star,
            color: 'text-amber-400',
            bg: 'bg-amber-500/10',
          },
          {
            label: 'Widgets Linked',
            value: totalWidgetsLinked,
            icon: Layers,
            color: 'text-blue-400',
            bg: 'bg-blue-500/10',
          },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 backdrop-blur">
            <div className="mb-2 flex items-center gap-2">
              <div className={`rounded-lg p-1.5 ${card.bg}`}>
                <card.icon className={`h-3.5 w-3.5 ${card.color}`} />
              </div>
              <span className="text-xs text-gray-500">{card.label}</span>
            </div>
            <div className="truncate text-xl font-bold text-white">{card.value}</div>
          </div>
        ))}
      </motion.div>

      {/* ── Loading ── */}
      {loading && (
        <div className="flex items-center justify-center py-24 text-gray-500">
          <Loader2 className="mr-2 h-6 w-6 animate-spin" />
          Loading brands…
        </div>
      )}

      {/* ── Error ── */}
      {error && !loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center"
        >
          <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-red-400 opacity-60" />
          <p className="text-sm text-red-400">{error}</p>
          <button
            onClick={() => fetchBrands()}
            className="mx-auto mt-4 flex items-center gap-2 rounded-xl bg-white/[0.06] px-4 py-2 text-sm text-gray-300 transition-colors hover:bg-white/[0.1]"
          >
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
        </motion.div>
      )}

      {/* ── Empty state ── */}
      {!loading && !error && brands.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-24 text-center"
        >
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-pink-500/10">
            <Palette className="h-10 w-10 text-pink-400 opacity-50" />
          </div>
          <h3 className="mb-1 text-lg font-semibold text-white">No brands yet</h3>
          <p className="mb-6 max-w-xs text-sm text-gray-500">
            Create your first brand to unlock white-labeling, custom domains, and per-widget theming.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-xl bg-blue-500/20 px-5 py-2.5 text-sm font-medium text-blue-400 transition-all hover:bg-blue-500/30"
          >
            <Plus className="h-4 w-4" />
            Create first brand
          </button>
        </motion.div>
      )}

      {/* ── Brands Grid ── */}
      {!loading && !error && brands.length > 0 && (
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
        >
          <AnimatePresence mode="popLayout">
            {brands.map((brand) => (
              <BrandCard
                key={brand._id}
                brand={brand}
                onEdit={setEditingBrand}
                onDelete={setDeletingBrand}
                onApply={setApplyingBrand}
                onToggleActive={handleToggleActive}
                onSetDefault={handleSetDefault}
                copiedId={copiedId}
                onCopy={handleCopy}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* ── Modals ── */}
      <AnimatePresence>
        {showCreate && (
          <BrandModal
            key="create"
            title="Create New Brand"
            initial={EMPTY_FORM}
            onSave={handleCreateBrand}
            onClose={() => setShowCreate(false)}
            saving={savingBrand}
          />
        )}
        {editingBrand && (
          <BrandModal
            key="edit"
            title={`Edit — ${editingBrand.name}`}
            initial={{
              name: editingBrand.name,
              logo: editingBrand.logo,
              primaryColor: editingBrand.primaryColor,
              secondaryColor: editingBrand.secondaryColor,
              accentColor: editingBrand.accentColor,
              fontFamily: editingBrand.fontFamily || 'Inter',
              domain: editingBrand.domain,
              tagline: editingBrand.tagline,
              description: editingBrand.description,
              socialLinks: editingBrand.socialLinks,
              isDefault: editingBrand.isDefault,
              isActive: editingBrand.isActive,
            }}
            onSave={handleUpdateBrand}
            onClose={() => setEditingBrand(null)}
            saving={savingBrand}
          />
        )}
        {deletingBrand && (
          <DeleteConfirmModal
            key="delete"
            brand={deletingBrand}
            onConfirm={handleDeleteBrand}
            onClose={() => setDeletingBrand(null)}
            deleting={!!deletingId}
          />
        )}
        {applyingBrand && (
          <ApplyBrandModal
            key="apply"
            brand={applyingBrand}
            widgets={widgets}
            onApply={handleApplyBrand}
            onClose={() => setApplyingBrand(null)}
            applying={!!applyingId}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
