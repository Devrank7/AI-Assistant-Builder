'use client';

export type AgentType = 'orchestrator' | 'design' | 'content' | 'knowledge' | 'integration' | 'qa' | 'deploy';

const AGENT_CONFIG: Record<AgentType, { label: string; icon: string; color: string }> = {
  orchestrator: { label: 'Orchestrator', icon: '🎯', color: 'text-blue-400' },
  design: { label: 'Design Agent', icon: '🎨', color: 'text-purple-400' },
  content: { label: 'Content Agent', icon: '✍️', color: 'text-cyan-400' },
  knowledge: { label: 'Knowledge Agent', icon: '📚', color: 'text-amber-400' },
  integration: { label: 'Integration Agent', icon: '🔗', color: 'text-green-400' },
  qa: { label: 'QA Agent', icon: '🧪', color: 'text-red-400' },
  deploy: { label: 'Deploy Agent', icon: '🚀', color: 'text-emerald-400' },
};

interface AgentActivity {
  agent: AgentType;
  task: string;
  timestamp: number;
}

interface AgentActivityFeedProps {
  activities: AgentActivity[];
  activeAgent: AgentType | null;
}

export default function AgentActivityFeed({ activities, activeAgent }: AgentActivityFeedProps) {
  if (activities.length === 0) return null;

  return (
    <div className="mx-4 mb-3 rounded-lg border border-white/5 bg-white/[0.02] p-3">
      <p className="mb-2 text-[10px] font-semibold tracking-wider text-gray-600 uppercase">Agent Activity</p>
      <div className="space-y-1.5">
        {activities.slice(-5).map((a, i) => {
          const cfg = AGENT_CONFIG[a.agent];
          const isActive = activeAgent === a.agent && i === activities.slice(-5).length - 1;
          return (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs">{cfg.icon}</span>
              <span className={`text-xs font-medium ${isActive ? cfg.color : 'text-gray-600'}`}>{cfg.label}</span>
              <span className="text-xs text-gray-700">{a.task}</span>
              {isActive && <span className="ml-auto h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
