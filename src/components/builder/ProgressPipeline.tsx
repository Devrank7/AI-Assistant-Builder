'use client';

import type { BuilderStage } from '@/lib/builder/types';
import { BUILDER_STAGES } from '@/lib/builder/types';

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
    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.072a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.344 8.69"
      />
    </svg>
  ),
  analysis: (
    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
      />
    </svg>
  ),
  design: (
    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Z"
      />
    </svg>
  ),
  knowledge: (
    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25v14.25"
      />
    </svg>
  ),
  deploy: (
    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.631 8.41m5.96 5.96a14.926 14.926 0 0 1-5.841 2.58m-.119-8.54a6 6 0 0 0-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 0 0-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 0 1-2.448-2.448 14.9 14.9 0 0 1 .06-.312m-2.24 2.39a4.493 4.493 0 0 0-1.757 4.306 4.493 4.493 0 0 0 4.306-1.758M16.5 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z"
      />
    </svg>
  ),
  integrations: (
    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 2.25 2.25 4.5-4.5m2.25 0 4.5 4.5 2.25-2.25" />
    </svg>
  ),
  suggestions: (
    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"
      />
    </svg>
  ),
  workspace: (
    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5"
      />
    </svg>
  ),
};

export default function ProgressPipeline({ currentStage }: Props) {
  const currentIndex = BUILDER_STAGES.indexOf(currentStage);

  return (
    <div
      className="relative flex items-center justify-center gap-0.5 overflow-x-auto px-4 py-3 sm:gap-1 sm:px-6"
      style={{
        background: 'rgba(255,255,255,0.01)',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
      }}
    >
      {BUILDER_STAGES.map((stage, i) => {
        const isComplete = i < currentIndex;
        const isActive = i === currentIndex;

        return (
          <div key={stage} className="flex items-center">
            {i > 0 && (
              <div
                className="mx-0.5 h-px w-4 transition-all duration-700 sm:mx-1 sm:w-8 md:w-10"
                style={{
                  background: isComplete
                    ? 'linear-gradient(90deg, rgba(16,185,129,0.6), rgba(6,182,212,0.6))'
                    : 'rgba(255,255,255,0.04)',
                }}
              />
            )}
            <div className="flex items-center gap-1.5">
              <div className="relative">
                {isActive && (
                  <div
                    className="absolute -inset-1.5 rounded-full"
                    style={{
                      background: 'rgba(6,182,212,0.08)',
                      border: '1px solid rgba(6,182,212,0.12)',
                      animation: 'stagePulse 2.5s ease-in-out infinite',
                    }}
                  />
                )}
                <div
                  className="relative flex h-6 w-6 items-center justify-center rounded-full transition-all duration-600"
                  style={{
                    background: isComplete
                      ? 'linear-gradient(135deg, #10b981, #059669)'
                      : isActive
                        ? 'linear-gradient(135deg, #06b6d4, #0891b2)'
                        : 'rgba(255,255,255,0.03)',
                    border: isComplete
                      ? '1px solid rgba(16,185,129,0.3)'
                      : isActive
                        ? '1px solid rgba(6,182,212,0.3)'
                        : '1px solid rgba(255,255,255,0.06)',
                    color: isComplete || isActive ? '#fff' : '#3d4357',
                    boxShadow: isComplete
                      ? '0 0 12px rgba(16,185,129,0.15)'
                      : isActive
                        ? '0 0 16px rgba(6,182,212,0.2)'
                        : 'none',
                  }}
                >
                  {isComplete ? (
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                  ) : (
                    STAGE_ICONS[stage]
                  )}
                </div>
              </div>
              <span
                className="hidden text-[11px] font-medium tracking-wide transition-colors duration-300 md:block"
                style={{
                  color: isComplete ? '#34d399' : isActive ? '#22d3ee' : '#3d4357',
                  fontFamily: "'Outfit', sans-serif",
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
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.08); }
        }
      `}</style>
    </div>
  );
}
