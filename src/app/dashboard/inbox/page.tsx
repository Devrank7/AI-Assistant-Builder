'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Syne } from 'next/font/google';
import {
  Search,
  Filter,
  Send,
  Bot,
  User,
  Headphones,
  CheckCircle,
  Sparkles,
  ArrowLeft,
  MoreVertical,
  Phone,
  Mail,
  Globe,
  MessageSquare,
  X,
  Loader2,
  RefreshCw,
  ChevronDown,
} from 'lucide-react';

/* ── Display font ── */
const syne = Syne({ subsets: ['latin'], weight: ['700', '800'], display: 'swap' });

/* ── Types ── */
interface Conversation {
  conversationId: string;
  contactId: string;
  contactName: string | null;
  contactEmail: string | null;
  channel: string;
  status: 'bot' | 'handoff' | 'assigned' | 'resolved' | 'closed';
  assignedTo: string | null;
  lastMessage: string | null;
  lastMessageAt: string;
  unreadCount: number;
  leadTemp: 'cold' | 'warm' | 'hot';
  createdAt: string;
}

interface Message {
  messageId: string;
  conversationId: string;
  sender: 'visitor' | 'bot' | 'operator';
  text: string;
  timestamp: string;
  meta?: Record<string, unknown>;
}

interface ConversationContact {
  contactId: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  channel: string;
  tags: string[];
  leadTemp: 'cold' | 'warm' | 'hot';
  leadScore: number;
  totalConversations: number;
  totalMessages: number;
  lastSeenAt: string;
  firstSeenAt: string;
}

/* ── Animations ── */
const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.04, delayChildren: 0.08 },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 12, scale: 0.97 },
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

const slideFromLeft = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0, transition: { type: 'spring' as const, stiffness: 200, damping: 24 } },
  exit: { opacity: 0, x: -20, transition: { duration: 0.15 } },
};

/* ── Helpers ── */
function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTimestamp(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
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
  instagram: { icon: MessageSquare, label: 'Instagram', color: '#E4405F' },
};

function getChannelConfig(channel: string) {
  return CHANNEL_CONFIG[channel?.toLowerCase()] || CHANNEL_CONFIG.web;
}

const STATUS_CONFIG: Record<string, { label: string; classes: string; icon: typeof Bot }> = {
  bot: { label: 'Bot', classes: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: Bot },
  handoff: {
    label: 'Handoff',
    classes: 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse',
    icon: Headphones,
  },
  assigned: { label: 'Assigned', classes: 'bg-purple-500/10 text-purple-400 border-purple-500/20', icon: User },
  resolved: { label: 'Resolved', classes: 'bg-green-500/10 text-green-400 border-green-500/20', icon: CheckCircle },
  closed: { label: 'Closed', classes: 'bg-gray-500/10 text-gray-400 border-gray-500/20', icon: CheckCircle },
};

function getStatusConfig(status: string) {
  return STATUS_CONFIG[status] || STATUS_CONFIG.bot;
}

const LEAD_TEMP_COLORS: Record<string, string> = {
  hot: 'bg-red-500',
  warm: 'bg-amber-500',
  cold: 'bg-gray-400',
};

type Tab = 'all' | 'unassigned' | 'mine' | 'resolved';
const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'unassigned', label: 'Unassigned' },
  { key: 'mine', label: 'Mine' },
  { key: 'resolved', label: 'Resolved' },
];

/* ── Skeleton Components ── */
function ConversationSkeleton() {
  return (
    <div className="flex animate-pulse items-center gap-3 px-4 py-3">
      <div className="h-10 w-10 rounded-full bg-white/5" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-3.5 w-28 rounded bg-white/5" />
        <div className="h-3 w-40 rounded bg-white/[0.03]" />
      </div>
      <div className="h-3 w-10 rounded bg-white/[0.03]" />
    </div>
  );
}

function MessageSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-4 p-6">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
          <div className={`space-y-1.5 ${i % 2 === 0 ? 'items-end' : 'items-start'} flex flex-col`}>
            <div className="h-3 w-16 rounded bg-white/5" />
            <div className={`h-14 rounded-2xl bg-white/5 ${i % 2 === 0 ? 'w-52' : 'w-64'}`} />
            <div className="h-2.5 w-12 rounded bg-white/[0.03]" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════
   INBOX PAGE
   ══════════════════════════════════════════════ */
export default function InboxPage() {
  /* ── State ── */
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const [channelFilter, setChannelFilter] = useState('all');
  const [showChannelDropdown, setShowChannelDropdown] = useState(false);

  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedContact, setSelectedContact] = useState<ConversationContact | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [suggestLoading, setSuggestLoading] = useState(false);

  const [showSidebar, setShowSidebar] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const channelDropdownRef = useRef<HTMLDivElement>(null);

  /* ── Data Fetching ── */
  const fetchConversations = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (tab === 'resolved') params.set('status', 'resolved');
      if (channelFilter !== 'all') params.set('channel', channelFilter);
      if (tab === 'mine') params.set('assignedTo', 'me');
      if (tab === 'unassigned') params.set('assignedTo', 'unassigned');
      if (search) params.set('search', search);
      const res = await fetch(`/api/inbox/conversations?${params}`);
      const data = await res.json();
      if (data.success) setConversations(data.data.conversations);
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    } finally {
      setLoading(false);
    }
  }, [tab, channelFilter, search]);

  const fetchDetail = useCallback(async (convId: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/inbox/conversations/${convId}`);
      const data = await res.json();
      if (data.success) {
        setMessages(data.data.messages);
        setSelectedContact(data.data.contact);
        setSelectedConversation(data.data.conversation);
      }
    } catch (err) {
      console.error('Failed to fetch conversation detail:', err);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const sendReply = async () => {
    if (!replyText.trim() || !selectedConversation || sending) return;
    setSending(true);
    try {
      await fetch(`/api/inbox/conversations/${selectedConversation.conversationId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: replyText }),
      });
      setReplyText('');
      setSuggestion(null);
      fetchDetail(selectedConversation.conversationId);
      fetchConversations();
    } catch (err) {
      console.error('Failed to send reply:', err);
    } finally {
      setSending(false);
    }
  };

  const fetchSuggestion = async () => {
    if (!selectedConversation) return;
    setSuggestLoading(true);
    setSuggestion(null);
    try {
      const res = await fetch('/api/inbox/suggest-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: selectedConversation.conversationId }),
      });
      const data = await res.json();
      if (data.success) setSuggestion(data.data.suggestion);
    } catch (err) {
      console.error('Failed to fetch suggestion:', err);
    } finally {
      setSuggestLoading(false);
    }
  };

  const handleAction = async (action: 'assign' | 'resolve' | 'back-to-bot') => {
    if (!selectedConversation) return;
    try {
      await fetch(`/api/inbox/conversations/${selectedConversation.conversationId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      fetchDetail(selectedConversation.conversationId);
      fetchConversations();
    } catch (err) {
      console.error('Action failed:', err);
    }
  };

  /* ── Effects ── */
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // SSE real-time updates
  useEffect(() => {
    const es = new EventSource('/api/inbox/stream');
    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        if (event.type === 'message:received' || event.type === 'message:sent') {
          fetchConversations();
          if (selectedConversation?.conversationId === event.payload?.conversationId) {
            fetchDetail(event.payload.conversationId);
          }
        }
        if (event.type === 'conversation:handoff') {
          fetchConversations();
        }
      } catch {
        /* ignore parse errors */
      }
    };
    es.onerror = () => {
      // Silently reconnect — EventSource handles this automatically
    };
    return () => es.close();
  }, [selectedConversation, fetchConversations, fetchDetail]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Close channel dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (channelDropdownRef.current && !channelDropdownRef.current.contains(e.target as Node)) {
        setShowChannelDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  /* ── Select conversation ── */
  const selectConversation = (conv: Conversation) => {
    setSelectedConversation(conv);
    setSuggestion(null);
    setReplyText('');
    fetchDetail(conv.conversationId);
  };

  /* ── Debounced search ── */
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = (val: string) => {
    setSearch(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => fetchConversations(), 300);
  };

  /* ══════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════ */
  return (
    <motion.div
      className="flex h-full flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      {/* ── Header ── */}
      <motion.div {...fadeUp} className="border-border flex items-center justify-between border-b px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 shadow-lg shadow-blue-500/20">
            <MessageSquare className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className={`text-text-primary text-xl font-extrabold tracking-tight ${syne.className}`}>Inbox</h1>
            <p className="text-text-secondary mt-0.5 text-xs">
              {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            fetchConversations();
            if (selectedConversation) fetchDetail(selectedConversation.conversationId);
          }}
          className="border-border text-text-secondary hover:text-text-primary flex items-center gap-2 rounded-lg border bg-white/5 px-3 py-1.5 text-sm transition-all hover:bg-white/10"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </motion.button>
      </motion.div>

      {/* ── Three-panel layout ── */}
      <div className="flex min-h-0 flex-1">
        {/* ═══════════════════════════════════════
           LEFT PANEL — Conversation List (320px)
           ═══════════════════════════════════════ */}
        <motion.div
          {...slideFromLeft}
          className="border-border bg-bg-primary/80 flex w-80 flex-shrink-0 flex-col border-r backdrop-blur-xl"
        >
          {/* Filter tabs */}
          <div className="flex items-center gap-1 px-3 pt-3 pb-2">
            {TABS.map((t) => (
              <motion.button
                key={t.key}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => setTab(t.key)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  tab === t.key
                    ? 'bg-accent shadow-accent/20 text-white shadow-lg'
                    : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                }`}
              >
                {t.label}
              </motion.button>
            ))}
          </div>

          {/* Search + channel filter */}
          <div className="flex items-center gap-2 px-3 pb-3">
            <div className="relative flex-1">
              <Search className="text-text-secondary absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search conversations..."
                className="border-border text-text-primary placeholder:text-text-secondary/50 focus:ring-accent/50 focus:border-accent/50 w-full rounded-lg border bg-white/5 py-2 pr-3 pl-8 text-xs transition-all focus:ring-1 focus:outline-none"
              />
              {search && (
                <button
                  onClick={() => {
                    setSearch('');
                    fetchConversations();
                  }}
                  className="text-text-secondary hover:text-text-primary absolute top-1/2 right-2 -translate-y-1/2"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            <div className="relative" ref={channelDropdownRef}>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowChannelDropdown(!showChannelDropdown)}
                className={`flex items-center gap-1 rounded-lg border px-2.5 py-2 text-xs transition-all ${
                  channelFilter !== 'all'
                    ? 'bg-accent/10 border-accent/30 text-accent'
                    : 'border-border text-text-secondary hover:text-text-primary bg-white/5'
                }`}
              >
                <Filter className="h-3.5 w-3.5" />
                <ChevronDown className="h-3 w-3" />
              </motion.button>
              <AnimatePresence>
                {showChannelDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="bg-bg-primary/95 border-border absolute top-full right-0 z-50 mt-1 w-36 overflow-hidden rounded-xl border shadow-xl backdrop-blur-xl"
                  >
                    {[
                      { key: 'all', label: 'All Channels' },
                      { key: 'web', label: 'Web' },
                      { key: 'telegram', label: 'Telegram' },
                      { key: 'whatsapp', label: 'WhatsApp' },
                      { key: 'instagram', label: 'Instagram' },
                    ].map((ch) => (
                      <button
                        key={ch.key}
                        onClick={() => {
                          setChannelFilter(ch.key);
                          setShowChannelDropdown(false);
                        }}
                        className={`w-full px-3 py-2 text-left text-xs transition-all ${
                          channelFilter === ch.key
                            ? 'bg-accent/10 text-accent'
                            : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                        }`}
                      >
                        {ch.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Conversation list */}
          <div className="scrollbar-thin flex-1 overflow-y-auto">
            {loading ? (
              <div className="space-y-0">
                {Array.from({ length: 8 }).map((_, i) => (
                  <ConversationSkeleton key={i} />
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5">
                  <MessageSquare className="text-text-secondary/40 h-7 w-7" />
                </div>
                <p className="text-text-secondary text-sm font-medium">No conversations</p>
                <p className="text-text-secondary/60 mt-1 text-xs">
                  Conversations will appear here when visitors start chatting
                </p>
              </div>
            ) : (
              <motion.div variants={staggerContainer} initial="hidden" animate="show">
                {conversations.map((conv) => {
                  const isSelected = selectedConversation?.conversationId === conv.conversationId;
                  const statusCfg = getStatusConfig(conv.status);
                  const channelCfg = getChannelConfig(conv.channel);
                  const ChannelIcon = channelCfg.icon;
                  const displayName = conv.contactName || 'Visitor';
                  const gradient = getAvatarGradient(displayName);

                  return (
                    <motion.button
                      key={conv.conversationId}
                      variants={staggerItem}
                      onClick={() => selectConversation(conv)}
                      className={`group relative flex w-full items-center gap-3 px-4 py-3 text-left transition-all ${
                        isSelected
                          ? 'bg-accent/10 border-l-accent border-l-2'
                          : 'border-l-2 border-l-transparent hover:bg-white/[0.03]'
                      }`}
                    >
                      {/* Unread indicator */}
                      {conv.unreadCount > 0 && (
                        <div className="bg-accent absolute top-1/2 left-1 h-1.5 w-1.5 -translate-y-1/2 rounded-full" />
                      )}

                      {/* Avatar */}
                      <div
                        className={`relative h-10 w-10 rounded-full bg-gradient-to-br ${gradient} flex flex-shrink-0 items-center justify-center shadow-lg`}
                      >
                        <span className="text-xs font-bold text-white">{getInitials(displayName)}</span>
                        {/* Lead temp dot */}
                        <div
                          className={`border-bg-primary absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 ${LEAD_TEMP_COLORS[conv.leadTemp] || 'bg-gray-400'}`}
                        />
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`truncate text-sm font-medium ${isSelected ? 'text-text-primary' : conv.unreadCount > 0 ? 'text-text-primary' : 'text-text-secondary'}`}
                          >
                            {displayName}
                          </span>
                          <span className="text-text-secondary/60 flex-shrink-0 text-[10px]">
                            {getTimeAgo(conv.lastMessageAt || conv.createdAt)}
                          </span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5">
                          <ChannelIcon className="h-3 w-3 flex-shrink-0" style={{ color: channelCfg.color }} />
                          <p
                            className={`flex-1 truncate text-xs ${conv.unreadCount > 0 ? 'text-text-secondary font-medium' : 'text-text-secondary/60'}`}
                          >
                            {conv.lastMessage || 'No messages yet'}
                          </p>
                        </div>
                        <div className="mt-1 flex items-center gap-1.5">
                          <span
                            className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${statusCfg.classes}`}
                          >
                            <statusCfg.icon className="h-2.5 w-2.5" />
                            {statusCfg.label}
                          </span>
                          {conv.unreadCount > 0 && (
                            <span className="bg-accent flex h-4.5 w-4.5 min-w-[18px] items-center justify-center rounded-full text-[10px] font-bold text-white">
                              {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* ═══════════════════════════════════════
           CENTER PANEL — Chat Thread
           ═══════════════════════════════════════ */}
        <div className="bg-bg-primary/40 flex min-w-0 flex-1 flex-col">
          {!selectedConversation ? (
            /* Empty state */
            <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 120, damping: 16 }}
                className="border-border mb-5 flex h-20 w-20 items-center justify-center rounded-3xl border bg-white/5"
              >
                <MessageSquare className="text-text-secondary/30 h-9 w-9" />
              </motion.div>
              <motion.h3
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className={`text-text-secondary text-lg font-bold ${syne.className}`}
              >
                Select a conversation
              </motion.h3>
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="text-text-secondary/60 mt-2 max-w-sm text-sm"
              >
                Choose a conversation from the list to view messages and respond to visitors
              </motion.p>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <motion.div
                {...fadeUp}
                className="border-border bg-bg-primary/60 flex items-center justify-between border-b px-5 py-3 backdrop-blur-xl"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`h-9 w-9 rounded-full bg-gradient-to-br ${getAvatarGradient(selectedConversation.contactName || 'Visitor')} flex items-center justify-center shadow-lg`}
                  >
                    <span className="text-xs font-bold text-white">
                      {getInitials(selectedConversation.contactName)}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-text-primary text-sm font-semibold">
                      {selectedConversation.contactName || 'Visitor'}
                    </h3>
                    <div className="mt-0.5 flex items-center gap-2">
                      {(() => {
                        const cfg = getStatusConfig(selectedConversation.status);
                        return (
                          <span
                            className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${cfg.classes}`}
                          >
                            <cfg.icon className="h-2.5 w-2.5" />
                            {cfg.label}
                          </span>
                        );
                      })()}
                      {(() => {
                        const ch = getChannelConfig(selectedConversation.channel);
                        const ChIcon = ch.icon;
                        return (
                          <span className="text-text-secondary inline-flex items-center gap-1 text-[10px]">
                            <ChIcon className="h-3 w-3" style={{ color: ch.color }} />
                            {ch.label}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Action buttons */}
                  {selectedConversation.status !== 'assigned' && selectedConversation.status !== 'resolved' && (
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleAction('assign')}
                      className="rounded-lg border border-purple-500/20 bg-purple-500/10 px-3 py-1.5 text-xs font-medium text-purple-400 transition-all hover:bg-purple-500/20"
                    >
                      Assign to me
                    </motion.button>
                  )}
                  {selectedConversation.status !== 'resolved' && (
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleAction('resolve')}
                      className="rounded-lg border border-green-500/20 bg-green-500/10 px-3 py-1.5 text-xs font-medium text-green-400 transition-all hover:bg-green-500/20"
                    >
                      Resolve
                    </motion.button>
                  )}
                  {selectedConversation.status === 'assigned' && (
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleAction('back-to-bot')}
                      className="rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-400 transition-all hover:bg-blue-500/20"
                    >
                      Back to Bot
                    </motion.button>
                  )}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowSidebar(!showSidebar)}
                    className="text-text-secondary hover:text-text-primary rounded-lg p-2 transition-all hover:bg-white/5"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </motion.button>
                </div>
              </motion.div>

              {/* Messages area */}
              <div className="scrollbar-thin flex-1 overflow-y-auto px-5 py-4">
                {detailLoading ? (
                  <MessageSkeleton />
                ) : messages.length === 0 ? (
                  <div className="text-text-secondary/50 flex h-full items-center justify-center text-sm">
                    No messages in this conversation
                  </div>
                ) : (
                  <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-3">
                    {messages.map((msg, idx) => {
                      const isVisitor = msg.sender === 'visitor';
                      const isBot = msg.sender === 'bot';
                      const isOperator = msg.sender === 'operator';
                      const showHandoffBanner = msg.meta?.type === 'handoff';

                      return (
                        <motion.div key={msg.messageId || idx} variants={staggerItem}>
                          {showHandoffBanner && (
                            <div className="mb-2 flex items-center justify-center gap-2 py-2">
                              <div className="h-px flex-1 bg-amber-500/20" />
                              <span className="flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-[10px] font-medium text-amber-400">
                                <Headphones className="h-3 w-3" />
                                Handed off to operator
                              </span>
                              <div className="h-px flex-1 bg-amber-500/20" />
                            </div>
                          )}
                          <div className={`flex ${isVisitor ? 'justify-start' : 'justify-end'}`}>
                            <div className={`max-w-[75%] ${isVisitor ? 'items-start' : 'items-end'} flex flex-col`}>
                              <span className="text-text-secondary/60 mb-1 flex items-center gap-1 px-1 text-[10px]">
                                {isBot && <Bot className="h-2.5 w-2.5 text-blue-400" />}
                                {isOperator && <User className="h-2.5 w-2.5 text-purple-400" />}
                                {isVisitor ? 'Visitor' : isBot ? 'Bot' : 'Operator'}
                              </span>
                              <div
                                className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                                  isVisitor
                                    ? 'border-border text-text-primary rounded-bl-md border bg-white/5'
                                    : isBot
                                      ? 'text-text-primary rounded-br-md border border-blue-500/20 bg-blue-500/10'
                                      : 'bg-accent/15 border-accent/25 text-text-primary rounded-br-md border'
                                }`}
                              >
                                {msg.text}
                              </div>
                              <span className="text-text-secondary/40 mt-0.5 px-1 text-[10px]">
                                {formatTimestamp(msg.timestamp)}
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </motion.div>
                )}
              </div>

              {/* AI Suggestion block */}
              <AnimatePresence>
                {suggestion && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: 8, height: 0 }}
                    className="mx-5 mb-2 overflow-hidden rounded-xl border border-violet-500/20 bg-gradient-to-r from-violet-500/10 to-blue-500/10"
                  >
                    <div className="px-4 py-3">
                      <div className="mb-2 flex items-center gap-2">
                        <Sparkles className="h-3.5 w-3.5 text-violet-400" />
                        <span className="text-xs font-medium text-violet-400">AI Suggested Reply</span>
                      </div>
                      <p className="text-text-primary/80 mb-3 text-sm leading-relaxed">{suggestion}</p>
                      <div className="flex items-center gap-2">
                        <motion.button
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => {
                            setReplyText(suggestion);
                            setSuggestion(null);
                            sendReply();
                          }}
                          className="bg-accent hover:bg-accent/80 rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-all"
                        >
                          Use as reply
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => {
                            setReplyText(suggestion);
                            setSuggestion(null);
                            inputRef.current?.focus();
                          }}
                          className="border-border text-text-secondary hover:text-text-primary rounded-lg border bg-white/5 px-3 py-1.5 text-xs font-medium transition-all hover:bg-white/10"
                        >
                          Edit
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => setSuggestion(null)}
                          className="text-text-secondary/60 hover:text-text-secondary rounded-lg px-3 py-1.5 text-xs transition-all"
                        >
                          Dismiss
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Input area */}
              <div className="border-border bg-bg-primary/60 border-t px-5 py-3 backdrop-blur-xl">
                <div className="flex items-center gap-2">
                  <motion.button
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={fetchSuggestion}
                    disabled={suggestLoading}
                    className="rounded-xl border border-violet-500/20 bg-violet-500/10 p-2.5 text-violet-400 transition-all hover:bg-violet-500/20 disabled:opacity-50"
                    title="AI Suggest Reply"
                  >
                    {suggestLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  </motion.button>
                  <input
                    ref={inputRef}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendReply();
                      }
                    }}
                    placeholder="Type a message..."
                    className="border-border text-text-primary placeholder:text-text-secondary/50 focus:ring-accent/50 focus:border-accent/50 flex-1 rounded-xl border bg-white/5 px-4 py-2.5 text-sm transition-all focus:ring-1 focus:outline-none"
                  />
                  <motion.button
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={sendReply}
                    disabled={!replyText.trim() || sending}
                    className="bg-accent hover:bg-accent/80 shadow-accent/20 rounded-xl p-2.5 text-white shadow-lg transition-all disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </motion.button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ═══════════════════════════════════════
           RIGHT PANEL — Contact Sidebar (300px, collapsible)
           ═══════════════════════════════════════ */}
        <AnimatePresence>
          {showSidebar && selectedConversation && selectedContact && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 300, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 24 }}
              className="border-border bg-bg-primary/80 flex-shrink-0 overflow-hidden border-l backdrop-blur-xl"
            >
              <div className="flex h-full w-[300px] flex-col">
                {/* Sidebar header */}
                <div className="border-border flex items-center justify-between border-b px-4 py-3">
                  <h4 className="text-text-primary text-sm font-semibold">Contact Info</h4>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setShowSidebar(false)}
                    className="text-text-secondary hover:text-text-primary rounded-md p-1 transition-all hover:bg-white/5"
                  >
                    <X className="h-4 w-4" />
                  </motion.button>
                </div>

                {/* Contact card */}
                <div className="scrollbar-thin flex-1 overflow-y-auto px-4 py-4">
                  <div className="mb-6 flex flex-col items-center text-center">
                    <div
                      className={`h-16 w-16 rounded-2xl bg-gradient-to-br ${getAvatarGradient(selectedContact.name || 'Visitor')} mb-3 flex items-center justify-center shadow-xl`}
                    >
                      <span className="text-xl font-bold text-white">{getInitials(selectedContact.name)}</span>
                    </div>
                    <h3 className="text-text-primary text-base font-semibold">{selectedContact.name || 'Visitor'}</h3>
                    {/* Lead temp badge */}
                    <div className="mt-1.5 flex items-center gap-1">
                      <div
                        className={`h-2 w-2 rounded-full ${LEAD_TEMP_COLORS[selectedContact.leadTemp] || 'bg-gray-400'}`}
                      />
                      <span className="text-text-secondary text-xs capitalize">{selectedContact.leadTemp} lead</span>
                      <span className="text-text-secondary/60 ml-1 text-xs">Score: {selectedContact.leadScore}</span>
                    </div>
                  </div>

                  {/* Contact details */}
                  <div className="space-y-3">
                    {selectedContact.email && (
                      <div className="border-border flex items-center gap-3 rounded-xl border bg-white/[0.03] p-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
                          <Mail className="h-4 w-4 text-blue-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-text-secondary/60 text-[10px] tracking-wider uppercase">Email</p>
                          <p className="text-text-primary truncate text-xs">{selectedContact.email}</p>
                        </div>
                      </div>
                    )}
                    {selectedContact.phone && (
                      <div className="border-border flex items-center gap-3 rounded-xl border bg-white/[0.03] p-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10">
                          <Phone className="h-4 w-4 text-green-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-text-secondary/60 text-[10px] tracking-wider uppercase">Phone</p>
                          <p className="text-text-primary truncate text-xs">{selectedContact.phone}</p>
                        </div>
                      </div>
                    )}
                    <div className="border-border flex items-center gap-3 rounded-xl border bg-white/[0.03] p-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10">
                        {(() => {
                          const ch = getChannelConfig(selectedContact.channel);
                          const ChIcon = ch.icon;
                          return <ChIcon className="h-4 w-4" style={{ color: ch.color }} />;
                        })()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-text-secondary/60 text-[10px] tracking-wider uppercase">Channel</p>
                        <p className="text-text-primary text-xs capitalize">{selectedContact.channel}</p>
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="mt-5 grid grid-cols-2 gap-2">
                    <div className="border-border rounded-xl border bg-white/[0.03] p-3 text-center">
                      <p className="text-text-primary text-lg font-bold">{selectedContact.totalConversations}</p>
                      <p className="text-text-secondary/60 mt-0.5 text-[10px]">Conversations</p>
                    </div>
                    <div className="border-border rounded-xl border bg-white/[0.03] p-3 text-center">
                      <p className="text-text-primary text-lg font-bold">{selectedContact.totalMessages}</p>
                      <p className="text-text-secondary/60 mt-0.5 text-[10px]">Messages</p>
                    </div>
                  </div>

                  {/* Tags */}
                  {selectedContact.tags && selectedContact.tags.length > 0 && (
                    <div className="mt-5">
                      <p className="text-text-secondary/60 mb-2 text-[10px] tracking-wider uppercase">Tags</p>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedContact.tags.map((tag) => (
                          <span
                            key={tag}
                            className="border-border text-text-secondary rounded-md border bg-white/5 px-2 py-1 text-[10px] font-medium"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Timestamps */}
                  <div className="mt-5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-text-secondary/60">First seen</span>
                      <span className="text-text-secondary">{getTimeAgo(selectedContact.firstSeenAt)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-text-secondary/60">Last seen</span>
                      <span className="text-text-secondary">{getTimeAgo(selectedContact.lastSeenAt)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
