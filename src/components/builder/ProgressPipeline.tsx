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
};

const STAGE_ICONS: Record<BuilderStage, string> = {
  input: '🔗',
  analysis: '🔍',
  design: '🎨',
  knowledge: '📚',
  deploy: '🚀',
  integrations: '🔌',
};

export default function ProgressPipeline({ currentStage }: Props) {
  const currentIndex = BUILDER_STAGES.indexOf(currentStage);

  return (
    <div className="flex items-center justify-between border-b border-gray-200 bg-white/80 px-6 py-3 backdrop-blur-sm">
      {BUILDER_STAGES.map((stage, i) => {
        const isComplete = i < currentIndex;
        const isActive = i === currentIndex;

        return (
          <div key={stage} className="flex items-center">
            {i > 0 && (
              <div
                className={`mx-2 h-0.5 w-8 transition-colors duration-500 ${
                  isComplete ? 'bg-green-500' : 'bg-gray-200'
                }`}
              />
            )}
            <div className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm transition-all duration-500 ${
                  isComplete
                    ? 'bg-green-500 text-white'
                    : isActive
                      ? 'bg-blue-500 text-white ring-2 ring-blue-200'
                      : 'bg-gray-100 text-gray-400'
                }`}
              >
                {isComplete ? '✓' : STAGE_ICONS[stage]}
              </div>
              <span
                className={`hidden text-xs font-medium transition-colors sm:block ${
                  isComplete ? 'text-green-600' : isActive ? 'text-blue-600' : 'text-gray-400'
                }`}
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
