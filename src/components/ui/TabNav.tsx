'use client';

interface Tab {
  id: string;
  label: string;
  icon?: string;
  badge?: number;
}

interface TabNavProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  variant?: 'underline' | 'pills';
}

export default function TabNav({ tabs, activeTab, onChange, variant = 'underline' }: TabNavProps) {
  if (variant === 'pills') {
    return (
      <div className="bg-bg-tertiary flex gap-2 rounded-xl p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
              activeTab === tab.id
                ? 'border-border text-text-primary border bg-gradient-to-r from-blue-500/20 to-indigo-500/20 shadow-lg'
                : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
            }`}
          >
            {tab.icon && <span>{tab.icon}</span>}
            {tab.label}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span
                className={`flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                  activeTab === tab.id ? 'bg-accent/30 text-accent' : 'bg-bg-tertiary text-text-secondary'
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="border-border flex gap-0 border-b">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`relative flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors ${
            activeTab === tab.id ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          {tab.icon && <span>{tab.icon}</span>}
          {tab.label}
          {tab.badge !== undefined && tab.badge > 0 && (
            <span className="bg-accent/20 text-accent flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold">
              {tab.badge}
            </span>
          )}
          {activeTab === tab.id && (
            <span className="absolute right-0 bottom-0 left-0 h-[2px] rounded-t-full bg-gradient-to-r from-blue-500 to-indigo-500" />
          )}
        </button>
      ))}
    </div>
  );
}
