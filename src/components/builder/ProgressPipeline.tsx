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
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.072a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.344 8.69"
      />
    </svg>
  ),
  analysis: (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
      />
    </svg>
  ),
  design: (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Zm0 0a15.998 15.998 0 0 0 3.388-1.62m-5.043-.025a15.994 15.994 0 0 1 1.622-3.395m3.42 3.42a15.995 15.995 0 0 0 4.764-4.648l3.876-5.814a1.151 1.151 0 0 0-1.597-1.597L14.146 6.32a15.996 15.996 0 0 0-4.649 4.763m3.42 3.42a6.776 6.776 0 0 0-3.42-3.42"
      />
    </svg>
  ),
  knowledge: (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
      />
    </svg>
  ),
  deploy: (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.631 8.41m5.96 5.96a14.926 14.926 0 0 1-5.841 2.58m-.119-8.54a6 6 0 0 0-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 0 0-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 0 1-2.448-2.448 14.9 14.9 0 0 1 .06-.312m-2.24 2.39a4.493 4.493 0 0 0-1.757 4.306 4.493 4.493 0 0 0 4.306-1.758M16.5 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z"
      />
    </svg>
  ),
  integrations: (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 2.25 2.25 4.5-4.5m2.25 0 4.5 4.5 2.25-2.25" />
    </svg>
  ),
  suggestions: (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"
      />
    </svg>
  ),
  workspace: (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
      className="flex items-center justify-center gap-1 px-6 py-3"
      style={{
        background: 'rgba(255,255,255,0.015)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {BUILDER_STAGES.map((stage, i) => {
        const isComplete = i < currentIndex;
        const isActive = i === currentIndex;

        return (
          <div key={stage} className="flex items-center">
            {i > 0 && (
              <div
                className="mx-1 h-px w-8 transition-all duration-700 sm:w-12"
                style={{
                  background: isComplete ? 'linear-gradient(90deg, #10b981, #06b6d4)' : 'rgba(255,255,255,0.06)',
                }}
              />
            )}
            <div className="flex items-center gap-2">
              <div className="relative">
                {isActive && (
                  <div
                    className="absolute -inset-1.5 animate-pulse rounded-full"
                    style={{
                      background: 'rgba(6,182,212,0.12)',
                      border: '1px solid rgba(6,182,212,0.15)',
                    }}
                  />
                )}
                <div
                  className="relative flex h-7 w-7 items-center justify-center rounded-full transition-all duration-500"
                  style={{
                    background: isComplete
                      ? 'linear-gradient(135deg, #10b981, #059669)'
                      : isActive
                        ? 'linear-gradient(135deg, #06b6d4, #0891b2)'
                        : 'rgba(255,255,255,0.04)',
                    border: isComplete
                      ? '1px solid rgba(16,185,129,0.4)'
                      : isActive
                        ? '1px solid rgba(6,182,212,0.4)'
                        : '1px solid rgba(255,255,255,0.08)',
                    color: isComplete || isActive ? '#fff' : '#4a5068',
                    boxShadow: isComplete
                      ? '0 0 12px rgba(16,185,129,0.2)'
                      : isActive
                        ? '0 0 16px rgba(6,182,212,0.25)'
                        : 'none',
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
                    STAGE_ICONS[stage]
                  )}
                </div>
              </div>
              <span
                className="hidden text-xs font-medium transition-colors duration-300 sm:block"
                style={{
                  color: isComplete ? '#34d399' : isActive ? '#22d3ee' : '#4a5068',
                  fontFamily: "'Outfit', sans-serif",
                }}
              >
                {STAGE_LABELS[stage]}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
