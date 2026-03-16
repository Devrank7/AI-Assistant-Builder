'use client';

import { useState, useEffect, useRef } from 'react';

interface Props {
  onSubmitUrl: (url: string) => void;
}

export default function TemplateSelector({ onSubmitUrl }: Props) {
  const [url, setUrl] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    onSubmitUrl(url.trim());
  };

  return (
    <div className="relative flex h-full flex-col items-center overflow-hidden" style={{ background: '#06070b' }}>
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
            top: '-8%',
            width: '900px',
            height: '600px',
            background:
              'radial-gradient(ellipse at center, rgba(6,182,212,0.12) 0%, rgba(6,182,212,0.04) 35%, transparent 70%)',
            filter: 'blur(60px)',
            animation: 'heroOrbBreathe 8s ease-in-out infinite',
          }}
        />

        {/* Secondary accent orb — offset right */}
        <div
          className="absolute"
          style={{
            top: '15%',
            right: '5%',
            width: '400px',
            height: '400px',
            background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 65%)',
            filter: 'blur(80px)',
            animation: 'heroOrbDrift 12s ease-in-out infinite',
          }}
        />

        {/* Tertiary warm accent — bottom left */}
        <div
          className="absolute"
          style={{
            bottom: '5%',
            left: '8%',
            width: '350px',
            height: '350px',
            background: 'radial-gradient(circle, rgba(34,211,238,0.05) 0%, transparent 60%)',
            filter: 'blur(90px)',
            animation: 'heroOrbDrift 10s ease-in-out infinite reverse',
          }}
        />

        {/* Dot grid — very subtle structural texture */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)',
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
              'linear-gradient(90deg, transparent, rgba(6,182,212,0.08) 30%, rgba(139,92,246,0.06) 70%, transparent)',
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
            className="flex items-center gap-3 rounded-full px-5 py-2.5"
            style={{
              background: 'rgba(6,182,212,0.05)',
              border: '1px solid rgba(6,182,212,0.1)',
              boxShadow: '0 0 30px rgba(6,182,212,0.04), inset 0 0 20px rgba(6,182,212,0.02)',
            }}
          >
            <div className="relative">
              <div
                className="absolute inset-0 animate-ping rounded-full opacity-40"
                style={{ background: '#22d3ee', animationDuration: '2s' }}
              />
              <div
                className="h-2 w-2 rounded-full"
                style={{ background: '#22d3ee', boxShadow: '0 0 8px rgba(34,211,238,0.6)' }}
              />
            </div>
            <span
              style={{
                fontFamily: "'Sora', 'Outfit', sans-serif",
                fontSize: '11px',
                fontWeight: 500,
                letterSpacing: '0.14em',
                color: 'rgba(34,211,238,0.85)',
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
            style={{
              fontFamily: "'Sora', 'Outfit', sans-serif",
              fontSize: 'clamp(32px, 5vw, 48px)',
              fontWeight: 300,
              lineHeight: 1.15,
              color: '#e8eaed',
              letterSpacing: '-0.02em',
            }}
          >
            What will you{' '}
            <span
              style={{
                fontWeight: 600,
                background: 'linear-gradient(135deg, #22d3ee 0%, #06b6d4 40%, #a78bfa 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              build
            </span>
            <span style={{ color: '#4a5068' }}>?</span>
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
                  ? 'linear-gradient(135deg, rgba(6,182,212,0.04), rgba(139,92,246,0.02))'
                  : 'rgba(255,255,255,0.02)',
                border: isFocused ? '1px solid rgba(6,182,212,0.2)' : '1px solid rgba(255,255,255,0.06)',
                boxShadow: isFocused
                  ? '0 0 0 1px rgba(6,182,212,0.08), 0 8px 40px rgba(6,182,212,0.06), 0 20px 60px rgba(0,0,0,0.3)'
                  : '0 4px 24px rgba(0,0,0,0.2)',
                backdropFilter: 'blur(20px)',
              }}
            >
              {/* Subtle top border shimmer when focused */}
              <div
                className="absolute top-0 right-0 left-0 h-px transition-opacity duration-500"
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(34,211,238,0.4) 50%, transparent)',
                  opacity: isFocused ? 1 : 0,
                }}
              />

              <div className="flex items-center gap-2 px-4 py-1.5">
                {/* Globe icon */}
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center">
                  <svg
                    className="h-[18px] w-[18px] transition-all duration-400"
                    style={{ color: isFocused ? '#22d3ee' : '#3a3f52' }}
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
                  className="flex flex-shrink-0 items-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-medium transition-all duration-400 disabled:cursor-not-allowed"
                  style={{
                    fontFamily: "'Sora', 'Outfit', sans-serif",
                    letterSpacing: '0.02em',
                    background: url.trim() ? 'linear-gradient(135deg, #0891b2, #06b6d4)' : 'rgba(255,255,255,0.03)',
                    color: url.trim() ? '#fff' : '#2a2f42',
                    boxShadow: url.trim()
                      ? '0 4px 20px rgba(6,182,212,0.3), inset 0 1px 0 rgba(255,255,255,0.1)'
                      : 'none',
                    opacity: url.trim() ? 1 : 0.5,
                    transform: url.trim() ? 'scale(1)' : 'scale(0.97)',
                  }}
                >
                  Build
                  <svg
                    className="h-3.5 w-3.5 transition-transform duration-300"
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
                  padding: '1px 6px',
                  borderRadius: '4px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.06)',
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
          50% { transform: translateX(-50%) scale(1.08); opacity: 0.7; }
        }

        @keyframes heroOrbDrift {
          0%, 100% { transform: translate(0, 0); }
          33% { transform: translate(15px, -10px); }
          66% { transform: translate(-10px, 8px); }
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
