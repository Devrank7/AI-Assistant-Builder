'use client';

import { useEffect, useRef } from 'react';
import type { BuilderStage } from '@/lib/builder/types';
import { BUILDER_STAGES } from '@/lib/builder/types';
import { playStageSound } from '@/lib/sounds';
import { useTheme } from '@/components/ThemeProvider';

interface Props {
  currentStage: BuilderStage;
}

const STAGE_LABELS: Record<BuilderStage, string> = {
  input: 'Input',
  analysis: 'Analysis',
  design: 'Design',
  knowledge: 'Knowledge',
  customize: 'Customize',
  deploy: 'Deploy',
};

const STAGE_ICONS: Record<BuilderStage, React.ReactNode> = {
  input: (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"
      />
    </svg>
  ),
  analysis: (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
      />
    </svg>
  ),
  design: (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.098 19.902a3.75 3.75 0 0 0 5.304 0l6.401-6.402M6.75 21A3.75 3.75 0 0 1 3 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 0 0 3.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008Z"
      />
    </svg>
  ),
  knowledge: (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
      />
    </svg>
  ),
  deploy: (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.631 8.41m5.96 5.96a14.926 14.926 0 0 1-5.841 2.58m-.119-8.54a6 6 0 0 0-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 0 0-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 0 1-2.448-2.448 14.9 14.9 0 0 1 .06-.312m-2.24 2.39a4.493 4.493 0 0 0-1.757 4.306 4.493 4.493 0 0 0 4.306-1.758M16.5 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z"
      />
    </svg>
  ),
  customize: (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  ),
};

export default function ProgressPipeline({ currentStage }: Props) {
  const currentIndex = BUILDER_STAGES.indexOf(currentStage);
  const prevStageRef = useRef<BuilderStage>(currentStage);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  // Play sound when stage advances
  useEffect(() => {
    if (prevStageRef.current !== currentStage) {
      const prevIndex = BUILDER_STAGES.indexOf(prevStageRef.current);
      const newIndex = BUILDER_STAGES.indexOf(currentStage);
      if (newIndex > prevIndex) {
        playStageSound();
      }
      prevStageRef.current = currentStage;
    }
  }, [currentStage]);

  return (
    <div
      className="relative flex items-center justify-center gap-0.5 overflow-x-auto px-4 py-3 sm:gap-1 sm:px-6"
      style={{
        background: isDark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)',
        borderBottom: isDark ? '1px solid rgba(255,255,255,0.04)' : '1px solid #E5E7EB',
      }}
    >
      {BUILDER_STAGES.map((stage, i) => {
        const isComplete = i < currentIndex;
        const isActive = i === currentIndex;
        const isPending = i > currentIndex;

        return (
          <div key={stage} className="flex items-center">
            {/* Animated connecting line */}
            {i > 0 && (
              <div
                className="relative mx-0.5 h-[1.5px] w-4 overflow-hidden rounded-full sm:mx-1 sm:w-8 md:w-10"
                style={{
                  background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.08)',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: 'inherit',
                    background: isComplete
                      ? 'linear-gradient(90deg, rgba(16,185,129,0.7), rgba(6,182,212,0.7))'
                      : isActive
                        ? 'linear-gradient(90deg, rgba(16,185,129,0.7), rgba(6,182,212,0.5))'
                        : 'transparent',
                    transform: isComplete ? 'scaleX(1)' : isActive ? 'scaleX(0.5)' : 'scaleX(0)',
                    transformOrigin: 'left',
                    transition: 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  }}
                />
              </div>
            )}

            <div className="flex items-center gap-1.5">
              <div className="relative">
                {/* Active stage outer glow ring */}
                {isActive && (
                  <>
                    {/* Soft ambient glow */}
                    <div
                      style={{
                        position: 'absolute',
                        inset: '-6px',
                        borderRadius: '9999px',
                        background: 'radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 70%)',
                        animation: 'stageGlow 3s ease-in-out infinite',
                      }}
                    />
                    {/* Refined pulse ring */}
                    <div
                      style={{
                        position: 'absolute',
                        inset: '-4px',
                        borderRadius: '9999px',
                        border: '1px solid rgba(6,182,212,0.15)',
                        animation: 'stagePulse 2.5s ease-in-out infinite',
                      }}
                    />
                  </>
                )}

                {/* Completed stage subtle shimmer */}
                {isComplete && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: '-2px',
                      borderRadius: '9999px',
                      background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)',
                    }}
                  />
                )}

                {/* Stage indicator circle */}
                <div
                  style={{
                    position: 'relative',
                    display: 'flex',
                    height: '24px',
                    width: '24px',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '9999px',
                    transition: 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    background: isComplete
                      ? 'linear-gradient(145deg, #10b981, #059669)'
                      : isActive
                        ? 'linear-gradient(145deg, #06b6d4, #0891b2)'
                        : isDark
                          ? 'rgba(255,255,255,0.025)'
                          : 'rgba(0,0,0,0.04)',
                    border: isComplete
                      ? '1px solid rgba(16,185,129,0.35)'
                      : isActive
                        ? '1px solid rgba(6,182,212,0.35)'
                        : isDark
                          ? '1px solid rgba(255,255,255,0.06)'
                          : '1px solid rgba(0,0,0,0.10)',
                    color: isComplete
                      ? '#fff'
                      : isActive
                        ? '#fff'
                        : isDark
                          ? 'rgba(61,67,87,0.7)'
                          : 'rgba(107,114,128,0.8)',
                    boxShadow: isComplete
                      ? '0 0 12px rgba(16,185,129,0.18), 0 2px 4px rgba(16,185,129,0.1), inset 0 1px 0 rgba(255,255,255,0.12)'
                      : isActive
                        ? '0 0 20px rgba(6,182,212,0.22), 0 2px 8px rgba(6,182,212,0.15), inset 0 1px 0 rgba(255,255,255,0.12)'
                        : 'inset 0 1px 0 rgba(255,255,255,0.02)',
                    transform: isActive ? 'scale(1.05)' : 'scale(1)',
                  }}
                >
                  {isComplete ? (
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                  ) : (
                    <span style={{ opacity: isPending ? 0.5 : 1, transition: 'opacity 0.4s ease' }}>
                      {STAGE_ICONS[stage]}
                    </span>
                  )}
                </div>
              </div>

              {/* Stage label */}
              <span
                className="hidden text-[11px] font-medium tracking-wide md:block"
                style={{
                  color: isComplete
                    ? '#34d399'
                    : isActive
                      ? '#22d3ee'
                      : isDark
                        ? 'rgba(61,67,87,0.6)'
                        : 'rgba(107,114,128,0.7)',
                  fontFamily: "'Outfit', sans-serif",
                  transition: 'color 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.5s ease',
                  textShadow: isActive
                    ? '0 0 12px rgba(34,211,238,0.25)'
                    : isComplete
                      ? '0 0 8px rgba(52,211,153,0.15)'
                      : 'none',
                }}
              >
                {STAGE_LABELS[stage]}
              </span>
            </div>
          </div>
        );
      })}

      <style>{`
        @keyframes stagePulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.12); }
        }
        @keyframes stageGlow {
          0%, 100% { opacity: 0.6; transform: scale(0.95); }
          50% { opacity: 1; transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
}
