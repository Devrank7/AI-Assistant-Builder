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
      <div className="flex gap-2 rounded-xl bg-white/5 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
              activeTab === tab.id
                ? 'border border-white/10 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 text-white shadow-lg'
                : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
            }`}
          >
            {tab.icon && <span>{tab.icon}</span>}
            {tab.label}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span
                className={`flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                  activeTab === tab.id ? 'bg-blue-500/30 text-blue-300' : 'bg-white/10 text-gray-500'
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
    <div className="flex gap-0 border-b border-white/5">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`relative flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors ${
            activeTab === tab.id ? 'text-white' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          {tab.icon && <span>{tab.icon}</span>}
          {tab.label}
          {tab.badge !== undefined && tab.badge > 0 && (
            <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-blue-500/20 px-1 text-[10px] font-bold text-blue-400">
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
