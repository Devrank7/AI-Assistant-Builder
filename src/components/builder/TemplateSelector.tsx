'use client';

import { useState, useEffect, useRef } from 'react';
import { Syne } from 'next/font/google';
import { MessageSquare, HelpCircle, ClipboardList } from 'lucide-react';
import { WIDGET_TYPES, type WidgetTypeId } from '@/lib/builder/widgetTypes';
import { playClickSound } from '@/lib/sounds';

const WIDGET_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  'message-square': MessageSquare,
  'help-circle': HelpCircle,
  'clipboard-list': ClipboardList,
};

const syne = Syne({ subsets: ['latin'], weight: ['700', '800'] });

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface SessionSummary {
  _id: string;
  widgetName: string | null;
  status: string;
  clientId: string | null;
  currentStage: string;
  updatedAt: string;
  messageCount: number;
  preview: string | null;
}

interface Props {
  onSubmitUrl: (url: string, widgetType?: WidgetTypeId) => void;
  sessions?: SessionSummary[];
  onSelectSession?: (id: string) => void;
  onNewSession?: () => void;
}

export default function TemplateSelector({ onSubmitUrl, sessions, onSelectSession, onNewSession }: Props) {
  const [url, setUrl] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [selectedType, setSelectedType] = useState<WidgetTypeId>('ai_chat');
  const [hoveredType, setHoveredType] = useState<WidgetTypeId | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    onSubmitUrl(url.trim(), selectedType);
  };

  return (
    <div
      className="relative flex h-full flex-col items-center overflow-x-hidden overflow-y-auto"
      style={{ background: '#06070b' }}
    >
      {/* === Layered atmospheric background === */}
      <div className="pointer-events-none absolute inset-0">
        {/* Noise texture overlay */}
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`,
            backgroundSize: '128px 128px',
          }}
        />

        {/* Primary luminous orb — top center */}
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{
            top: '-12%',
            width: '1000px',
            height: '700px',
            background:
              'radial-gradient(ellipse at center, rgba(6,182,212,0.10) 0%, rgba(6,182,212,0.04) 30%, rgba(139,92,246,0.02) 50%, transparent 70%)',
            filter: 'blur(80px)',
            animation: 'heroOrbBreathe 10s ease-in-out infinite',
          }}
        />

        {/* Secondary accent orb — offset right */}
        <div
          className="absolute"
          style={{
            top: '12%',
            right: '2%',
            width: '500px',
            height: '500px',
            background: 'radial-gradient(circle, rgba(139,92,246,0.07) 0%, rgba(168,85,247,0.03) 40%, transparent 65%)',
            filter: 'blur(100px)',
            animation: 'heroOrbDrift 14s ease-in-out infinite',
          }}
        />

        {/* Tertiary warm accent — bottom left */}
        <div
          className="absolute"
          style={{
            bottom: '8%',
            left: '5%',
            width: '450px',
            height: '450px',
            background: 'radial-gradient(circle, rgba(34,211,238,0.04) 0%, rgba(6,182,212,0.02) 40%, transparent 60%)',
            filter: 'blur(100px)',
            animation: 'heroOrbDrift 12s ease-in-out infinite reverse',
          }}
        />

        {/* Fourth orb — subtle rose accent, top left */}
        <div
          className="absolute"
          style={{
            top: '30%',
            left: '-5%',
            width: '350px',
            height: '350px',
            background: 'radial-gradient(circle, rgba(244,114,182,0.03) 0%, transparent 60%)',
            filter: 'blur(90px)',
            animation: 'heroOrbDrift 16s ease-in-out infinite',
          }}
        />

        {/* Dot grid — very subtle structural texture */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.025) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />

        {/* Horizon line glow */}
        <div
          className="absolute right-0 left-0"
          style={{
            top: '42%',
            height: '1px',
            background:
              'linear-gradient(90deg, transparent 5%, rgba(6,182,212,0.06) 25%, rgba(139,92,246,0.05) 50%, rgba(6,182,212,0.06) 75%, transparent 95%)',
          }}
        />
      </div>

      {/* === Content === */}
      <div className="relative z-10 flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-6">
        {/* Agent status beacon */}
        <div
          className="mb-10 transition-all duration-700"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(12px)',
          }}
        >
          <div
            className="flex items-center gap-3 rounded-full px-6 py-3"
            style={{
              background: 'linear-gradient(135deg, rgba(6,182,212,0.06), rgba(139,92,246,0.03))',
              border: '1px solid rgba(6,182,212,0.12)',
              boxShadow:
                '0 0 40px rgba(6,182,212,0.05), 0 0 80px rgba(6,182,212,0.02), inset 0 1px 0 rgba(255,255,255,0.03)',
              backdropFilter: 'blur(20px)',
            }}
          >
            <div className="relative flex items-center justify-center" style={{ width: '10px', height: '10px' }}>
              <div
                className="absolute rounded-full"
                style={{
                  width: '18px',
                  height: '18px',
                  background: 'rgba(34,211,238,0.15)',
                  animation: 'beaconPulse 2.5s ease-in-out infinite',
                }}
              />
              <div
                className="absolute rounded-full"
                style={{
                  width: '10px',
                  height: '10px',
                  background: 'rgba(34,211,238,0.25)',
                  animation: 'beaconPulse 2.5s ease-in-out infinite 0.3s',
                }}
              />
              <div
                className="relative h-2 w-2 rounded-full"
                style={{
                  background: 'linear-gradient(135deg, #22d3ee, #06b6d4)',
                  boxShadow: '0 0 6px rgba(34,211,238,0.8), 0 0 12px rgba(34,211,238,0.4)',
                }}
              />
            </div>
            <span
              style={{
                fontFamily: "'Sora', 'Outfit', sans-serif",
                fontSize: '11px',
                fontWeight: 500,
                letterSpacing: '0.14em',
                color: 'rgba(34,211,238,0.9)',
                textTransform: 'uppercase' as const,
              }}
            >
              AI Agent Online
            </span>
          </div>
        </div>

        {/* Hero headline */}
        <div
          className="mb-4 text-center transition-all duration-700"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(20px)',
            transitionDelay: '100ms',
          }}
        >
          <h1
            className={syne.className}
            style={{
              fontSize: 'clamp(34px, 5.5vw, 54px)',
              fontWeight: 800,
              lineHeight: 1.1,
              color: '#f0f1f4',
              letterSpacing: '-0.03em',
            }}
          >
            What will you{' '}
            <span
              style={{
                position: 'relative',
                display: 'inline-block',
              }}
            >
              <span
                style={{
                  background: 'linear-gradient(135deg, #22d3ee 0%, #06b6d4 30%, #a78bfa 70%, #c084fc 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                build
              </span>
              {/* Underline glow accent */}
              <span
                style={{
                  position: 'absolute',
                  bottom: '-2px',
                  left: '0',
                  right: '0',
                  height: '3px',
                  background: 'linear-gradient(90deg, #22d3ee, #a78bfa)',
                  borderRadius: '2px',
                  opacity: 0.5,
                  filter: 'blur(1px)',
                }}
              />
            </span>
            <span style={{ color: '#3a4058' }}>?</span>
          </h1>
        </div>

        {/* Subheadline */}
        <p
          className="mb-12 max-w-md text-center transition-all duration-700"
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: '15px',
            lineHeight: 1.7,
            color: '#5a6178',
            letterSpacing: '0.01em',
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(16px)',
            transitionDelay: '200ms',
          }}
        >
          Paste a URL to analyze your brand, or describe what you need.
          <br />
          Your custom widget deploys in under a minute.
        </p>

        {/* === Widget Type Selector === */}
        <div
          className="mb-8 w-full max-w-lg transition-all duration-700"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(16px)',
            transitionDelay: '250ms',
          }}
        >
          <div className="grid grid-cols-3 gap-2.5">
            {WIDGET_TYPES.map((type) => {
              const isSelected = selectedType === type.id;
              const isHovered = hoveredType === type.id;
              return (
                <button
                  key={type.id}
                  onClick={() => {
                    playClickSound();
                    setSelectedType(type.id);
                  }}
                  onMouseEnter={() => setHoveredType(type.id)}
                  onMouseLeave={() => setHoveredType(null)}
                  className="relative overflow-hidden rounded-xl px-3 py-3.5 text-center transition-all duration-300"
                  style={{
                    background: isSelected
                      ? 'linear-gradient(135deg, rgba(6,182,212,0.10), rgba(139,92,246,0.05))'
                      : isHovered
                        ? 'rgba(255,255,255,0.035)'
                        : 'rgba(255,255,255,0.02)',
                    border: isSelected
                      ? '1px solid rgba(6,182,212,0.3)'
                      : isHovered
                        ? '1px solid rgba(255,255,255,0.10)'
                        : '1px solid rgba(255,255,255,0.05)',
                    boxShadow: isSelected
                      ? '0 0 24px rgba(6,182,212,0.08), 0 8px 32px rgba(6,182,212,0.04), inset 0 1px 0 rgba(255,255,255,0.04)'
                      : isHovered
                        ? '0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.02)'
                        : 'none',
                    backdropFilter: 'blur(12px)',
                    transform:
                      isHovered && !isSelected ? 'translateY(-2px) perspective(800px) rotateX(2deg)' : 'translateY(0)',
                  }}
                >
                  {/* Top shimmer line for selected */}
                  {isSelected && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '1px',
                        background: 'linear-gradient(90deg, transparent, rgba(34,211,238,0.5), transparent)',
                      }}
                    />
                  )}
                  <span
                    className="mb-1.5 flex justify-center text-xl"
                    style={{ filter: isSelected ? 'drop-shadow(0 0 6px rgba(34,211,238,0.3))' : 'none' }}
                  >
                    {(() => {
                      const IconComp = WIDGET_ICON_MAP[type.icon];
                      return IconComp ? <IconComp className="h-5 w-5" /> : <span>{type.icon}</span>;
                    })()}
                  </span>
                  <span
                    className="block text-xs font-medium"
                    style={{
                      fontFamily: "'Outfit', sans-serif",
                      color: isSelected ? '#22d3ee' : isHovered ? '#8a90a8' : '#5a6178',
                      letterSpacing: '0.02em',
                    }}
                  >
                    {type.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* === Command input === */}
        <div
          className="mb-14 w-full max-w-lg transition-all duration-700"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(16px)',
            transitionDelay: '300ms',
          }}
        >
          <form onSubmit={handleUrlSubmit}>
            <div
              className="relative overflow-hidden rounded-2xl transition-all duration-500"
              style={{
                background: isFocused
                  ? 'linear-gradient(135deg, rgba(6,182,212,0.05), rgba(139,92,246,0.025), rgba(6,182,212,0.03))'
                  : 'linear-gradient(135deg, rgba(255,255,255,0.025), rgba(255,255,255,0.015))',
                border: isFocused ? '1px solid rgba(6,182,212,0.25)' : '1px solid rgba(255,255,255,0.06)',
                boxShadow: isFocused
                  ? '0 0 0 1px rgba(6,182,212,0.08), 0 8px 40px rgba(6,182,212,0.08), 0 20px 60px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)'
                  : '0 4px 24px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.02)',
                backdropFilter: 'blur(24px)',
              }}
            >
              {/* Subtle top border shimmer when focused */}
              <div
                className="absolute top-0 right-0 left-0 h-px transition-opacity duration-500"
                style={{
                  background: 'linear-gradient(90deg, transparent 10%, rgba(34,211,238,0.5) 50%, transparent 90%)',
                  opacity: isFocused ? 1 : 0,
                }}
              />

              {/* Bottom shimmer accent */}
              <div
                className="absolute right-0 bottom-0 left-0 h-px transition-opacity duration-500"
                style={{
                  background: 'linear-gradient(90deg, transparent 20%, rgba(139,92,246,0.2) 50%, transparent 80%)',
                  opacity: isFocused ? 1 : 0,
                }}
              />

              <div className="flex items-center gap-2 px-4 py-1.5">
                {/* Globe icon */}
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center">
                  <svg
                    className="h-[18px] w-[18px] transition-all duration-400"
                    style={{
                      color: isFocused ? '#22d3ee' : '#3a3f52',
                      filter: isFocused ? 'drop-shadow(0 0 4px rgba(34,211,238,0.3))' : 'none',
                    }}
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
                  ref={inputRef}
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  placeholder="your-website.com or describe your business..."
                  className="min-w-0 flex-1 bg-transparent py-3.5 text-[14px] outline-none placeholder:transition-colors placeholder:duration-300"
                  style={{
                    color: '#e8eaed',
                    fontFamily: "'Outfit', sans-serif",
                    letterSpacing: '0.01em',
                  }}
                />

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={!url.trim()}
                  className="group/btn relative flex flex-shrink-0 items-center gap-2 overflow-hidden rounded-xl px-5 py-2.5 text-[13px] font-medium transition-all duration-400 disabled:cursor-not-allowed"
                  style={{
                    fontFamily: "'Sora', 'Outfit', sans-serif",
                    letterSpacing: '0.02em',
                    background: url.trim()
                      ? 'linear-gradient(135deg, #0891b2, #06b6d4, #0e7490)'
                      : 'rgba(255,255,255,0.03)',
                    color: url.trim() ? '#fff' : '#2a2f42',
                    boxShadow: url.trim()
                      ? '0 4px 20px rgba(6,182,212,0.3), 0 1px 3px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.15)'
                      : 'none',
                    opacity: url.trim() ? 1 : 0.5,
                    transform: url.trim() ? 'scale(1)' : 'scale(0.97)',
                  }}
                >
                  {/* Button shimmer effect */}
                  {url.trim() && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '50%',
                        background: 'linear-gradient(to bottom, rgba(255,255,255,0.1), transparent)',
                        borderRadius: '12px 12px 0 0',
                        pointerEvents: 'none',
                      }}
                    />
                  )}
                  <span className="relative">Build</span>
                  <svg
                    className="relative h-3.5 w-3.5 transition-transform duration-300"
                    style={{ transform: url.trim() ? 'translateX(0)' : 'translateX(-2px)' }}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </button>
              </div>
            </div>
          </form>

          {/* Keyboard hint */}
          <div className="mt-3 flex justify-center">
            <span
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: '11px',
                color: '#2a2f42',
                letterSpacing: '0.04em',
              }}
            >
              Press{' '}
              <kbd
                style={{
                  display: 'inline-block',
                  padding: '2px 7px',
                  borderRadius: '5px',
                  background: 'linear-gradient(to bottom, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
                  border: '1px solid rgba(255,255,255,0.06)',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.04)',
                  fontSize: '10px',
                  fontFamily: "'Sora', monospace",
                  color: '#4a5068',
                }}
              >
                Enter
              </kbd>{' '}
              to start
            </span>
          </div>
        </div>
      </div>

      {/* === Recent Chats — Premium Liquid Glass Design === */}
      {sessions && sessions.length > 0 && (
        <div
          className="relative z-10 w-full max-w-3xl px-6 pb-10 transition-all duration-700"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(20px)',
            transitionDelay: '400ms',
          }}
        >
          {/* Section header */}
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="flex h-6 w-6 items-center justify-center rounded-md"
                style={{
                  background: 'linear-gradient(135deg, rgba(6,182,212,0.12), rgba(139,92,246,0.08))',
                  boxShadow: '0 0 12px rgba(6,182,212,0.06)',
                }}
              >
                <svg className="h-3 w-3" style={{ color: '#67e8f9' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span
                style={{
                  fontFamily: "'Sora', sans-serif",
                  fontSize: '13px',
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                  color: '#8b92a8',
                }}
              >
                Recent Projects
              </span>
              <span
                className="rounded-full px-2 py-0.5"
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: '10px',
                  fontWeight: 500,
                  color: '#4a5068',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.04)',
                }}
              >
                {sessions.length}
              </span>
            </div>
            {onNewSession && (
              <button
                onClick={() => { playClickSound(); onNewSession(); }}
                className="group/new flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-medium transition-all duration-400"
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  color: '#a5f3fc',
                  background: 'linear-gradient(135deg, rgba(6,182,212,0.06), rgba(139,92,246,0.03))',
                  border: '1px solid rgba(6,182,212,0.10)',
                  backdropFilter: 'blur(12px)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(6,182,212,0.14), rgba(139,92,246,0.06))';
                  e.currentTarget.style.borderColor = 'rgba(6,182,212,0.28)';
                  e.currentTarget.style.boxShadow = '0 0 24px rgba(6,182,212,0.10), inset 0 1px 0 rgba(255,255,255,0.04)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(6,182,212,0.06), rgba(139,92,246,0.03))';
                  e.currentTarget.style.borderColor = 'rgba(6,182,212,0.10)';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <svg className="h-3.5 w-3.5 transition-transform duration-300 group-hover/new:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                New Project
              </button>
            )}
          </div>

          {/* Cards grid */}
          <div className="grid gap-3" style={{ gridTemplateColumns: sessions.length === 1 ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {sessions.slice(0, 6).map((session, i) => {
              const timeAgo = getTimeAgo(session.updatedAt);
              const isDeployed = session.status === 'deployed';
              const isBuilding = session.status === 'building';
              const statusColor = isDeployed ? '#34d399' : isBuilding ? '#fbbf24' : '#67e8f9';
              const statusGlow = isDeployed ? 'rgba(52,211,153,0.15)' : isBuilding ? 'rgba(251,191,36,0.15)' : 'rgba(103,232,249,0.15)';
              const statusLabel = isDeployed ? 'Live' : isBuilding ? 'Building' : 'Draft';
              const accentGradient = isDeployed
                ? 'linear-gradient(135deg, rgba(52,211,153,0.08), rgba(6,182,212,0.04))'
                : isBuilding
                ? 'linear-gradient(135deg, rgba(251,191,36,0.08), rgba(251,146,60,0.04))'
                : 'linear-gradient(135deg, rgba(6,182,212,0.08), rgba(139,92,246,0.04))';

              return (
                <button
                  key={session._id}
                  onClick={() => { playClickSound(); onSelectSession?.(session._id); }}
                  className="group relative flex flex-col rounded-2xl p-[1px] text-left transition-all duration-500"
                  style={{
                    opacity: mounted ? 1 : 0,
                    transform: mounted ? 'translateY(0) scale(1)' : 'translateY(12px) scale(0.97)',
                    transitionDelay: `${450 + i * 80}ms`,
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.01))',
                  }}
                  onMouseEnter={(e) => {
                    const card = e.currentTarget;
                    card.style.background = `linear-gradient(135deg, ${statusColor}30, rgba(139,92,246,0.12))`;
                    card.style.transform = 'translateY(-3px) scale(1.01)';
                    card.style.boxShadow = `0 8px 40px ${statusGlow}, 0 0 0 1px ${statusColor}15`;
                  }}
                  onMouseLeave={(e) => {
                    const card = e.currentTarget;
                    card.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.01))';
                    card.style.transform = 'translateY(0) scale(1)';
                    card.style.boxShadow = 'none';
                  }}
                >
                  {/* Inner card — glass layer */}
                  <div
                    className="relative flex flex-1 flex-col overflow-hidden rounded-[15px] px-5 py-4"
                    style={{
                      background: 'linear-gradient(160deg, rgba(12,14,22,0.92), rgba(8,10,18,0.97))',
                      backdropFilter: 'blur(20px)',
                    }}
                  >
                    {/* Ambient glow — top-right corner */}
                    <div
                      className="pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full opacity-40 transition-opacity duration-500 group-hover:opacity-70"
                      style={{ background: `radial-gradient(circle, ${statusColor}20, transparent 70%)` }}
                    />

                    {/* Top row: icon + status */}
                    <div className="mb-3.5 flex items-start justify-between">
                      <div
                        className="relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-400 group-hover:scale-110"
                        style={{
                          background: accentGradient,
                          border: `1px solid ${statusColor}18`,
                          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.04), 0 2px 8px ${statusColor}08`,
                        }}
                      >
                        {isDeployed ? (
                          <svg className="h-4.5 w-4.5" style={{ color: statusColor }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        ) : isBuilding ? (
                          <svg className="h-4.5 w-4.5 animate-spin" style={{ color: statusColor, animationDuration: '3s' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182M2.985 19.644l3.181-3.183" />
                          </svg>
                        ) : (
                          <svg className="h-4.5 w-4.5" style={{ color: statusColor }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                          </svg>
                        )}
                        {/* Pulse ring for deployed */}
                        {isDeployed && (
                          <div
                            className="absolute inset-0 rounded-xl"
                            style={{
                              border: `1px solid ${statusColor}30`,
                              animation: 'pulse-ring 3s ease-in-out infinite',
                            }}
                          />
                        )}
                      </div>

                      {/* Status pill */}
                      <div
                        className="flex items-center gap-1.5 rounded-full px-2.5 py-1 transition-all duration-300 group-hover:scale-105"
                        style={{
                          background: `${statusColor}08`,
                          border: `1px solid ${statusColor}18`,
                        }}
                      >
                        <div
                          className="h-1.5 w-1.5 rounded-full"
                          style={{
                            background: statusColor,
                            boxShadow: `0 0 6px ${statusColor}60`,
                            animation: isBuilding ? 'pulse-dot 1.5s ease-in-out infinite' : 'none',
                          }}
                        />
                        <span
                          style={{
                            fontFamily: "'Outfit', sans-serif",
                            fontSize: '10px',
                            fontWeight: 600,
                            letterSpacing: '0.05em',
                            color: statusColor,
                            textTransform: 'uppercase' as const,
                          }}
                        >
                          {statusLabel}
                        </span>
                      </div>
                    </div>

                    {/* Widget name */}
                    <h3
                      className="mb-1 truncate text-[14px] font-semibold transition-colors duration-300 group-hover:text-white"
                      style={{ color: '#d1d5e0', fontFamily: "'Sora', sans-serif", lineHeight: 1.3 }}
                    >
                      {session.widgetName || session.preview || 'Untitled Project'}
                    </h3>

                    {/* Meta row */}
                    <div className="mt-auto flex items-center gap-2 pt-3">
                      <div className="flex items-center gap-1.5">
                        <svg className="h-3 w-3" style={{ color: '#3a4058' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                        </svg>
                        <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: '11px', color: '#3a4058', fontWeight: 500 }}>
                          {session.messageCount}
                        </span>
                      </div>
                      <div
                        className="h-3"
                        style={{ width: '1px', background: 'rgba(255,255,255,0.04)' }}
                      />
                      <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: '11px', color: '#2e3348', fontWeight: 500 }}>
                        {timeAgo}
                      </span>

                      {/* Arrow — slides in on hover */}
                      <div className="ml-auto flex items-center">
                        <svg
                          className="h-4 w-4 translate-x-1 opacity-0 transition-all duration-400 group-hover:translate-x-0 group-hover:opacity-60"
                          style={{ color: statusColor }}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                        </svg>
                      </div>
                    </div>

                    {/* Bottom accent line */}
                    <div
                      className="absolute right-5 bottom-0 left-5 h-[1px] scale-x-0 transition-transform duration-500 group-hover:scale-x-100"
                      style={{
                        background: `linear-gradient(90deg, transparent, ${statusColor}40, transparent)`,
                        transformOrigin: 'left',
                      }}
                    />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Keyframe animations */}
          <style>{`
            @keyframes pulse-ring {
              0%, 100% { opacity: 0.3; transform: scale(1); }
              50% { opacity: 0.6; transform: scale(1.08); }
            }
            @keyframes pulse-dot {
              0%, 100% { opacity: 0.6; transform: scale(1); }
              50% { opacity: 1; transform: scale(1.4); }
            }
          `}</style>
        </div>
      )}

      {/* === Bottom fade === */}
      <div
        className="pointer-events-none absolute right-0 bottom-0 left-0 h-20"
        style={{
          background: 'linear-gradient(to top, #06070b, transparent)',
        }}
      />

      {/* === Animations & fonts === */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');

        @keyframes heroOrbBreathe {
          0%, 100% { transform: translateX(-50%) scale(1); opacity: 1; }
          50% { transform: translateX(-50%) scale(1.06); opacity: 0.75; }
        }

        @keyframes heroOrbDrift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(12px, -8px) scale(1.02); }
          50% { transform: translate(-8px, 12px) scale(0.98); }
          75% { transform: translate(-12px, -6px) scale(1.01); }
        }

        @keyframes beaconPulse {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.8); opacity: 0; }
        }

        /* Placeholder color */
        input::placeholder {
          color: #2e3346 !important;
        }
        input:focus::placeholder {
          color: #3a4058 !important;
        }
      `}</style>
    </div>
  );
}
