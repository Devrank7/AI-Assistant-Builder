'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Syne } from 'next/font/google';
import { AnimatedNumber } from '@/components/ui/motion';
import {
  Users,
  Search,
  X,
  Tag,
  Phone,
  Mail,
  Globe,
  MessageSquare,
  Clock,
  Plus,
  Flame,
  Thermometer,
  Snowflake,
  UserPlus,
  ChevronRight,
  Hash,
  Activity,
  Send,
  Eye,
  Star,
  ArrowUpRight,
} from 'lucide-react';

/* ── Display font ── */
const syne = Syne({ subsets: ['latin'], weight: ['700', '800'], display: 'swap' });

/* ── Types ── */
interface Contact {
  contactId: string;
  clientId: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  channel: string;
  channelIds: Record<string, string>;
  tags: string[];
  leadScore: number;
  leadTemp: 'cold' | 'warm' | 'hot';
  scoreBreakdown: Array<{ reason: string; points: number }>;
  totalConversations: number;
  totalMessages: number;
  lastSeenAt: string;
  firstSeenAt: string;
  createdAt: string;
}

interface ContactDetail extends Contact {
  timeline?: TimelineEvent[];
  conversations?: Array<{ id: string; channel: string; messages: number; lastMessage: string }>;
}

interface TimelineEvent {
  id: string;
  type: 'message' | 'visit' | 'conversion' | 'tag_added' | 'score_change' | 'first_seen';
  description: string;
  timestamp: string;
  meta?: Record<string, unknown>;
}

interface Stats {
  total: number;
  hot: number;
  warm: number;
  cold: number;
  newToday: number;
}

/* ── Animations ── */
const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 120, damping: 16 },
  },
};

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.4, 0.25, 1] as const } },
};

const slideIn = {
  initial: { opacity: 0, x: 40 },
  animate: { opacity: 1, x: 0, transition: { type: 'spring' as const, stiffness: 200, damping: 24 } },
  exit: { opacity: 0, x: 40, transition: { duration: 0.2 } },
};

/* ── Stat gradients ── */
const STAT_GRADIENTS = [
  { from: '#3B82F6', to: '#60A5FA', glow: 'rgba(59,130,246,0.15)' },
  { from: '#EF4444', to: '#F87171', glow: 'rgba(239,68,68,0.15)' },
  { from: '#F59E0B', to: '#FBBF24', glow: 'rgba(245,158,11,0.15)' },
  { from: '#10B981', to: '#34D399', glow: 'rgba(16,185,129,0.15)' },
];

/* ── Helpers ── */
function getTimeAgo(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getInitials(name: string | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function hashName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  return Math.abs(hash);
}

const AVATAR_GRADIENTS = [
  'from-blue-500 to-cyan-400',
  'from-violet-500 to-purple-400',
  'from-pink-500 to-rose-400',
  'from-amber-500 to-orange-400',
  'from-emerald-500 to-teal-400',
  'from-indigo-500 to-blue-400',
  'from-fuchsia-500 to-pink-400',
  'from-sky-500 to-cyan-400',
];

function getAvatarGradient(name: string): string {
  return AVATAR_GRADIENTS[hashName(name) % AVATAR_GRADIENTS.length];
}

const CHANNEL_CONFIG: Record<string, { icon: typeof Globe; label: string; color: string }> = {
  web: { icon: Globe, label: 'Web', color: '#3B82F6' },
  telegram: { icon: Send, label: 'Telegram', color: '#0088CC' },
  whatsapp: { icon: Phone, label: 'WhatsApp', color: '#25D366' },
  instagram: { icon: Hash, label: 'Instagram', color: '#E4405F' },
};

function getChannelConfig(channel: string) {
  return CHANNEL_CONFIG[channel.toLowerCase()] || CHANNEL_CONFIG.web;
}

const TEMP_CONFIG = {
  hot: {
    label: 'Hot',
    color: '#EF4444',
    bg: 'rgba(239,68,68,0.08)',
    border: 'rgba(239,68,68,0.15)',
    glow: '0 0 12px rgba(239,68,68,0.15)',
    icon: Flame,
  },
  warm: {
    label: 'Warm',
    color: '#F59E0B',
    bg: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.15)',
    glow: '0 0 12px rgba(245,158,11,0.15)',
    icon: Thermometer,
  },
  cold: {
    label: 'Cold',
    color: '#6B7280',
    bg: 'rgba(107,114,128,0.08)',
    border: 'rgba(107,114,128,0.15)',
    glow: 'none',
    icon: Snowflake,
  },
};

const TIMELINE_ICONS: Record<string, { icon: typeof MessageSquare; color: string }> = {
  message: { icon: MessageSquare, color: '#3B82F6' },
  visit: { icon: Eye, color: '#8B5CF6' },
  conversion: { icon: Star, color: '#F59E0B' },
  tag_added: { icon: Tag, color: '#10B981' },
  score_change: { icon: ArrowUpRight, color: '#EF4444' },
  first_seen: { icon: UserPlus, color: '#6366F1' },
};

/* ═══════════════════════════════════════════════════
   STAT CARD
   ═══════════════════════════════════════════════════ */
function StatCard({
  label,
  numericValue,
  icon,
  gradientIndex,
  loading,
}: {
  label: string;
  numericValue: number;
  icon: React.ReactNode;
  gradientIndex: number;
  loading: boolean;
}) {
  const g = STAT_GRADIENTS[gradientIndex];

  return (
    <motion.div
      variants={staggerItem}
      className="group relative overflow-hidden rounded-2xl border border-gray-200/60 bg-white p-5 transition-all duration-300 hover:border-gray-300/80 dark:border-white/[0.06] dark:bg-[#111118] dark:hover:border-white/[0.12]"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.02)' }}
    >
      <div
        className="absolute inset-x-0 top-0 h-[2px] opacity-60 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: `linear-gradient(90deg, ${g.from}, ${g.to})` }}
      />
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase dark:text-gray-500">
            {label}
          </p>
          {loading ? (
            <div className="mt-3 h-9 w-20 animate-pulse rounded-lg bg-gray-100 dark:bg-white/[0.04]" />
          ) : (
            <AnimatedNumber
              value={numericValue}
              className={`${syne.className} mt-2 block text-3xl font-bold text-gray-900 dark:text-white`}
            />
          )}
        </div>
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105"
          style={{
            background: `linear-gradient(135deg, ${g.from}15, ${g.to}20)`,
            color: g.from,
            boxShadow: `0 0 0 1px ${g.from}15`,
          }}
        >
          {icon}
        </div>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════
   AVATAR COMPONENT
   ═══════════════════════════════════════════════════ */
function ContactAvatar({ name, size = 'md' }: { name: string | null; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const displayName = name || 'Unknown';
  const gradient = getAvatarGradient(displayName);
  const sizes = {
    sm: 'h-8 w-8 text-[10px]',
    md: 'h-10 w-10 text-xs',
    lg: 'h-12 w-12 text-sm',
    xl: 'h-16 w-16 text-lg',
  };

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-semibold text-white shadow-sm ${gradient} ${sizes[size]}`}
    >
      {getInitials(displayName)}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   LEAD SCORE BADGE
   ═══════════════════════════════════════════════════ */
function LeadScoreBadge({
  temp,
  score,
  size = 'sm',
}: {
  temp: 'hot' | 'warm' | 'cold';
  score: number;
  size?: 'sm' | 'md';
}) {
  const config = TEMP_CONFIG[temp];
  const TempIcon = config.icon;
  const isSmall = size === 'sm';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold ${
        isSmall ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]'
      }`}
      style={{
        background: config.bg,
        color: config.color,
        border: `1px solid ${config.border}`,
        boxShadow: config.glow,
      }}
    >
      <TempIcon className={isSmall ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
      {score}
    </span>
  );
}

/* ═══════════════════════════════════════════════════
   CONTACT LIST ITEM
   ═══════════════════════════════════════════════════ */
function ContactListItem({
  contact,
  isSelected,
  onClick,
}: {
  contact: Contact;
  isSelected: boolean;
  onClick: () => void;
}) {
  const channelCfg = getChannelConfig(contact.channel);
  const ChannelIcon = channelCfg.icon;

  return (
    <motion.button
      variants={staggerItem}
      layout
      onClick={onClick}
      className={`group relative flex w-full items-center gap-3 px-4 py-3 text-left transition-all duration-200 ${
        isSelected ? 'bg-gray-50 dark:bg-white/[0.04]' : 'hover:bg-gray-50/50 dark:hover:bg-white/[0.02]'
      }`}
    >
      {/* Selected accent bar */}
      <div
        className={`absolute inset-y-0 left-0 w-[3px] rounded-r-full transition-all duration-200 ${
          isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'
        }`}
        style={{ background: 'linear-gradient(180deg, #6366F1, #8B5CF6)' }}
      />

      {/* Avatar */}
      <ContactAvatar name={contact.name} size="md" />

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[13px] font-semibold text-gray-900 dark:text-white">
            {contact.name || 'Unknown'}
          </span>
          <LeadScoreBadge temp={contact.leadTemp} score={contact.leadScore} />
        </div>

        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-gray-400 dark:text-gray-500">
          {contact.email && (
            <span className="flex items-center gap-1 truncate">
              <Mail className="h-2.5 w-2.5 shrink-0" />
              <span className="truncate">{contact.email}</span>
            </span>
          )}
        </div>

        <div className="mt-1 flex items-center gap-2">
          {/* Channel */}
          <span
            className="inline-flex items-center gap-1 rounded-full px-1.5 py-px text-[9px] font-semibold tracking-wider uppercase"
            style={{
              background: `${channelCfg.color}10`,
              color: channelCfg.color,
              border: `1px solid ${channelCfg.color}20`,
            }}
          >
            <ChannelIcon className="h-2 w-2" />
            {channelCfg.label}
          </span>

          {/* Tags (max 2) */}
          {contact.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center rounded-full bg-gray-100 px-1.5 py-px text-[9px] font-medium text-gray-500 dark:bg-white/[0.06] dark:text-gray-400"
            >
              {tag}
            </span>
          ))}
          {contact.tags.length > 2 && (
            <span className="text-[9px] text-gray-400 dark:text-gray-500">+{contact.tags.length - 2}</span>
          )}
        </div>
      </div>

      {/* Right: time */}
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="text-[10px] text-gray-400 dark:text-gray-500">{getTimeAgo(contact.lastSeenAt)}</span>
        <ChevronRight className="h-3.5 w-3.5 text-gray-300 transition-transform duration-200 group-hover:translate-x-0.5 dark:text-gray-600" />
      </div>
    </motion.button>
  );
}

/* ═══════════════════════════════════════════════════
   DETAIL PANEL
   ═══════════════════════════════════════════════════ */
function DetailPanel({
  contact,
  timeline,
  loading,
  onTagAdd,
  onTagRemove,
  onClose,
}: {
  contact: ContactDetail | null;
  timeline: TimelineEvent[];
  loading: boolean;
  onTagAdd: (tag: string) => void;
  onTagRemove: (tag: string) => void;
  onClose: () => void;
}) {
  const [newTag, setNewTag] = useState('');

  const handleAddTag = () => {
    const trimmed = newTag.trim();
    if (trimmed && contact && !contact.tags.includes(trimmed)) {
      onTagAdd(trimmed);
      setNewTag('');
    }
  };

  if (loading) {
    return (
      <div className="flex h-full flex-col">
        <div className="border-b border-gray-100 px-6 py-5 dark:border-white/[0.04]">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 animate-pulse rounded-full bg-gray-100 dark:bg-white/[0.04]" />
            <div className="flex-1 space-y-2">
              <div className="h-5 w-32 animate-pulse rounded-lg bg-gray-100 dark:bg-white/[0.04]" />
              <div className="h-3 w-48 animate-pulse rounded-md bg-gray-50 dark:bg-white/[0.02]" />
            </div>
          </div>
        </div>
        <div className="flex-1 space-y-4 p-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-12 animate-pulse rounded-xl bg-gray-50 dark:bg-white/[0.02]"
              style={{ animationDelay: `${i * 80}ms` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-8 text-center">
        <div
          className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl"
          style={{
            background: 'rgba(99,102,241,0.06)',
            border: '1px solid rgba(99,102,241,0.12)',
          }}
        >
          <Users className="h-8 w-8" style={{ color: '#6366F1' }} />
        </div>
        <h3 className={`${syne.className} mb-2 text-lg font-bold text-gray-900 dark:text-white`}>Select a contact</h3>
        <p className="text-[13px] leading-relaxed text-gray-500 dark:text-gray-400">
          Choose a contact from the list to view their details, score breakdown, and activity timeline.
        </p>
      </div>
    );
  }

  const channelCfg = getChannelConfig(contact.channel);
  const ChannelIcon = channelCfg.icon;
  const tempConfig = TEMP_CONFIG[contact.leadTemp];

  return (
    <motion.div {...slideIn} className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 border-b border-gray-100 px-6 py-5 dark:border-white/[0.04]">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <ContactAvatar name={contact.name} size="xl" />
            <div className="min-w-0">
              <h2 className={`${syne.className} truncate text-xl font-bold text-gray-900 dark:text-white`}>
                {contact.name || 'Unknown'}
              </h2>
              {contact.email && (
                <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-gray-500 dark:text-gray-400">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  {contact.email}
                </p>
              )}
              {contact.phone && (
                <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-gray-500 dark:text-gray-400">
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  {contact.phone}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 lg:hidden dark:text-gray-500 dark:hover:bg-white/[0.06] dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Quick info badges row */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <LeadScoreBadge temp={contact.leadTemp} score={contact.leadScore} size="md" />
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
            style={{
              background: `${channelCfg.color}10`,
              color: channelCfg.color,
              border: `1px solid ${channelCfg.color}20`,
            }}
          >
            <ChannelIcon className="h-3 w-3" />
            {channelCfg.label}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-500 dark:bg-white/[0.06] dark:text-gray-400">
            <MessageSquare className="h-3 w-3" />
            {contact.totalConversations} conversations
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-500 dark:bg-white/[0.06] dark:text-gray-400">
            <Clock className="h-3 w-3" />
            First seen {getTimeAgo(contact.firstSeenAt)}
          </span>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Score breakdown */}
        {contact.scoreBreakdown && contact.scoreBreakdown.length > 0 && (
          <div className="border-b border-gray-100 px-6 py-5 dark:border-white/[0.04]">
            <h3 className="mb-3 text-[11px] font-semibold tracking-widest text-gray-400 uppercase dark:text-gray-500">
              Score Breakdown
            </h3>
            <div className="space-y-2">
              {contact.scoreBreakdown.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-xl bg-gray-50 px-3.5 py-2.5 transition-colors hover:bg-gray-100/80 dark:bg-white/[0.02] dark:hover:bg-white/[0.04]"
                >
                  <span className="text-[12px] text-gray-600 dark:text-gray-400">{item.reason}</span>
                  <span
                    className="text-[12px] font-bold"
                    style={{ color: item.points > 0 ? tempConfig.color : '#6B7280' }}
                  >
                    {item.points > 0 ? '+' : ''}
                    {item.points}
                  </span>
                </div>
              ))}
              <div className="mt-1 flex items-center justify-between border-t border-gray-100 pt-2 dark:border-white/[0.04]">
                <span className="text-[12px] font-semibold text-gray-700 dark:text-gray-300">Total</span>
                <span className="text-[14px] font-bold" style={{ color: tempConfig.color }}>
                  {contact.leadScore}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Tags */}
        <div className="border-b border-gray-100 px-6 py-5 dark:border-white/[0.04]">
          <h3 className="mb-3 text-[11px] font-semibold tracking-widest text-gray-400 uppercase dark:text-gray-500">
            Tags
          </h3>
          <div className="flex flex-wrap gap-2">
            {contact.tags.map((tag) => (
              <span
                key={tag}
                className="group/tag inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-[11px] font-medium text-gray-600 transition-colors hover:bg-gray-200/80 dark:bg-white/[0.06] dark:text-gray-400 dark:hover:bg-white/[0.1]"
              >
                <Tag className="h-2.5 w-2.5" />
                {tag}
                <button
                  onClick={() => onTagRemove(tag)}
                  className="ml-0.5 rounded-full p-0.5 text-gray-400 opacity-0 transition-all group-hover/tag:opacity-100 hover:bg-gray-300 hover:text-gray-600 dark:hover:bg-white/[0.1] dark:hover:text-gray-200"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}
            {/* Add tag inline */}
            <div className="inline-flex items-center gap-1 rounded-full border border-dashed border-gray-300 bg-transparent px-2 py-1 dark:border-gray-600">
              <Plus className="h-2.5 w-2.5 text-gray-400" />
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddTag();
                }}
                placeholder="Add tag..."
                className="w-16 bg-transparent text-[11px] text-gray-600 placeholder:text-gray-400 focus:w-24 focus:outline-none dark:text-gray-400 dark:placeholder:text-gray-500"
              />
            </div>
          </div>
        </div>

        {/* Activity timeline */}
        <div className="px-6 py-5">
          <h3 className="mb-4 text-[11px] font-semibold tracking-widest text-gray-400 uppercase dark:text-gray-500">
            Activity Timeline
          </h3>
          {timeline.length === 0 ? (
            <p className="py-4 text-center text-[12px] text-gray-400 dark:text-gray-500">No activity recorded yet</p>
          ) : (
            <div className="relative space-y-0">
              {/* Vertical line */}
              <div className="absolute top-2 bottom-2 left-[11px] w-px bg-gray-200 dark:bg-white/[0.06]" />

              {timeline.map((event, i) => {
                const iconCfg = TIMELINE_ICONS[event.type] || TIMELINE_ICONS.message;
                const EventIcon = iconCfg.icon;
                return (
                  <motion.div
                    key={event.id || i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="group relative flex gap-3 py-2.5"
                  >
                    {/* Dot */}
                    <div
                      className="relative z-10 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2 border-white transition-transform group-hover:scale-110 dark:border-[#111118]"
                      style={{ background: `${iconCfg.color}15`, color: iconCfg.color }}
                    >
                      <EventIcon className="h-2.5 w-2.5" />
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1 pt-0.5">
                      <p className="text-[12px] leading-relaxed text-gray-600 dark:text-gray-400">
                        {event.description}
                      </p>
                      <p className="mt-0.5 text-[10px] text-gray-400 dark:text-gray-500">
                        {getTimeAgo(event.timestamp)}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════
   SKELETONS
   ═══════════════════════════════════════════════════ */
function SkeletonStats() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="animate-pulse rounded-2xl border border-gray-200/60 bg-white p-5 dark:border-white/[0.06] dark:bg-[#111118]"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="h-3 w-16 rounded-md bg-gray-100 dark:bg-white/[0.04]" />
              <div className="mt-3 h-9 w-14 rounded-lg bg-gray-100 dark:bg-white/[0.04]" />
            </div>
            <div className="h-11 w-11 rounded-xl bg-gray-100 dark:bg-white/[0.04]" />
          </div>
        </div>
      ))}
    </div>
  );
}

function SkeletonList() {
  return (
    <div className="space-y-0">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <div
          key={i}
          className="flex animate-pulse items-center gap-3 px-4 py-3"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-white/[0.04]" />
          <div className="flex-1 space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="h-3.5 w-28 rounded-md bg-gray-100 dark:bg-white/[0.04]" />
              <div className="h-4 w-8 rounded-full bg-gray-100 dark:bg-white/[0.04]" />
            </div>
            <div className="h-2.5 w-40 rounded-md bg-gray-50 dark:bg-white/[0.02]" />
            <div className="flex gap-2">
              <div className="h-3.5 w-12 rounded-full bg-gray-50 dark:bg-white/[0.02]" />
              <div className="h-3.5 w-10 rounded-full bg-gray-50 dark:bg-white/[0.02]" />
            </div>
          </div>
          <div className="h-3 w-10 rounded-md bg-gray-50 dark:bg-white/[0.02]" />
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   EMPTY STATE
   ═══════════════════════════════════════════════════ */
function EmptyContacts() {
  return (
    <motion.div {...fadeUp} className="flex flex-col items-center justify-center px-4 py-20 text-center">
      <div className="relative mb-6">
        <div
          className="absolute -inset-4 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(99,102,241,0.08), transparent 70%)',
            animation: 'contactsPulse 3s ease-in-out infinite',
          }}
        />
        <div
          className="relative flex h-16 w-16 items-center justify-center rounded-2xl"
          style={{
            background: 'rgba(99,102,241,0.06)',
            border: '1px solid rgba(99,102,241,0.12)',
            boxShadow: '0 0 24px rgba(99,102,241,0.08)',
          }}
        >
          <Users className="h-7 w-7" style={{ color: '#6366F1' }} />
        </div>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="absolute h-1 w-1 rounded-full bg-indigo-400/40"
            style={{
              top: `${15 + i * 30}%`,
              left: i === 1 ? '88%' : `${8 + i * 35}%`,
              animation: `contactsFloat ${2 + i * 0.5}s ease-in-out infinite`,
              animationDelay: `${i * 0.4}s`,
            }}
          />
        ))}
      </div>
      <h3 className={`${syne.className} mb-2 text-xl font-bold text-gray-900 dark:text-white`}>No contacts yet</h3>
      <p className="max-w-sm text-[13px] leading-relaxed text-gray-500 dark:text-gray-400">
        Contacts appear automatically when users interact with your widgets across any channel. Deploy a widget to start
        collecting leads.
      </p>
      <style jsx>{`
        @keyframes contactsPulse {
          0%,
          100% {
            transform: scale(1);
            opacity: 0.5;
          }
          50% {
            transform: scale(1.15);
            opacity: 0.8;
          }
        }
        @keyframes contactsFloat {
          0%,
          100% {
            transform: translateY(0) scale(1);
            opacity: 0.4;
          }
          50% {
            transform: translateY(-8px) scale(1.3);
            opacity: 0.8;
          }
        }
      `}</style>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════ */
export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [totalContacts, setTotalContacts] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [scoreFilter, setScoreFilter] = useState<string>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedContact, setSelectedContact] = useState<ContactDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);

  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const limit = 20;

  /* ── Fetch stats ── */
  useEffect(() => {
    setStatsLoading(true);
    fetch('/api/contacts/stats')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setStats(d.data);
      })
      .catch(() => {})
      .finally(() => setStatsLoading(false));
  }, []);

  /* ── Fetch contacts ── */
  const fetchContacts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (scoreFilter === 'hot') {
        params.set('minScore', '70');
      } else if (scoreFilter === 'warm') {
        params.set('minScore', '30');
        params.set('maxScore', '69');
      } else if (scoreFilter === 'cold') {
        params.set('maxScore', '29');
      }
      if (channelFilter !== 'all') params.set('channel', channelFilter);
      params.set('page', String(currentPage));
      params.set('limit', String(limit));

      const res = await fetch(`/api/contacts?${params}`);
      const data = await res.json();
      if (data.success && data.data) {
        setContacts(data.data.contacts ?? []);
        setTotalContacts(data.data.total ?? 0);
        setTotalPages(data.data.pages ?? 1);
      }
    } catch (err) {
      console.error('Failed to fetch contacts:', err);
    } finally {
      setLoading(false);
    }
  }, [search, scoreFilter, channelFilter, currentPage]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  /* ── Fetch contact detail ── */
  const fetchDetail = useCallback(async (contactId: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/contacts/${contactId}`);
      const data = await res.json();
      if (data.success && data.data) {
        setSelectedContact(data.data.contact ?? null);
        setTimeline(data.data.timeline ?? []);
      }
    } catch (err) {
      console.error('Failed to fetch contact detail:', err);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedId) {
      fetchDetail(selectedId);
    }
  }, [selectedId, fetchDetail]);

  /* ── Tag management ── */
  const updateTags = useCallback(
    async (newTags: string[]) => {
      if (!selectedId || !selectedContact) return;
      try {
        const res = await fetch(`/api/contacts/${selectedId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tags: newTags }),
        });
        const data = await res.json();
        if (data.success) {
          setSelectedContact((prev) => (prev ? { ...prev, tags: newTags } : prev));
          setContacts((prev) => prev.map((c) => (c.contactId === selectedId ? { ...c, tags: newTags } : c)));
        }
      } catch (err) {
        console.error('Failed to update tags:', err);
      }
    },
    [selectedId, selectedContact]
  );

  const handleTagAdd = useCallback(
    (tag: string) => {
      if (!selectedContact) return;
      const newTags = [...selectedContact.tags, tag];
      updateTags(newTags);
    },
    [selectedContact, updateTags]
  );

  const handleTagRemove = useCallback(
    (tag: string) => {
      if (!selectedContact) return;
      const newTags = selectedContact.tags.filter((t) => t !== tag);
      updateTags(newTags);
    },
    [selectedContact, updateTags]
  );

  /* ── Debounced search ── */
  const handleSearch = (value: string) => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setSearch(value);
      setCurrentPage(1);
    }, 300);
  };

  const handleScoreFilter = (value: string) => {
    setScoreFilter(value);
    setCurrentPage(1);
  };

  const handleChannelFilter = (value: string) => {
    setChannelFilter(value);
    setCurrentPage(1);
  };

  const selectBase =
    'h-10 px-3 bg-white border border-gray-200/60 rounded-xl text-[13px] text-gray-600 focus:outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-500/10 transition-all appearance-none cursor-pointer dark:bg-[#111118] dark:border-white/[0.06] dark:text-gray-400 dark:focus:border-violet-500/30';

  const isEmptyState = !loading && contacts.length === 0 && !search && scoreFilter === 'all' && channelFilter === 'all';

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <motion.div {...fadeUp} className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-[11px] font-semibold tracking-widest text-gray-400 uppercase dark:text-gray-500">
            CRM
          </p>
          <h1 className={`${syne.className} text-2xl font-bold text-gray-900 dark:text-white`}>Contacts</h1>
          {!statsLoading && stats && (
            <p className="mt-1.5 text-[13px] text-gray-500 dark:text-gray-400">
              {stats.total} total contact{stats.total !== 1 ? 's' : ''} across all channels
            </p>
          )}
        </div>
      </motion.div>

      {/* Stats */}
      {statsLoading ? (
        <SkeletonStats />
      ) : stats ? (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <StatCard
            label="Total Contacts"
            numericValue={stats.total}
            icon={<Users className="h-5 w-5" />}
            gradientIndex={0}
            loading={false}
          />
          <StatCard
            label="Hot Leads"
            numericValue={stats.hot}
            icon={<Flame className="h-5 w-5" />}
            gradientIndex={1}
            loading={false}
          />
          <StatCard
            label="Warm Leads"
            numericValue={stats.warm}
            icon={<Thermometer className="h-5 w-5" />}
            gradientIndex={2}
            loading={false}
          />
          <StatCard
            label="New Today"
            numericValue={stats.newToday}
            icon={<UserPlus className="h-5 w-5" />}
            gradientIndex={3}
            loading={false}
          />
        </motion.div>
      ) : null}

      {/* Empty state when no contacts at all */}
      {isEmptyState && <EmptyContacts />}

      {/* Main two-panel layout */}
      {!isEmptyState && (
        <motion.div
          {...fadeUp}
          className="overflow-hidden rounded-2xl border border-gray-200/60 bg-white dark:border-white/[0.06] dark:bg-[#111118]"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.02)', minHeight: '600px' }}
        >
          <div className="flex h-[calc(100vh-340px)] min-h-[600px]">
            {/* Left panel: contact list */}
            <div
              className={`flex shrink-0 flex-col border-r border-gray-100 dark:border-white/[0.04] ${
                selectedId ? 'hidden lg:flex' : 'flex'
              }`}
              style={{ width: '380px', maxWidth: '100%' }}
            >
              {/* Search & Filters */}
              <div className="shrink-0 space-y-3 border-b border-gray-100 px-4 py-3 dark:border-white/[0.04]">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search contacts..."
                    onChange={(e) => handleSearch(e.target.value)}
                    className="h-10 w-full rounded-xl border border-gray-200/60 bg-gray-50/50 pr-4 pl-10 text-[13px] text-gray-900 placeholder:text-gray-400 focus:border-violet-300 focus:bg-white focus:ring-2 focus:ring-violet-500/10 focus:outline-none dark:border-white/[0.06] dark:bg-white/[0.02] dark:text-white dark:placeholder:text-gray-500 dark:focus:border-violet-500/30 dark:focus:bg-white/[0.04]"
                  />
                </div>

                {/* Filter dropdowns */}
                <div className="flex gap-2">
                  <select
                    value={scoreFilter}
                    onChange={(e) => handleScoreFilter(e.target.value)}
                    className={`flex-1 ${selectBase}`}
                  >
                    <option value="all">All Scores</option>
                    <option value="hot">Hot</option>
                    <option value="warm">Warm</option>
                    <option value="cold">Cold</option>
                  </select>
                  <select
                    value={channelFilter}
                    onChange={(e) => handleChannelFilter(e.target.value)}
                    className={`flex-1 ${selectBase}`}
                  >
                    <option value="all">All Channels</option>
                    <option value="web">Web</option>
                    <option value="telegram">Telegram</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="instagram">Instagram</option>
                  </select>
                </div>
              </div>

              {/* Contact list */}
              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <SkeletonList />
                ) : contacts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
                    <Search className="mb-3 h-7 w-7 text-gray-300 dark:text-gray-600" />
                    <p className="text-[13px] font-medium text-gray-500 dark:text-gray-400">No contacts found</p>
                    <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
                      Try adjusting your search or filters
                    </p>
                  </div>
                ) : (
                  <motion.div variants={staggerContainer} initial="hidden" animate="show">
                    {contacts.map((contact) => (
                      <ContactListItem
                        key={contact.contactId}
                        contact={contact}
                        isSelected={selectedId === contact.contactId}
                        onClick={() => setSelectedId(contact.contactId)}
                      />
                    ))}
                  </motion.div>
                )}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="shrink-0 border-t border-gray-100 px-4 py-3 dark:border-white/[0.04]">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-gray-400 dark:text-gray-500">
                      {totalContacts} contact{totalContacts !== 1 ? 's' : ''}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage <= 1}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30 dark:text-gray-500 dark:hover:bg-white/[0.06]"
                      >
                        <svg
                          className="h-3.5 w-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <span className="px-2 text-[11px] font-medium text-gray-500 dark:text-gray-400">
                        {currentPage} / {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage >= totalPages}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30 dark:text-gray-500 dark:hover:bg-white/[0.06]"
                      >
                        <svg
                          className="h-3.5 w-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right panel: detail */}
            <div className={`flex-1 ${selectedId ? 'flex' : 'hidden lg:flex'} flex-col`}>
              {/* Mobile back button */}
              {selectedId && (
                <div className="flex shrink-0 items-center gap-2 border-b border-gray-100 px-4 py-2 lg:hidden dark:border-white/[0.04]">
                  <button
                    onClick={() => setSelectedId(null)}
                    className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[12px] font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/[0.06]"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to list
                  </button>
                </div>
              )}

              <AnimatePresence mode="wait">
                <DetailPanel
                  key={selectedId || 'empty'}
                  contact={selectedContact}
                  timeline={timeline}
                  loading={detailLoading}
                  onTagAdd={handleTagAdd}
                  onTagRemove={handleTagRemove}
                  onClose={() => setSelectedId(null)}
                />
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
