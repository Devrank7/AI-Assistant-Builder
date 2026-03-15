// src/components/playground/ControlPanel.tsx

'use client';

import { useState, useCallback } from 'react';
import ColorPicker from './ColorPicker';
import { GOOGLE_FONTS, REBUILD_ONLY_FIELDS, PlaygroundConfig } from '@/lib/playgroundValidation';

interface ControlPanelProps {
  theme: Record<string, unknown>;
  config: {
    botName: string;
    greeting: string;
    quickReplies: string[];
    tone: string | null;
  };
  clientId: string;
  siteProfile: Record<string, unknown> | null;
  rebuildRequired: boolean;
  onThemeChange: (key: string, value: unknown) => void;
  onConfigChange: (updates: Partial<PlaygroundConfig>) => void;
}

// Accordion section wrapper
function Section({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-white/5">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-white/5"
      >
        {title}
        <svg
          className={`h-4 w-4 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="space-y-3 px-4 pb-4">{children}</div>}
    </div>
  );
}

function RebuildBadge() {
  return (
    <span className="ml-2 inline-flex items-center rounded bg-yellow-500/15 px-1.5 py-0.5 text-[10px] font-medium text-yellow-400">
      Rebuild required
    </span>
  );
}

export default function ControlPanel({
  theme,
  config,
  clientId,
  siteProfile,
  rebuildRequired,
  onThemeChange,
  onConfigChange,
}: ControlPanelProps) {
  // Avatar upload handler
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const handleAvatarUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setUploadingAvatar(true);
      try {
        const formData = new FormData();
        formData.append('avatar', file);
        const res = await fetch(`/api/user/playground/avatar/${clientId}`, { method: 'POST', body: formData });
        const data = await res.json();
        if (data.success) setAvatarUrl(data.data.url);
      } catch {
        /* ignore */
      }
      setUploadingAvatar(false);
    },
    [clientId]
  );

  // "Auto from site" — restore original colors from siteProfile
  const restoreFromSite = useCallback(() => {
    if (!siteProfile) return;
    const colorKeys = [
      'headerFrom',
      'headerTo',
      'toggleFrom',
      'toggleTo',
      'sendFrom',
      'sendTo',
      'userMsgFrom',
      'userMsgTo',
    ];
    for (const key of colorKeys) {
      if (siteProfile[key]) onThemeChange(key, siteProfile[key]);
    }
  }, [siteProfile, onThemeChange]);

  // --- Colors Section ---
  const colorGroups = [
    { label: 'Header', fields: ['headerFrom', 'headerTo'] },
    { label: 'Toggle Button', fields: ['toggleFrom', 'toggleTo'] },
    { label: 'Send Button', fields: ['sendFrom', 'sendTo'] },
    { label: 'User Message', fields: ['userMsgFrom', 'userMsgTo'] },
  ];

  // --- Quick Replies ---
  const quickReplies = config.quickReplies || [];

  const addQuickReply = useCallback(() => {
    if (quickReplies.length >= 5) return;
    onConfigChange({ quickReplies: [...quickReplies, ''] });
  }, [quickReplies, onConfigChange]);

  const updateQuickReply = useCallback(
    (index: number, value: string) => {
      const updated = [...quickReplies];
      updated[index] = value;
      onConfigChange({ quickReplies: updated });
    },
    [quickReplies, onConfigChange]
  );

  const removeQuickReply = useCallback(
    (index: number) => {
      onConfigChange({ quickReplies: quickReplies.filter((_, i) => i !== index) });
    },
    [quickReplies, onConfigChange]
  );

  // Current font name from font stack
  const currentFontName = GOOGLE_FONTS.find((f) => (theme.font as string)?.includes(f.name))?.name || 'Custom';

  return (
    <div className="h-full overflow-y-auto">
      {/* 1. Colors */}
      <Section title="Colors" defaultOpen>
        {colorGroups.map((group) => (
          <div key={group.label} className="space-y-2">
            <p className="text-xs font-medium text-gray-300">{group.label}</p>
            {group.fields.map((field) => (
              <ColorPicker
                key={field}
                label={field.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
                value={(theme[field] as string) || '#000000'}
                onChange={(hex) => onThemeChange(field, hex)}
              />
            ))}
          </div>
        ))}
        {siteProfile && (
          <button
            type="button"
            onClick={restoreFromSite}
            className="w-full rounded-lg border border-dashed border-cyan-500/30 py-1.5 text-xs text-cyan-400 transition-colors hover:bg-cyan-500/10"
          >
            Auto from site
          </button>
        )}
      </Section>

      {/* 2. Typography */}
      <Section title="Typography">
        <div>
          <label className="mb-1 block text-xs text-gray-400">
            Font Family
            {(REBUILD_ONLY_FIELDS as readonly string[]).includes('font') && <RebuildBadge />}
          </label>
          <select
            value={currentFontName}
            onChange={(e) => {
              const selected = GOOGLE_FONTS.find((f) => f.name === e.target.value);
              if (selected) {
                onThemeChange(
                  'font',
                  `'${selected.name}', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
                );
                onThemeChange('fontUrl', selected.url);
              }
            }}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-cyan-500/50 focus:outline-none"
          >
            {currentFontName === 'Custom' && (
              <option value="Custom">Custom ({(theme.font as string)?.split(',')[0]})</option>
            )}
            {GOOGLE_FONTS.map((f) => (
              <option key={f.name} value={f.name}>
                {f.name}
              </option>
            ))}
          </select>
        </div>
      </Section>

      {/* 3. Layout */}
      <Section title="Layout">
        {/* Width slider */}
        <div>
          <label className="mb-1 flex items-center text-xs text-gray-400">
            Width: {parseInt(theme.widgetW as string) || 370}px
            <RebuildBadge />
          </label>
          <input
            type="range"
            min={300}
            max={500}
            step={10}
            value={parseInt(theme.widgetW as string) || 370}
            onChange={(e) => {
              const v = `${e.target.value}px`;
              onThemeChange('widgetW', v);
              onThemeChange('widgetMaxW', v);
            }}
            className="w-full accent-cyan-500"
          />
        </div>

        {/* Height slider */}
        <div>
          <label className="mb-1 flex items-center text-xs text-gray-400">
            Height: {parseInt(theme.widgetH as string) || 540}px
            <RebuildBadge />
          </label>
          <input
            type="range"
            min={400}
            max={700}
            step={10}
            value={parseInt(theme.widgetH as string) || 540}
            onChange={(e) => {
              const v = `${e.target.value}px`;
              onThemeChange('widgetH', v);
              onThemeChange('widgetMaxH', v);
            }}
            className="w-full accent-cyan-500"
          />
        </div>

        {/* Toggle size slider */}
        <div>
          <label className="mb-1 flex items-center text-xs text-gray-400">
            Toggle Size: {(theme.toggleSize as string)?.match(/\d+/)?.[0] || '58'}px
            <RebuildBadge />
          </label>
          <input
            type="range"
            min={44}
            max={72}
            step={2}
            value={parseInt((theme.toggleSize as string)?.match(/\d+/)?.[0] || '58')}
            onChange={(e) => {
              const v = parseInt(e.target.value);
              onThemeChange('toggleSize', `w-[${v}px] h-[${v}px]`);
            }}
            className="w-full accent-cyan-500"
          />
        </div>

        {/* Toggle radius preset buttons */}
        <div>
          <label className="mb-1 block text-xs text-gray-400">
            Toggle Shape
            <RebuildBadge />
          </label>
          <div className="flex gap-2">
            {[
              { label: 'Circle', value: 'rounded-full' },
              { label: 'Rounded', value: 'rounded-[10px]' },
              { label: 'Square', value: 'rounded-md' },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onThemeChange('toggleRadius', opt.value)}
                className={`flex-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  theme.toggleRadius === opt.value
                    ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-400'
                    : 'border-white/10 bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Position */}
        <div>
          <label className="mb-1 block text-xs text-gray-400">
            Position
            <RebuildBadge />
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Bottom Right', value: 'bottom-right' },
              { label: 'Bottom Left', value: 'bottom-left' },
              { label: 'Top Right', value: 'top-right' },
              { label: 'Top Left', value: 'top-left' },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onThemeChange('position', opt.value)}
                className={`rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors ${
                  (theme.position || 'bottom-right') === opt.value
                    ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-400'
                    : 'border-white/10 bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </Section>

      {/* 4. Bot Identity */}
      <Section title="Bot Identity">
        <div>
          <label className="mb-1 block text-xs text-gray-400">
            Bot Name (max 30 chars)
            <RebuildBadge />
          </label>
          <input
            type="text"
            value={config.botName}
            maxLength={30}
            onChange={(e) => onConfigChange({ botName: e.target.value })}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-cyan-500/50 focus:outline-none"
          />
        </div>

        {/* Avatar upload */}
        <div>
          <label className="mb-1 block text-xs text-gray-400">Avatar</label>
          <div className="flex items-center gap-3">
            {avatarUrl && <img src={avatarUrl} alt="Avatar" className="h-10 w-10 rounded-lg object-cover" />}
            <label
              className={`flex-1 cursor-pointer rounded-lg border border-dashed border-white/10 px-3 py-2 text-center text-xs text-gray-400 transition-colors hover:border-cyan-500/30 hover:text-cyan-400 ${uploadingAvatar ? 'pointer-events-none opacity-50' : ''}`}
            >
              {uploadingAvatar ? 'Uploading...' : 'Upload image (PNG, JPEG, WebP, max 2MB)'}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs text-gray-400">
            Greeting (max 200 chars)
            <RebuildBadge />
          </label>
          <textarea
            value={config.greeting}
            maxLength={200}
            rows={3}
            onChange={(e) => onConfigChange({ greeting: e.target.value })}
            className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-cyan-500/50 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-gray-400">
            Tone
            <RebuildBadge />
          </label>
          <select
            value={config.tone || ''}
            onChange={(e) =>
              onConfigChange({
                tone: (e.target.value || undefined) as PlaygroundConfig['tone'],
              })
            }
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-cyan-500/50 focus:outline-none"
          >
            <option value="">No tone directive</option>
            <option value="friendly">Friendly</option>
            <option value="professional">Professional</option>
            <option value="casual">Casual</option>
          </select>
        </div>
      </Section>

      {/* 5. Theme */}
      <Section title="Theme">
        <div>
          <label className="mb-2 block text-xs text-gray-400">Mode</label>
          <div className="flex gap-2">
            {[
              { label: 'Light', value: 'light' },
              { label: 'Dark', value: 'dark' },
              { label: 'Auto', value: 'auto' },
            ].map((opt) => {
              const currentMode = theme.isDark === true ? 'dark' : theme.isDark === 'auto' ? 'auto' : 'light';
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() =>
                    onThemeChange('isDark', opt.value === 'dark' ? true : opt.value === 'auto' ? 'auto' : false)
                  }
                  className={`flex-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    currentMode === opt.value
                      ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-400'
                      : 'border-white/10 bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </Section>

      {/* 6. Quick Replies */}
      <Section title="Quick Replies">
        <div className="space-y-2">
          {quickReplies.map((qr, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                value={qr}
                maxLength={80}
                onChange={(e) => updateQuickReply(i, e.target.value)}
                placeholder={`Quick reply ${i + 1}`}
                className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white focus:border-cyan-500/50 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => removeQuickReply(i)}
                className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
          {quickReplies.length < 5 && (
            <button
              type="button"
              onClick={addQuickReply}
              className="w-full rounded-lg border border-dashed border-white/10 py-1.5 text-xs text-gray-500 transition-colors hover:border-cyan-500/30 hover:text-cyan-400"
            >
              + Add Quick Reply
            </button>
          )}
        </div>
      </Section>
    </div>
  );
}
