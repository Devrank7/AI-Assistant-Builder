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

const TEMPLATE_ICONS: Record<string, (props: { gradient: [string, string] }) => React.ReactElement> = {
  dental: ({ gradient }) => (
    <svg viewBox="0 0 40 40" fill="none" className="h-9 w-9">
      <defs>
        <linearGradient id="dental-g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={gradient[0]} />
          <stop offset="100%" stopColor={gradient[1]} />
        </linearGradient>
      </defs>
      <path
        d="M20 4c-3.5 0-6.2 1.2-7.8 3.1C10.6 9 10 11.4 10 14c0 3 .8 5.5 1.8 8 1.2 3 2.5 6.2 3 10.2.3 2.2 1.2 3.8 3.2 3.8 1.8 0 2.2-1.5 2-3.5-.1-1.5-.2-3 0-4.5h.2c.2 1.5.1 3-.1 4.5-.2 2 .3 3.5 2 3.5 2 0 2.9-1.6 3.2-3.8.5-4 1.8-7.2 3-10.2 1-2.5 1.8-5 1.8-8 0-2.6-.6-5-2.2-6.9C26.3 5.2 23.5 4 20 4z"
        fill="url(#dental-g)"
        opacity="0.9"
      />
      <path
        d="M20 4c-3.5 0-6.2 1.2-7.8 3.1C10.6 9 10 11.4 10 14c0 3 .8 5.5 1.8 8 1.2 3 2.5 6.2 3 10.2.3 2.2 1.2 3.8 3.2 3.8 1.8 0 2.2-1.5 2-3.5-.1-1.5-.2-3 0-4.5h.2c.2 1.5.1 3-.1 4.5-.2 2 .3 3.5 2 3.5 2 0 2.9-1.6 3.2-3.8.5-4 1.8-7.2 3-10.2 1-2.5 1.8-5 1.8-8 0-2.6-.6-5-2.2-6.9C26.3 5.2 23.5 4 20 4z"
        stroke="url(#dental-g)"
        strokeWidth="0.5"
        fill="none"
        opacity="0.4"
      />
      <ellipse cx="16.5" cy="12" rx="2" ry="2.5" fill="white" opacity="0.15" />
    </svg>
  ),
  restaurant: ({ gradient }) => (
    <svg viewBox="0 0 40 40" fill="none" className="h-9 w-9">
      <defs>
        <linearGradient id="resto-g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={gradient[0]} />
          <stop offset="100%" stopColor={gradient[1]} />
        </linearGradient>
      </defs>
      <path
        d="M10 6v12c0 2.2 1.8 4 4 4h1v12c0 .6.4 1 1 1h0c.6 0 1-.4 1-1V22h1c2.2 0 4-1.8 4-4V6"
        stroke="url(#resto-g)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line
        x1="14"
        y1="6"
        x2="14"
        y2="14"
        stroke="url(#resto-g)"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.5"
      />
      <line
        x1="18"
        y1="6"
        x2="18"
        y2="14"
        stroke="url(#resto-g)"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.5"
      />
      <path
        d="M28 6c0 0-3 2-3 8 0 4 1.5 6 3 8v12c0 .6.4 1 1 1h0c.6 0 1-.4 1-1V22c1.5-2 3-4 3-8 0-6-3-8-3-8"
        stroke="url(#resto-g)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="29" cy="12" r="1.5" fill="url(#resto-g)" opacity="0.3" />
    </svg>
  ),
  saas: ({ gradient }) => (
    <svg viewBox="0 0 40 40" fill="none" className="h-9 w-9">
      <defs>
        <linearGradient id="saas-g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={gradient[0]} />
          <stop offset="100%" stopColor={gradient[1]} />
        </linearGradient>
      </defs>
      <rect x="6" y="6" width="28" height="20" rx="3" stroke="url(#saas-g)" strokeWidth="2" />
      <line x1="6" y1="22" x2="34" y2="22" stroke="url(#saas-g)" strokeWidth="1.5" opacity="0.4" />
      <circle cx="20" cy="24" r="0.8" fill="url(#saas-g)" opacity="0.6" />
      <line x1="16" y1="30" x2="24" y2="30" stroke="url(#saas-g)" strokeWidth="2" strokeLinecap="round" />
      <line x1="20" y1="26" x2="20" y2="30" stroke="url(#saas-g)" strokeWidth="2" />
      <path
        d="M12 12l3 3 5-6"
        stroke="url(#saas-g)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.7"
      />
      <line
        x1="23"
        y1="12"
        x2="28"
        y2="12"
        stroke="url(#saas-g)"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.4"
      />
      <line
        x1="23"
        y1="15"
        x2="27"
        y2="15"
        stroke="url(#saas-g)"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.3"
      />
      <line
        x1="23"
        y1="18"
        x2="26"
        y2="18"
        stroke="url(#saas-g)"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.2"
      />
    </svg>
  ),
  realestate: ({ gradient }) => (
    <svg viewBox="0 0 40 40" fill="none" className="h-9 w-9">
      <defs>
        <linearGradient id="real-g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={gradient[0]} />
          <stop offset="100%" stopColor={gradient[1]} />
        </linearGradient>
      </defs>
      <path
        d="M20 6L6 18h4v14h8v-8h4v8h8V18h4L20 6z"
        stroke="url(#real-g)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M20 6L6 18h4v14h8v-8h4v8h8V18h4L20 6z" fill="url(#real-g)" opacity="0.08" />
      <rect x="17" y="14" width="6" height="5" rx="0.5" stroke="url(#real-g)" strokeWidth="1.2" opacity="0.5" />
      <line x1="20" y1="14" x2="20" y2="19" stroke="url(#real-g)" strokeWidth="0.8" opacity="0.3" />
      <line x1="17" y1="16.5" x2="23" y2="16.5" stroke="url(#real-g)" strokeWidth="0.8" opacity="0.3" />
    </svg>
  ),
  beauty: ({ gradient }) => (
    <svg viewBox="0 0 40 40" fill="none" className="h-9 w-9">
      <defs>
        <linearGradient id="beauty-g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={gradient[0]} />
          <stop offset="100%" stopColor={gradient[1]} />
        </linearGradient>
      </defs>
      <path
        d="M20 8c-2 0-3.5 1-4.5 2.5S14 13.5 14 16c0 3 1 5.5 3 7.5V34c0 .6.4 1 1 1h4c.6 0 1-.4 1-1V23.5c2-2 3-4.5 3-7.5 0-2.5-.5-4-1.5-5.5S22 8 20 8z"
        stroke="url(#beauty-g)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20 8c-2 0-3.5 1-4.5 2.5S14 13.5 14 16c0 3 1 5.5 3 7.5V34c0 .6.4 1 1 1h4c.6 0 1-.4 1-1V23.5c2-2 3-4.5 3-7.5 0-2.5-.5-4-1.5-5.5S22 8 20 8z"
        fill="url(#beauty-g)"
        opacity="0.1"
      />
      <ellipse cx="20" cy="5.5" rx="2.5" ry="2" fill="url(#beauty-g)" opacity="0.5" />
      <ellipse cx="20" cy="5.5" rx="2.5" ry="2" stroke="url(#beauty-g)" strokeWidth="0.8" opacity="0.3" />
      <path d="M17 28h6" stroke="url(#beauty-g)" strokeWidth="1" strokeLinecap="round" opacity="0.3" />
      <path d="M17 31h6" stroke="url(#beauty-g)" strokeWidth="1" strokeLinecap="round" opacity="0.2" />
      <circle cx="20" cy="16" r="1.5" fill="url(#beauty-g)" opacity="0.2" />
    </svg>
  ),
};

export default function TemplateSelector({ onSelectTemplate, onSubmitUrl }: Props) {
  const [url, setUrl] = useState('');
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [isFocused, setIsFocused] = useState(false);

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
    <div className="relative flex h-full flex-col items-center justify-center overflow-hidden px-6">
      {/* Animated background orb */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div
          className="absolute h-[500px] w-[500px] rounded-full opacity-[0.07]"
          style={{
            background: 'radial-gradient(circle, #06b6d4 0%, #0891b2 30%, transparent 70%)',
            animation: 'orbPulse 6s ease-in-out infinite',
          }}
        />
        <div
          className="absolute h-[300px] w-[300px] rounded-full opacity-[0.04]"
          style={{
            background: 'radial-gradient(circle, #a78bfa 0%, #7c3aed 40%, transparent 70%)',
            animation: 'orbFloat 8s ease-in-out infinite',
          }}
        />
      </div>

      {/* Subtle grid pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative z-10 flex flex-col items-center">
        {/* Agent identity badge */}
        <div
          className="mb-8 flex items-center gap-2.5 rounded-full px-4 py-2"
          style={{
            background: 'rgba(6,182,212,0.08)',
            border: '1px solid rgba(6,182,212,0.15)',
          }}
        >
          <div className="relative flex h-2 w-2 items-center justify-center">
            <div className="absolute h-2 w-2 animate-ping rounded-full bg-cyan-400 opacity-60" />
            <div className="h-2 w-2 rounded-full bg-cyan-400" />
          </div>
          <span
            className="text-xs tracking-widest uppercase"
            style={{ color: '#22d3ee', fontFamily: "'Outfit', sans-serif" }}
          >
            AI Agent Online
          </span>
        </div>

        {/* Headline */}
        <h1
          className="mb-3 text-center text-4xl font-light tracking-tight"
          style={{ fontFamily: "'Outfit', sans-serif", color: '#e8eaed' }}
        >
          What will you{' '}
          <span
            className="font-medium"
            style={{
              background: 'linear-gradient(135deg, #22d3ee, #06b6d4, #a78bfa)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            build
          </span>
          ?
        </h1>

        <p className="mb-10 max-w-md text-center text-sm leading-relaxed" style={{ color: '#7a8194' }}>
          Paste your website URL. The AI agent will analyze your brand, design a custom widget, and deploy it — all in
          under a minute.
        </p>

        {/* URL Input */}
        <form onSubmit={handleUrlSubmit} className="mb-12 w-full max-w-lg">
          <div
            className="relative flex items-center gap-3 rounded-2xl p-1 transition-all duration-300"
            style={{
              background: isFocused ? 'rgba(6,182,212,0.06)' : 'rgba(255,255,255,0.03)',
              border: isFocused ? '1px solid rgba(6,182,212,0.3)' : '1px solid rgba(255,255,255,0.08)',
              boxShadow: isFocused ? '0 0 40px rgba(6,182,212,0.08), inset 0 0 20px rgba(6,182,212,0.03)' : 'none',
            }}
          >
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center pl-2">
              <svg
                className="h-5 w-5 transition-colors duration-300"
                style={{ color: isFocused ? '#22d3ee' : '#4a5068' }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5a17.92 17.92 0 01-8.716-2.247m0 0A9.015 9.015 0 003 12c0-1.605.42-3.113 1.157-4.418"
                />
              </svg>
            </div>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="your-website.com"
              className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-[#4a5068]"
              style={{ color: '#e8eaed', fontFamily: "'Outfit', sans-serif" }}
            />
            <button
              type="submit"
              disabled={!url.trim()}
              className="flex flex-shrink-0 items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-30"
              style={{
                background: url.trim() ? 'linear-gradient(135deg, #0891b2, #06b6d4)' : 'rgba(255,255,255,0.05)',
                color: url.trim() ? '#fff' : '#4a5068',
                boxShadow: url.trim() ? '0 4px 20px rgba(6,182,212,0.25)' : 'none',
                fontFamily: "'Outfit', sans-serif",
              }}
            >
              Build
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </button>
          </div>
        </form>

        {/* Templates */}
        {templates.length > 0 && (
          <div className="w-full max-w-xl">
            <div className="mb-5 flex items-center gap-3">
              <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.06)' }} />
              <span
                className="text-xs tracking-wider uppercase"
                style={{ color: '#4a5068', fontFamily: "'Outfit', sans-serif" }}
              >
                or start from a template
              </span>
              <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.06)' }} />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => onSelectTemplate(t.id)}
                  className="group relative overflow-hidden rounded-xl p-4 text-center transition-all duration-300 hover:-translate-y-0.5"
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(6,182,212,0.2)';
                    e.currentTarget.style.background = 'rgba(6,182,212,0.04)';
                    e.currentTarget.style.boxShadow = '0 8px 30px rgba(6,182,212,0.06)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                    e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div className="mb-2.5 flex justify-center">
                    {TEMPLATE_ICONS[t.id] ? (
                      <div
                        className="flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-300"
                        style={{
                          background: `linear-gradient(135deg, ${t.defaultColors[0]}12, ${t.defaultColors[1] || t.defaultColors[0]}08)`,
                          border: `1px solid ${t.defaultColors[0]}20`,
                        }}
                      >
                        {TEMPLATE_ICONS[t.id]({
                          gradient: [t.defaultColors[0], t.defaultColors[1] || t.defaultColors[0]],
                        })}
                      </div>
                    ) : (
                      <div className="text-2xl">{t.emoji}</div>
                    )}
                  </div>
                  <p
                    className="mb-2.5 text-xs font-medium"
                    style={{ color: '#c4c9d4', fontFamily: "'Outfit', sans-serif" }}
                  >
                    {t.label}
                  </p>
                  <div className="flex justify-center gap-1.5">
                    {t.defaultColors.slice(0, 3).map((c, i) => (
                      <div
                        key={i}
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: c, boxShadow: `0 0 8px ${c}30` }}
                      />
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');
        @keyframes orbPulse {
          0%, 100% { transform: scale(1); opacity: 0.07; }
          50% { transform: scale(1.15); opacity: 0.12; }
        }
        @keyframes orbFloat {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -20px) scale(1.1); }
          66% { transform: translate(-20px, 15px) scale(0.95); }
        }
      `}</style>
    </div>
  );
}
