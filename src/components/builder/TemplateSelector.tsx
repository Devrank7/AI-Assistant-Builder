'use client';

import { useState, useEffect } from 'react';

interface TemplateOption {
  id: string;
  label: string;
  emoji: string;
  defaultColors: string[];
  defaultFont: string;
  sampleQuickReplies: string[];
}

interface Props {
  onSelectTemplate: (templateId: string) => void;
  onSubmitUrl: (url: string) => void;
}

export default function TemplateSelector({ onSelectTemplate, onSubmitUrl }: Props) {
  const [url, setUrl] = useState('');
  const [templates, setTemplates] = useState<TemplateOption[]>([]);

  useEffect(() => {
    fetch('/api/builder/templates')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setTemplates(d.data);
      })
      .catch(() => {});
  }, []);

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    let normalized = url.trim();
    if (!normalized.startsWith('http')) normalized = 'https://' + normalized;
    onSubmitUrl(normalized);
  };

  return (
    <div className="flex h-full flex-col items-center justify-center px-6">
      <h2 className="mb-2 text-2xl font-bold text-gray-900">Create Your Widget</h2>
      <p className="mb-8 text-center text-gray-500">
        Paste your website URL and I&apos;ll create a branded AI chat widget automatically
      </p>

      <form onSubmit={handleUrlSubmit} className="mb-8 w-full max-w-md">
        <div className="flex gap-2">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://your-website.com"
            className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />
          <button
            type="submit"
            disabled={!url.trim()}
            className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Start
          </button>
        </div>
      </form>

      {templates.length > 0 && (
        <>
          <p className="mb-4 text-xs text-gray-400">Or pick an industry template</p>
          <div className="grid w-full max-w-md grid-cols-2 gap-3 sm:grid-cols-3">
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => onSelectTemplate(t.id)}
                className="rounded-xl border border-gray-200 p-4 text-center transition-all hover:border-blue-300 hover:bg-blue-50"
              >
                <div className="mb-2 text-3xl">{t.emoji}</div>
                <p className="text-sm font-medium text-gray-700">{t.label}</p>
                <div className="mt-2 flex justify-center gap-1">
                  {t.defaultColors.slice(0, 3).map((c, i) => (
                    <div key={i} className="h-4 w-4 rounded-full" style={{ backgroundColor: c }} />
                  ))}
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
