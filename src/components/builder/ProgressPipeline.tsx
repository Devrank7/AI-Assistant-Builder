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
  deploy: 'Deploy',
  integrations: 'Integrations',
  suggestions: 'Suggestions',
  workspace: 'Workspace',
};

const STAGE_ICONS: Record<BuilderStage, React.ReactNode> = {
  input: (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m9.86-2.072a4.5 4.5 0 0 0-1.242-7.244l-4.5-4.5a4.5 4.5 0 0 0-6.364 6.364L4.344 8.69"
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
  integrations: (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 0 1-.657.643 48.39 48.39 0 0 1-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 0 1-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 0 0-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 0 1-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 0 0 .657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 0 1-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.4.604-.4.959v0c0 .333.277.599.61.58a48.1 48.1 0 0 0 5.427-.63 48.05 48.05 0 0 0 .582-4.717.532.532 0 0 0-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.96.401v0a.656.656 0 0 0 .658-.663 48.422 48.422 0 0 0-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 0 1-.61-.58v0Z"
      />
    </svg>
  ),
  suggestions: (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"
      />
    </svg>
  ),
  workspace: (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5"
      />
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
