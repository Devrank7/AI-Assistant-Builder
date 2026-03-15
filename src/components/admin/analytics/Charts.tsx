'use client';

import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DayDataPoint {
  date: string;
  count: number;
}

interface ChannelDataPoint {
  channel: string;
  count: number;
}

interface ClientDataPoint {
  name: string;
  sessions: number;
}

interface AnalyticsData {
  messagesPerDay: DayDataPoint[];
  userGrowth: DayDataPoint[];
  messagesByChannel: ChannelDataPoint[];
  topClients: ClientDataPoint[];
  avgConversationLength: number;
  totalSessions: number;
}

interface ChartsProps {
  data: AnalyticsData | null;
  loading: boolean;
}

function ChartCard({ title, children, loading }: { title: string; children: React.ReactNode; loading: boolean }) {
  return (
    <div className="rounded-xl border border-[var(--admin-border-subtle)] bg-[var(--admin-bg-card)] p-5">
      <p className="mb-4 text-[11px] font-medium tracking-[0.06em] text-[var(--admin-text-muted)] uppercase">{title}</p>
      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="admin-skeleton h-40 w-full" />
        </div>
      ) : (
        children
      )}
    </div>
  );
}

function StatInfoCard({ label, value, loading }: { label: string; value: string; loading: boolean }) {
  return (
    <div className="rounded-xl border border-[var(--admin-border-subtle)] bg-[var(--admin-bg-card)] p-5">
      <p className="text-[11px] font-medium tracking-[0.06em] text-[var(--admin-text-muted)] uppercase">{label}</p>
      {loading ? (
        <div className="admin-skeleton mt-2 h-8 w-24" />
      ) : (
        <p className="mt-1 text-3xl font-bold text-[var(--admin-text-primary)]">{value}</p>
      )}
    </div>
  );
}

const tooltipStyle = {
  backgroundColor: 'var(--admin-bg-card)',
  border: '1px solid var(--admin-border-emphasis)',
  borderRadius: '8px',
  color: 'var(--admin-text-primary)',
  fontSize: '12px',
};

export function Charts({ data, loading }: ChartsProps) {
  const messagesPerDay = data?.messagesPerDay ?? [];
  const userGrowth = data?.userGrowth ?? [];
  const messagesByChannel = data?.messagesByChannel ?? [];
  const topClients = (data?.topClients ?? []).slice(0, 10);
  const avgLen = data?.avgConversationLength ?? 0;
  const totalSessions = data?.totalSessions ?? 0;

  return (
    <div className="space-y-4">
      {/* Row 1: Line Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Messages Per Day" loading={loading}>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={messagesPerDay} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--admin-border-subtle)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: 'var(--admin-text-muted)' }}
                tickFormatter={(v: string) => {
                  const d = new Date(v);
                  return `${d.getMonth() + 1}/${d.getDate()}`;
                }}
              />
              <YAxis tick={{ fontSize: 10, fill: 'var(--admin-text-muted)' }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="User Growth" loading={loading}>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={userGrowth} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--admin-border-subtle)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: 'var(--admin-text-muted)' }}
                tickFormatter={(v: string) => {
                  const d = new Date(v);
                  return `${d.getMonth() + 1}/${d.getDate()}`;
                }}
              />
              <YAxis tick={{ fontSize: 10, fill: 'var(--admin-text-muted)' }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="count" stroke="#22c55e" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Row 2: Bar Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Messages by Channel" loading={loading}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={messagesByChannel} layout="vertical" margin={{ top: 5, right: 10, left: 20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--admin-border-subtle)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--admin-text-muted)' }} />
              <YAxis
                type="category"
                dataKey="channel"
                tick={{ fontSize: 10, fill: 'var(--admin-text-muted)' }}
                width={60}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" fill="#a855f7" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Top 10 Active Clients" loading={loading}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={topClients} layout="vertical" margin={{ top: 5, right: 10, left: 20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--admin-border-subtle)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--admin-text-muted)' }} />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 10, fill: 'var(--admin-text-muted)' }}
                width={80}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="sessions" fill="#f59e0b" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Row 3: Quality stat cards */}
      <div className="grid grid-cols-2 gap-4">
        <StatInfoCard label="Avg Conversation Length" value={loading ? '...' : `${avgLen} msgs`} loading={loading} />
        <StatInfoCard label="Total Sessions" value={loading ? '...' : String(totalSessions)} loading={loading} />
      </div>
    </div>
  );
}
