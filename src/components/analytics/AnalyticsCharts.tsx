'use client';

import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ChartDataPoint {
  name: string;
  value: number;
  [key: string]: string | number;
}

interface MessagesChartProps {
  data: ChartDataPoint[];
  dataKey?: string;
  color?: string;
  title?: string;
  height?: number;
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-[#1a1a2e] px-3 py-2 shadow-xl">
      <p className="mb-1 text-xs text-gray-400">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-sm font-semibold text-white">
          {entry.value.toLocaleString('ru-RU')}
        </p>
      ))}
    </div>
  );
};

export function MessagesChart({ data, dataKey = 'value', color = '#06b6d4', title, height = 300 }: MessagesChartProps) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
      {title && <h3 className="mb-4 text-sm font-medium text-gray-400">{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id={`gradient-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 12 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} tickLine={false} axisLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            fill={`url(#gradient-${color.replace('#', '')})`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ActivityBarChart({
  data,
  dataKey = 'value',
  color = '#a855f7',
  title,
  height = 300,
}: MessagesChartProps) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
      {title && <h3 className="mb-4 text-sm font-medium text-gray-400">{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 12 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} tickLine={false} axisLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

interface TopQuestionsProps {
  data: { question: string; count: number }[];
  title?: string;
}

export function TopQuestions({ data, title = 'Топ вопросов' }: TopQuestionsProps) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
      <h3 className="mb-4 text-sm font-medium text-gray-400">{title}</h3>
      <div className="space-y-3">
        {data.map((item, i) => (
          <div key={i} className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="mr-4 truncate text-gray-300">{item.question}</span>
              <span className="flex-shrink-0 text-gray-500">{item.count}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-500"
                style={{ width: `${(item.count / maxCount) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
