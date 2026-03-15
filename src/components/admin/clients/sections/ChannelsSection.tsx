'use client';

interface ChannelsSectionProps {
  client: {
    telegramBotToken?: string;
    whatsappPhoneNumber?: string;
    instagramToken?: string;
  };
}

interface ChannelCard {
  name: string;
  connected: boolean;
  icon: string;
}

export function ChannelsSection({ client }: ChannelsSectionProps) {
  const channels: ChannelCard[] = [
    { name: 'Website', connected: true, icon: '🌐' },
    { name: 'Telegram', connected: !!client.telegramBotToken, icon: '✈️' },
    { name: 'WhatsApp', connected: !!client.whatsappPhoneNumber, icon: '💬' },
    { name: 'Instagram', connected: !!client.instagramToken, icon: '📷' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {channels.map((channel) => (
        <div
          key={channel.name}
          className={`rounded-xl border p-4 text-center ${
            channel.connected
              ? 'border-emerald-500/20 bg-emerald-500/5'
              : 'border-[var(--admin-border-subtle)] bg-[var(--admin-bg-primary)]'
          }`}
        >
          <div className="mb-2 text-2xl">{channel.icon}</div>
          <p className="text-sm font-medium text-[var(--admin-text-primary)]">{channel.name}</p>
          <p className={`mt-1 text-xs ${channel.connected ? 'text-emerald-400' : 'text-[var(--admin-text-muted)]'}`}>
            {channel.connected ? 'Connected' : 'Not connected'}
          </p>
        </div>
      ))}
    </div>
  );
}
