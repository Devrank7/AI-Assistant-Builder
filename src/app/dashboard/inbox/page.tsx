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
  MoreVertical,
  Phone,
  Mail,
  Globe,
  MessageSquare,
  X,
  Loader2,
  RefreshCw,
  ChevronDown,
  Circle,
  ArrowLeft,
  Tag,
  Clock,
  TrendingUp,
  AlertCircle,
  RotateCcw,
  UserCheck,
} from 'lucide-react';

/* ── Display font ── */
const syne = Syne({ subsets: ['latin'], weight: ['700', '800'], display: 'swap' });

/* ── Types ── */
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

interface Conversation {
  conversationId: string;
  contactId: string;
  clientId: string;
  channel: string;
  status: 'bot' | 'handoff' | 'assigned' | 'resolved' | 'closed';
  assignedTo: string | null;
  lastMessage: { text: string; sender: string; timestamp: string } | null;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
  contact: ConversationContact | null;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface DetailData {
  conversation: Conversation;
  messages: ChatMessage[];
  contact: ConversationContact | null;
}

/* ── Animations ── */
const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.04, delayChildren: 0.06 },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 10, scale: 0.97 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 130, damping: 18 },
  },
};

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.25, 0.4, 0.25, 1] as const } },
};

const slideInRight = {
  initial: { opacity: 0, x: 32 },
  animate: { opacity: 1, x: 0, transition: { type: 'spring' as const, stiffness: 220, damping: 26 } },
  exit: { opacity: 0, x: 32, transition: { duration: 0.18 } },
};

const slideInLeft = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0, transition: { type: 'spring' as const, stiffness: 220, damping: 26 } },
  exit: { opacity: 0, x: -20, transition: { duration: 0.15 } },
};

/* ── Helpers ── */
function getTimeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return '–';
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

function formatTimestamp(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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

const CHANNEL_CONFIG: Record<string, { label: string; color: string; bgClass: string }> = {
  web: { label: 'Web', color: '#3B82F6', bgClass: 'bg-blue-500/10 text-blue-400' },
  telegram: { label: 'Telegram', color: '#0088CC', bgClass: 'bg-sky-500/10 text-sky-400' },
  whatsapp: { label: 'WhatsApp', color: '#25D366', bgClass: 'bg-green-500/10 text-green-400' },
  instagram: { label: 'Instagram', color: '#E4405F', bgClass: 'bg-rose-500/10 text-rose-400' },
};

function getChannelConfig(channel: string) {
  return CHANNEL_CONFIG[channel?.toLowerCase()] || CHANNEL_CONFIG.web;
}

/* Custom channel icon SVG components — avoids size/style conflicts with lucide */
function ChannelIcon({ channel, size = 12 }: { channel: string; size?: number }) {
  const ch = channel?.toLowerCase();
  const style = { width: size, height: size, flexShrink: 0 };
  if (ch === 'telegram') {
    return (
      <svg style={style} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248l-2.04 9.61c-.15.67-.54.835-1.09.52l-3-2.21-1.447 1.392c-.16.16-.295.295-.605.295l.214-3.053 5.55-5.015c.24-.214-.053-.333-.375-.12L6.29 14.78l-2.95-.92c-.64-.2-.655-.64.135-.948l11.53-4.445c.533-.193 1.002.13.557.78z" />
      </svg>
    );
  }
  if (ch === 'whatsapp') {
    return (
      <svg style={style} viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.116 1.528 5.845L0 24l6.335-1.511A11.933 11.933 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.783 9.783 0 01-4.988-1.361l-.357-.212-3.758.896.938-3.651-.233-.375A9.782 9.782 0 012.182 12C2.182 6.58 6.58 2.182 12 2.182S21.818 6.58 21.818 12 17.42 21.818 12 21.818z" />
      </svg>
    );
  }
  if (ch === 'instagram') {
    return (
      <svg style={style} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
      </svg>
    );
  }
  // web / default
  return (
    <svg
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

const STATUS_CONFIG: Record<string, { label: string; classes: string; dotColor: string; Icon: typeof Bot }> = {
  bot: {
    label: 'Bot',
    classes: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    dotColor: 'bg-blue-400',
    Icon: Bot,
  },
  handoff: {
    label: 'Needs Attention',
    classes: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    dotColor: 'bg-amber-400',
    Icon: Headphones,
  },
  assigned: {
    label: 'Assigned',
    classes: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    dotColor: 'bg-purple-400',
    Icon: UserCheck,
  },
  resolved: {
    label: 'Resolved',
    classes: 'bg-green-500/10 text-green-400 border-green-500/20',
    dotColor: 'bg-green-400',
    Icon: CheckCircle,
  },
  closed: {
    label: 'Closed',
    classes: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
    dotColor: 'bg-gray-500',
    Icon: Circle,
  },
};

function getStatusConfig(status: string) {
  return STATUS_CONFIG[status] || STATUS_CONFIG.bot;
}

const LEAD_TEMP_COLORS: Record<string, string> = {
  hot: 'bg-red-500',
  warm: 'bg-amber-500',
  cold: 'bg-slate-400',
};

const LEAD_TEMP_LABELS: Record<string, string> = {
  hot: 'Hot Lead',
  warm: 'Warm Lead',
  cold: 'Cold Lead',
};

type Tab = 'all' | 'unassigned' | 'mine' | 'handoff' | 'resolved';
const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'handoff', label: 'Handoff' },
  { key: 'unassigned', label: 'Unassigned' },
  { key: 'mine', label: 'Mine' },
  { key: 'resolved', label: 'Resolved' },
];

/* ── Skeleton Components ── */
function ConversationSkeleton() {
  return (
    <div className="flex animate-pulse items-center gap-3 px-4 py-3">
      <div className="h-10 w-10 flex-shrink-0 rounded-full bg-white/5" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-3.5 w-28 rounded bg-white/5" />
        <div className="h-3 w-40 rounded bg-white/[0.03]" />
        <div className="h-3 w-20 rounded bg-white/[0.03]" />
      </div>
      <div className="h-3 w-10 flex-shrink-0 rounded bg-white/[0.03]" />
    </div>
  );
}

function MessageSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-4 p-6">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
          <div className={`space-y-1.5 ${i % 2 === 0 ? 'items-end' : 'items-start'} flex flex-col`}>
            <div className="h-3 w-14 rounded bg-white/5" />
            <div className={`h-12 rounded-2xl bg-white/5 ${i % 2 === 0 ? 'w-52' : 'w-64'}`} />
            <div className="h-2.5 w-12 rounded bg-white/[0.03]" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Stats pill ── */
function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${color}`}>
      <span className="font-bold">{value}</span>
      <span className="opacity-70">{label}</span>
    </div>
  );
}

/* ══════════════════════════════════════════════
   INBOX PAGE
   ══════════════════════════════════════════════ */
export default function InboxPage() {
  /* ── State ── */
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [total, setTotal] = useState(0);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [channelFilter, setChannelFilter] = useState('all');
  const [showChannelDropdown, setShowChannelDropdown] = useState(false);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<DetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [suggestLoading, setSuggestLoading] = useState(false);

  const [showContactSidebar, setShowContactSidebar] = useState(true);
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');

  const [actionLoading, setActionLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const channelDropdownRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ── Computed from detailData ── */
  const selectedConversation = detailData?.conversation ?? null;
  const messages = detailData?.messages ?? [];
  const selectedContact = detailData?.contact ?? null;

  /* ── Data Fetching ── */
  const fetchConversations = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const params = new URLSearchParams();
        if (tab === 'resolved') params.set('status', 'resolved');
        else if (tab === 'handoff') params.set('status', 'handoff');
        if (channelFilter !== 'all') params.set('channel', channelFilter);
        if (tab === 'mine') params.set('assignedTo', 'me');
        if (tab === 'unassigned') params.set('assignedTo', 'unassigned');
        if (search) params.set('search', search);
        params.set('limit', '60');

        const res = await fetch(`/api/inbox/conversations?${params}`);
        if (res.status === 401) {
          // Auth race — retry once after short delay
          await new Promise((r) => setTimeout(r, 800));
          const retry = await fetch(`/api/inbox/conversations?${params}`);
          if (!retry.ok) return;
          const retryData = await retry.json();
          if (retryData.success) {
            const convs: Conversation[] = retryData.data?.conversations ?? [];
            setConversations(convs);
            setTotal(retryData.data?.total ?? convs.length);
            setUnreadTotal(convs.reduce((s, c) => s + (c.unreadCount || 0), 0));
          }
          return;
        }
        const data = await res.json();
        if (data.success) {
          const convs: Conversation[] = data.data?.conversations ?? [];
          setConversations(convs);
          setTotal(data.data?.total ?? convs.length);
          setUnreadTotal(convs.reduce((s, c) => s + (c.unreadCount || 0), 0));
        }
      } catch (err) {
        console.error('Failed to fetch conversations:', err);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [tab, channelFilter, search]
  );

  const fetchDetail = useCallback(
    async (convId: string, silent = false) => {
      if (!silent) setDetailLoading(true);
      setDetailError(null);
      try {
        const res = await fetch(`/api/inbox/conversations/${convId}`);
        if (res.status === 401) {
          await new Promise((r) => setTimeout(r, 800));
          const retry = await fetch(`/api/inbox/conversations/${convId}`);
          if (!retry.ok) {
            setDetailError('Authentication failed. Please refresh the page.');
            return;
          }
          const retryData = await retry.json();
          if (retryData.success && retryData.data) {
            setDetailData(retryData.data);
          }
          return;
        }
        const data = await res.json();
        if (data.success && data.data) {
          setDetailData(data.data);
          // Update unread count in conversation list
          setConversations((prev) => prev.map((c) => (c.conversationId === convId ? { ...c, unreadCount: 0 } : c)));
          setUnreadTotal((prev) => {
            const oldUnread = conversations.find((c) => c.conversationId === convId)?.unreadCount ?? 0;
            return Math.max(0, prev - oldUnread);
          });
        } else {
          setDetailError('Failed to load conversation.');
        }
      } catch (err) {
        console.error('Failed to fetch detail:', err);
        setDetailError('Network error. Please try again.');
      } finally {
        if (!silent) setDetailLoading(false);
      }
    },
    [conversations]
  );

  const sendReply = async () => {
    if (!replyText.trim() || !selectedId || sending) return;
    setSending(true);
    setSendError(null);
    try {
      const res = await fetch(`/api/inbox/conversations/${selectedId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: replyText }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setSendError(data.error || 'Failed to send reply');
        return;
      }
      setReplyText('');
      setSuggestion(null);
      // Refresh both lists
      fetchDetail(selectedId, true);
      fetchConversations(true);
    } catch (err) {
      console.error('Failed to send reply:', err);
      setSendError('Network error. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const fetchSuggestion = async () => {
    if (!selectedId) return;
    setSuggestLoading(true);
    setSuggestion(null);
    try {
      const res = await fetch('/api/inbox/suggest-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: selectedId }),
      });
      const data = await res.json();
      if (data.success) setSuggestion(data.data?.suggestion ?? null);
    } catch (err) {
      console.error('Failed to fetch suggestion:', err);
    } finally {
      setSuggestLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedId || actionLoading) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/inbox/conversations/${selectedId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        // Optimistic update
        setDetailData((prev) =>
          prev ? { ...prev, conversation: { ...prev.conversation, status: newStatus as Conversation['status'] } } : prev
        );
        setConversations((prev) =>
          prev.map((c) => (c.conversationId === selectedId ? { ...c, status: newStatus as Conversation['status'] } : c))
        );
        fetchConversations(true);
      }
    } catch (err) {
      console.error('Status change failed:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignToMe = async () => {
    if (!selectedId || actionLoading) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/inbox/conversations/${selectedId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'assigned' }),
      });
      const data = await res.json();
      if (data.success) {
        setDetailData((prev) =>
          prev ? { ...prev, conversation: { ...prev.conversation, status: 'assigned' } } : prev
        );
        setConversations((prev) =>
          prev.map((c) => (c.conversationId === selectedId ? { ...c, status: 'assigned' } : c))
        );
        fetchConversations(true);
      }
    } catch (err) {
      console.error('Assign failed:', err);
    } finally {
      setActionLoading(false);
    }
  };

  /* ── Effects ── */
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // SSE real-time updates with polling fallback
  useEffect(() => {
    let es: EventSource | null = null;
    let sseWorking = false;

    try {
      es = new EventSource('/api/inbox/stream');
      es.onopen = () => {
        sseWorking = true;
        // Clear polling if SSE connects
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      };
      es.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data);
          if (
            event.type === 'message:received' ||
            event.type === 'message:sent' ||
            event.type === 'conversation:updated'
          ) {
            fetchConversations(true);
            if (selectedId && selectedId === event.payload?.conversationId) {
              fetchDetail(selectedId, true);
            }
          }
          if (event.type === 'conversation:handoff') {
            fetchConversations(true);
          }
        } catch {
          /* ignore parse errors */
        }
      };
      es.onerror = () => {
        if (!sseWorking) {
          // SSE failed — fall back to polling
          if (!pollRef.current) {
            pollRef.current = setInterval(() => {
              fetchConversations(true);
              if (selectedId) fetchDetail(selectedId, true);
            }, 10000);
          }
        }
      };
    } catch {
      // SSE not available — use polling
      pollRef.current = setInterval(() => {
        fetchConversations(true);
        if (selectedId) fetchDetail(selectedId, true);
      }, 10000);
    }

    // Refresh on tab focus
    const handleFocus = () => {
      fetchConversations(true);
      if (selectedId) fetchDetail(selectedId, true);
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      es?.close();
      if (pollRef.current) clearInterval(pollRef.current);
      window.removeEventListener('focus', handleFocus);
    };
  }, [selectedId, fetchConversations, fetchDetail]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
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

  /* ── Debounced search ── */
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = (val: string) => {
    setSearchInput(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => setSearch(val), 350);
  };

  /* ── Select conversation ── */
  const selectConversation = (conv: Conversation) => {
    setSelectedId(conv.conversationId);
    setDetailData(null);
    setSuggestion(null);
    setReplyText('');
    setSendError(null);
    setDetailError(null);
    fetchDetail(conv.conversationId);
    setMobileView('chat');
  };

  /* ── Render helpers ── */
  const getLastMessageText = (conv: Conversation): string => {
    if (!conv.lastMessage) return 'No messages yet';
    return conv.lastMessage.text || 'No messages yet';
  };

  const getLastMessageTime = (conv: Conversation): string => {
    if (conv.lastMessage?.timestamp) return getTimeAgo(conv.lastMessage.timestamp);
    return getTimeAgo(conv.updatedAt || conv.createdAt);
  };

  const displayName = (conv: Conversation) => conv.contact?.name || 'Visitor';

  /* ══════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════ */

  /* ── Left panel: conversation list ── */
  const ConversationList = (
    <motion.div
      {...slideInLeft}
      className={`border-border bg-bg-primary/80 flex w-80 flex-shrink-0 flex-col border-r backdrop-blur-xl ${mobileView === 'list' ? 'flex' : 'hidden md:flex'} w-full md:w-80`}
    >
      {/* Filter tabs */}
      <div className="scrollbar-thin flex items-center gap-1 overflow-x-auto px-3 pt-3 pb-2">
        {TABS.map((t) => (
          <motion.button
            key={t.key}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setTab(t.key)}
            className={`flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              tab === t.key
                ? 'bg-accent shadow-accent/20 text-white shadow-md'
                : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
            }`}
          >
            {t.label}
            {t.key === 'all' && unreadTotal > 0 && (
              <span className="bg-accent/80 ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white">
                {unreadTotal > 99 ? '99+' : unreadTotal}
              </span>
            )}
            {t.key === 'handoff' && conversations.filter((c) => c.status === 'handoff').length > 0 && (
              <span className="ml-1.5 rounded-full bg-amber-500/80 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {conversations.filter((c) => c.status === 'handoff').length}
              </span>
            )}
          </motion.button>
        ))}
      </div>

      {/* Search + channel filter */}
      <div className="flex items-center gap-2 px-3 pb-3">
        <div className="relative flex-1">
          <Search className="text-text-secondary pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2" />
          <input
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search conversations..."
            className="border-border text-text-primary placeholder:text-text-secondary/50 focus:ring-accent/50 focus:border-accent/50 w-full rounded-lg border bg-white/5 py-2 pr-3 pl-8 text-xs transition-all focus:ring-1 focus:outline-none"
          />
          {searchInput && (
            <button
              onClick={() => {
                setSearchInput('');
                setSearch('');
              }}
              className="text-text-secondary hover:text-text-primary absolute top-1/2 right-2 -translate-y-1/2"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Channel filter dropdown */}
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
            title="Filter by channel"
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
                className="bg-bg-primary/98 border-border absolute top-full right-0 z-50 mt-1 w-40 overflow-hidden rounded-xl border shadow-2xl backdrop-blur-2xl"
              >
                {[
                  { key: 'all', label: 'All Channels' },
                  { key: 'web', label: 'Web Chat' },
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
                    className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-xs transition-all ${
                      channelFilter === ch.key
                        ? 'bg-accent/10 text-accent'
                        : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                    }`}
                  >
                    {ch.key !== 'all' && (
                      <span style={{ color: getChannelConfig(ch.key).color }}>
                        <ChannelIcon channel={ch.key} size={12} />
                      </span>
                    )}
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
            {Array.from({ length: 9 }).map((_, i) => (
              <ConversationSkeleton key={i} />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex h-full flex-col items-center justify-center px-6 py-20 text-center"
          >
            <div className="bg-bg-tertiary/50 mb-4 flex h-16 w-16 items-center justify-center rounded-2xl">
              <Mail className="text-text-tertiary h-7 w-7" />
            </div>
            <h3 className="text-text-primary mb-1.5 text-base font-semibold">No conversations</h3>
            <p className="text-text-secondary/60 max-w-[200px] text-xs leading-relaxed">
              {search ? 'No results for your search' : 'Your inbox populates when visitors chat with your widgets'}
            </p>
          </motion.div>
        ) : (
          <motion.div variants={staggerContainer} initial="hidden" animate="show">
            {conversations.map((conv) => {
              const isSelected = selectedId === conv.conversationId;
              const statusCfg = getStatusConfig(conv.status);
              const channelCfg = getChannelConfig(conv.channel);
              const name = displayName(conv);
              const gradient = getAvatarGradient(name);
              const leadTemp = conv.contact?.leadTemp || 'cold';

              return (
                <motion.button
                  key={conv.conversationId}
                  variants={staggerItem}
                  onClick={() => selectConversation(conv)}
                  className={`group relative flex w-full items-start gap-3 px-4 py-3.5 text-left transition-all ${
                    isSelected
                      ? 'bg-accent/8 border-l-accent border-l-2'
                      : 'border-l-2 border-l-transparent hover:bg-white/[0.035]'
                  }`}
                >
                  {/* Unread indicator dot */}
                  {conv.unreadCount > 0 && !isSelected && (
                    <div className="bg-accent absolute top-1/2 left-0.5 h-1.5 w-1.5 -translate-y-1/2 rounded-full" />
                  )}

                  {/* Avatar */}
                  <div
                    className={`relative h-10 w-10 rounded-full bg-gradient-to-br ${gradient} flex flex-shrink-0 items-center justify-center shadow-lg shadow-black/20`}
                  >
                    <span className="text-xs font-bold text-white">{getInitials(name)}</span>
                    {/* Lead temp dot */}
                    <div
                      className={`border-bg-primary absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 ${LEAD_TEMP_COLORS[leadTemp] || 'bg-slate-400'}`}
                      title={LEAD_TEMP_LABELS[leadTemp]}
                    />
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`truncate text-sm font-medium ${
                          isSelected
                            ? 'text-text-primary'
                            : conv.unreadCount > 0
                              ? 'text-text-primary font-semibold'
                              : 'text-text-secondary'
                        }`}
                      >
                        {name}
                      </span>
                      <span className="text-text-secondary/50 flex-shrink-0 text-[10px]">
                        {getLastMessageTime(conv)}
                      </span>
                    </div>

                    <div className="mt-0.5 flex items-center gap-1.5">
                      <span style={{ color: channelCfg.color }}>
                        <ChannelIcon channel={conv.channel} size={11} />
                      </span>
                      <p
                        className={`flex-1 truncate text-xs ${
                          conv.unreadCount > 0 ? 'text-text-secondary font-medium' : 'text-text-secondary/50'
                        }`}
                      >
                        {getLastMessageText(conv)}
                      </p>
                    </div>

                    <div className="mt-1.5 flex items-center justify-between gap-1.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${statusCfg.classes}`}
                      >
                        <statusCfg.Icon className="h-2.5 w-2.5" />
                        {statusCfg.label}
                      </span>
                      {conv.unreadCount > 0 && (
                        <span className="bg-accent flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white">
                          {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
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

      {/* Footer count */}
      {!loading && conversations.length > 0 && (
        <div className="border-border border-t px-4 py-2.5">
          <p className="text-text-secondary/50 text-[11px]">
            {conversations.length} of {total} conversation{total !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </motion.div>
  );

  /* ── Center + right panels ── */
  const ChatPanel = (
    <div
      className={`bg-bg-primary/40 flex min-w-0 flex-1 flex-col ${mobileView === 'chat' ? 'flex' : 'hidden md:flex'}`}
    >
      {!selectedId ? (
        /* Empty state */
        <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.88 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 120, damping: 18 }}
            className="border-border mb-5 flex h-20 w-20 items-center justify-center rounded-3xl border bg-white/[0.04]"
          >
            <MessageSquare className="text-text-secondary/25 h-9 w-9" />
          </motion.div>
          <motion.h3
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`text-text-secondary text-xl font-bold ${syne.className}`}
          >
            Select a conversation
          </motion.h3>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="text-text-secondary/50 mt-2 max-w-xs text-sm leading-relaxed"
          >
            Choose a conversation from the list to view messages and respond to visitors
          </motion.p>
          {unreadTotal > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="mt-6"
            >
              <StatPill label="unread" value={unreadTotal} color="bg-accent/10 border-accent/20 text-accent" />
            </motion.div>
          )}
        </div>
      ) : (
        <>
          {/* ── Chat header ── */}
          <motion.div
            {...fadeUp}
            className="border-border bg-bg-primary/60 flex items-center justify-between gap-3 border-b px-5 py-3 backdrop-blur-xl"
          >
            <div className="flex min-w-0 items-center gap-3">
              {/* Mobile back button */}
              <button
                onClick={() => {
                  setMobileView('list');
                  setSelectedId(null);
                  setDetailData(null);
                }}
                className="text-text-secondary hover:text-text-primary mr-1 flex-shrink-0 rounded-lg p-1.5 transition-all hover:bg-white/5 md:hidden"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>

              {selectedConversation ? (
                <>
                  <div
                    className={`h-9 w-9 rounded-full bg-gradient-to-br ${getAvatarGradient(selectedConversation.contact?.name || 'Visitor')} flex flex-shrink-0 items-center justify-center shadow-lg`}
                  >
                    <span className="text-xs font-bold text-white">
                      {getInitials(selectedConversation.contact?.name ?? null)}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-text-primary truncate text-sm font-semibold">
                      {selectedConversation.contact?.name || 'Visitor'}
                    </h3>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2">
                      {(() => {
                        const cfg = getStatusConfig(selectedConversation.status);
                        return (
                          <span
                            className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${cfg.classes}`}
                          >
                            <cfg.Icon className="h-2.5 w-2.5" />
                            {cfg.label}
                          </span>
                        );
                      })()}
                      <span
                        className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${getChannelConfig(selectedConversation.channel).bgClass} border-white/10`}
                      >
                        <ChannelIcon channel={selectedConversation.channel} size={10} />
                        {getChannelConfig(selectedConversation.channel).label}
                      </span>
                      {selectedContact?.email && (
                        <span className="text-text-secondary/50 hidden items-center gap-1 text-[10px] sm:inline-flex">
                          <Mail className="h-3 w-3" />
                          {selectedContact.email}
                        </span>
                      )}
                    </div>
                  </div>
                </>
              ) : detailLoading ? (
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 animate-pulse rounded-full bg-white/5" />
                  <div className="space-y-1.5">
                    <div className="h-3.5 w-24 animate-pulse rounded bg-white/5" />
                    <div className="h-3 w-32 animate-pulse rounded bg-white/[0.03]" />
                  </div>
                </div>
              ) : null}
            </div>

            {/* Header actions */}
            <div className="flex flex-shrink-0 items-center gap-2">
              {selectedConversation && (
                <>
                  {actionLoading ? (
                    <Loader2 className="text-text-secondary/50 h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      {selectedConversation.status !== 'assigned' &&
                        selectedConversation.status !== 'resolved' &&
                        selectedConversation.status !== 'closed' && (
                          <motion.button
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={handleAssignToMe}
                            className="hidden rounded-lg border border-purple-500/20 bg-purple-500/10 px-3 py-1.5 text-xs font-medium text-purple-400 transition-all hover:bg-purple-500/20 sm:block"
                          >
                            Assign to me
                          </motion.button>
                        )}
                      {selectedConversation.status !== 'resolved' && selectedConversation.status !== 'closed' && (
                        <motion.button
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => handleStatusChange('resolved')}
                          className="hidden rounded-lg border border-green-500/20 bg-green-500/10 px-3 py-1.5 text-xs font-medium text-green-400 transition-all hover:bg-green-500/20 sm:block"
                        >
                          Resolve
                        </motion.button>
                      )}
                      {selectedConversation.status === 'resolved' && (
                        <motion.button
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => handleStatusChange('bot')}
                          className="hidden rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-400 transition-all hover:bg-blue-500/20 sm:block"
                        >
                          Reopen
                        </motion.button>
                      )}
                      {selectedConversation.status !== 'closed' && (
                        <motion.button
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => handleStatusChange('closed')}
                          className="hidden rounded-lg border border-gray-500/20 bg-gray-500/10 px-3 py-1.5 text-xs font-medium text-gray-400 transition-all hover:bg-gray-500/20 sm:block"
                        >
                          Close
                        </motion.button>
                      )}
                      {selectedConversation.status === 'closed' && (
                        <motion.button
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => handleStatusChange('bot')}
                          className="hidden rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-400 transition-all hover:bg-blue-500/20 sm:block"
                        >
                          Reopen
                        </motion.button>
                      )}
                    </>
                  )}
                </>
              )}
              <motion.button
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.94 }}
                onClick={() => setShowContactSidebar(!showContactSidebar)}
                className={`rounded-lg p-2 transition-all ${
                  showContactSidebar
                    ? 'bg-accent/15 text-accent'
                    : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                }`}
                title="Toggle contact info"
              >
                <MoreVertical className="h-4 w-4" />
              </motion.button>
            </div>
          </motion.div>

          {/* ── Mobile action bar ── */}
          {selectedConversation && (
            <div className="border-border flex items-center gap-2 overflow-x-auto border-b px-4 py-2 sm:hidden">
              {selectedConversation.status !== 'assigned' &&
                selectedConversation.status !== 'resolved' &&
                selectedConversation.status !== 'closed' && (
                  <button
                    onClick={handleAssignToMe}
                    disabled={actionLoading}
                    className="flex-shrink-0 rounded-lg border border-purple-500/20 bg-purple-500/10 px-3 py-1.5 text-[11px] font-medium text-purple-400 transition-all hover:bg-purple-500/20 disabled:opacity-50"
                  >
                    Assign to me
                  </button>
                )}
              {selectedConversation.status !== 'resolved' && selectedConversation.status !== 'closed' && (
                <button
                  onClick={() => handleStatusChange('resolved')}
                  disabled={actionLoading}
                  className="flex-shrink-0 rounded-lg border border-green-500/20 bg-green-500/10 px-3 py-1.5 text-[11px] font-medium text-green-400 transition-all hover:bg-green-500/20 disabled:opacity-50"
                >
                  Resolve
                </button>
              )}
              {(selectedConversation.status === 'resolved' || selectedConversation.status === 'closed') && (
                <button
                  onClick={() => handleStatusChange('bot')}
                  disabled={actionLoading}
                  className="flex-shrink-0 rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-[11px] font-medium text-blue-400 transition-all hover:bg-blue-500/20 disabled:opacity-50"
                >
                  Reopen
                </button>
              )}
              {selectedConversation.status !== 'closed' && (
                <button
                  onClick={() => handleStatusChange('closed')}
                  disabled={actionLoading}
                  className="flex-shrink-0 rounded-lg border border-gray-500/20 bg-gray-500/10 px-3 py-1.5 text-[11px] font-medium text-gray-400 transition-all hover:bg-gray-500/20 disabled:opacity-50"
                >
                  Close
                </button>
              )}
            </div>
          )}

          {/* ── Messages area ── */}
          <div className="scrollbar-thin flex-1 overflow-y-auto">
            {detailLoading ? (
              <MessageSkeleton />
            ) : detailError ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
                <AlertCircle className="h-8 w-8 text-red-400/60" />
                <p className="text-text-secondary text-sm">{detailError}</p>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => selectedId && fetchDetail(selectedId)}
                  className="border-border text-text-secondary hover:text-text-primary flex items-center gap-2 rounded-lg border bg-white/5 px-4 py-2 text-xs transition-all hover:bg-white/10"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Retry
                </motion.button>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-text-secondary/40 flex h-full items-center justify-center text-sm">
                No messages in this conversation
              </div>
            ) : (
              <div className="px-5 py-4">
                <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-3">
                  {messages.map((msg, idx) => {
                    const isUser = msg.role === 'user';
                    const isBot = msg.role === 'assistant';

                    // Date separator logic
                    const currDate = new Date(msg.timestamp).toDateString();
                    const prevDate = idx > 0 ? new Date(messages[idx - 1].timestamp).toDateString() : null;
                    const showDateSep = idx === 0 || currDate !== prevDate;

                    return (
                      <motion.div key={`${msg.timestamp}-${idx}`} variants={staggerItem}>
                        {/* Date separator */}
                        {showDateSep && (
                          <div className="my-4 flex items-center gap-3">
                            <div className="h-px flex-1 bg-white/[0.06]" />
                            <span className="text-text-secondary/40 rounded-full border border-white/[0.06] bg-white/[0.03] px-2.5 py-0.5 text-[10px]">
                              {formatDate(msg.timestamp)}
                            </span>
                            <div className="h-px flex-1 bg-white/[0.06]" />
                          </div>
                        )}

                        <div className={`flex ${isUser ? 'justify-start' : 'justify-end'}`}>
                          <div className={`max-w-[78%] ${isUser ? 'items-start' : 'items-end'} flex flex-col`}>
                            <span className="text-text-secondary/50 mb-1 flex items-center gap-1 px-1 text-[10px]">
                              {isBot && <Bot className="h-2.5 w-2.5 text-blue-400" />}
                              {isUser && <User className="h-2.5 w-2.5 text-slate-400" />}
                              {isUser ? 'Visitor' : 'AI Assistant'}
                            </span>
                            <div
                              className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed break-words whitespace-pre-wrap ${
                                isUser
                                  ? 'border-border text-text-primary rounded-bl-md border bg-white/[0.06]'
                                  : 'text-text-primary rounded-br-md border border-blue-500/20 bg-blue-500/10'
                              }`}
                            >
                              {msg.content}
                            </div>
                            <span className="text-text-secondary/35 mt-0.5 px-1 text-[10px]">
                              {formatTimestamp(msg.timestamp)}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </motion.div>
              </div>
            )}
          </div>

          {/* ── AI Suggestion block ── */}
          <AnimatePresence>
            {suggestion && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mx-5 mb-2 overflow-hidden rounded-xl border border-violet-500/20 bg-gradient-to-r from-violet-500/8 to-blue-500/8"
              >
                <div className="px-4 py-3">
                  <div className="mb-2 flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-violet-400" />
                    <span className="text-xs font-semibold text-violet-400">AI Suggested Reply</span>
                  </div>
                  <p className="text-text-primary/75 mb-3 text-sm leading-relaxed">{suggestion}</p>
                  <div className="flex items-center gap-2">
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        setReplyText(suggestion);
                        setSuggestion(null);
                        inputRef.current?.focus();
                      }}
                      className="bg-accent hover:bg-accent/80 rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-all"
                    >
                      Use as reply
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        setReplyText((prev) => prev + (prev ? '\n' : '') + suggestion);
                        setSuggestion(null);
                        inputRef.current?.focus();
                      }}
                      className="border-border text-text-secondary hover:text-text-primary rounded-lg border bg-white/5 px-3 py-1.5 text-xs font-medium transition-all hover:bg-white/10"
                    >
                      Append & Edit
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setSuggestion(null)}
                      className="text-text-secondary/50 hover:text-text-secondary rounded-lg px-2 py-1.5 text-xs transition-all"
                    >
                      Dismiss
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Input area ── */}
          <div className="border-border bg-bg-primary/60 border-t px-4 py-3 backdrop-blur-xl">
            {sendError && (
              <div className="mb-2 flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                {sendError}
                <button onClick={() => setSendError(null)} className="ml-auto transition-colors hover:text-red-300">
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            <div className="flex items-end gap-2">
              {/* AI suggest button */}
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                onClick={fetchSuggestion}
                disabled={suggestLoading || !selectedId}
                className="mb-0.5 flex-shrink-0 rounded-xl border border-violet-500/20 bg-violet-500/10 p-2.5 text-violet-400 transition-all hover:bg-violet-500/20 disabled:opacity-40"
                title="Generate AI reply suggestion"
              >
                {suggestLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              </motion.button>

              {/* Textarea */}
              <textarea
                ref={inputRef}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendReply();
                  }
                }}
                placeholder="Type a reply… (Enter to send, Shift+Enter for new line)"
                rows={1}
                style={{ resize: 'none' }}
                className="border-border text-text-primary placeholder:text-text-secondary/40 focus:ring-accent/40 focus:border-accent/40 max-h-28 flex-1 overflow-y-auto rounded-xl border bg-white/[0.06] px-4 py-2.5 text-sm leading-relaxed transition-all focus:ring-1 focus:outline-none"
              />

              {/* Send button */}
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                onClick={sendReply}
                disabled={!replyText.trim() || sending || !selectedId}
                className="bg-accent hover:bg-accent/80 shadow-accent/20 mb-0.5 flex-shrink-0 rounded-xl p-2.5 text-white shadow-lg transition-all disabled:cursor-not-allowed disabled:opacity-30"
                title="Send reply"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </motion.button>
            </div>
          </div>
        </>
      )}
    </div>
  );

  /* ── Right sidebar: contact info ── */
  const ContactSidebar = (
    <AnimatePresence>
      {showContactSidebar && selectedConversation && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 288, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 28 }}
          className="border-border bg-bg-primary/80 flex-shrink-0 overflow-hidden border-l backdrop-blur-xl"
        >
          <div className="flex h-full w-72 flex-col">
            {/* Sidebar header */}
            <div className="border-border flex items-center justify-between border-b px-4 py-3">
              <h4 className="text-text-primary text-sm font-semibold">Contact Info</h4>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowContactSidebar(false)}
                className="text-text-secondary hover:text-text-primary rounded-md p-1 transition-all hover:bg-white/5"
              >
                <X className="h-4 w-4" />
              </motion.button>
            </div>

            <div className="scrollbar-thin flex-1 space-y-5 overflow-y-auto px-4 py-4">
              {selectedContact ? (
                <>
                  {/* Avatar + name */}
                  <div className="flex flex-col items-center text-center">
                    <div
                      className={`h-16 w-16 rounded-2xl bg-gradient-to-br ${getAvatarGradient(selectedContact.name || 'Visitor')} mb-3 flex items-center justify-center shadow-xl`}
                    >
                      <span className="text-xl font-bold text-white">{getInitials(selectedContact.name)}</span>
                    </div>
                    <h3 className="text-text-primary text-sm font-semibold">
                      {selectedContact.name || 'Anonymous Visitor'}
                    </h3>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <div
                        className={`h-2 w-2 rounded-full ${LEAD_TEMP_COLORS[selectedContact.leadTemp] || 'bg-slate-400'}`}
                      />
                      <span className="text-text-secondary text-xs capitalize">
                        {LEAD_TEMP_LABELS[selectedContact.leadTemp] || 'Cold Lead'}
                      </span>
                    </div>
                  </div>

                  {/* Lead score */}
                  <div className="border-border rounded-xl border bg-white/[0.03] p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-text-secondary/60 flex items-center gap-1.5 text-[10px] tracking-wider uppercase">
                        <TrendingUp className="h-3 w-3" />
                        Lead Score
                      </span>
                      <span className="text-text-primary text-sm font-bold">{selectedContact.leadScore}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-white/[0.06]">
                      <div
                        className={`h-1.5 rounded-full transition-all ${
                          selectedContact.leadScore >= 70
                            ? 'bg-red-500'
                            : selectedContact.leadScore >= 40
                              ? 'bg-amber-500'
                              : 'bg-slate-500'
                        }`}
                        style={{ width: `${Math.min(100, selectedContact.leadScore)}%` }}
                      />
                    </div>
                  </div>

                  {/* Contact details */}
                  <div className="space-y-2.5">
                    {selectedContact.email && (
                      <div className="border-border flex items-center gap-3 rounded-xl border bg-white/[0.03] p-3">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                          <Mail className="h-4 w-4 text-blue-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-text-secondary/50 text-[10px] tracking-wider uppercase">Email</p>
                          <p className="text-text-primary truncate text-xs">{selectedContact.email}</p>
                        </div>
                      </div>
                    )}
                    {selectedContact.phone && (
                      <div className="border-border flex items-center gap-3 rounded-xl border bg-white/[0.03] p-3">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-green-500/10">
                          <Phone className="h-4 w-4 text-green-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-text-secondary/50 text-[10px] tracking-wider uppercase">Phone</p>
                          <p className="text-text-primary text-xs">{selectedContact.phone}</p>
                        </div>
                      </div>
                    )}
                    <div className="border-border flex items-center gap-3 rounded-xl border bg-white/[0.03] p-3">
                      <div
                        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
                        style={{ backgroundColor: `${getChannelConfig(selectedContact.channel).color}18` }}
                      >
                        <span style={{ color: getChannelConfig(selectedContact.channel).color }}>
                          <ChannelIcon channel={selectedContact.channel} size={16} />
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-text-secondary/50 text-[10px] tracking-wider uppercase">Channel</p>
                        <p className="text-text-primary text-xs capitalize">
                          {getChannelConfig(selectedContact.channel).label}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Stats grid */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="border-border rounded-xl border bg-white/[0.03] p-3 text-center">
                      <p className="text-text-primary text-lg font-bold">{selectedContact.totalConversations}</p>
                      <p className="text-text-secondary/50 mt-0.5 text-[10px]">Conversations</p>
                    </div>
                    <div className="border-border rounded-xl border bg-white/[0.03] p-3 text-center">
                      <p className="text-text-primary text-lg font-bold">{selectedContact.totalMessages}</p>
                      <p className="text-text-secondary/50 mt-0.5 text-[10px]">Messages</p>
                    </div>
                  </div>

                  {/* Tags */}
                  {selectedContact.tags && selectedContact.tags.length > 0 && (
                    <div>
                      <p className="text-text-secondary/50 mb-2 flex items-center gap-1.5 text-[10px] tracking-wider uppercase">
                        <Tag className="h-3 w-3" />
                        Tags
                      </p>
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
                  <div className="space-y-2">
                    <p className="text-text-secondary/50 flex items-center gap-1.5 text-[10px] tracking-wider uppercase">
                      <Clock className="h-3 w-3" />
                      Activity
                    </p>
                    <div className="border-border space-y-1.5 rounded-xl border bg-white/[0.03] p-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-text-secondary/50">First seen</span>
                        <span className="text-text-secondary text-right">
                          {getTimeAgo(selectedContact.firstSeenAt)}
                        </span>
                      </div>
                      <div className="h-px bg-white/[0.04]" />
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-text-secondary/50">Last seen</span>
                        <span className="text-text-secondary text-right">{getTimeAgo(selectedContact.lastSeenAt)}</span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                  <User className="text-text-secondary/20 h-10 w-10" />
                  <p className="text-text-secondary/50 text-xs">No contact info available</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  /* ── Main render ── */
  return (
    <motion.div
      className="flex h-full flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
    >
      {/* ── Page header ── */}
      <motion.div {...fadeUp} className="border-border flex items-center justify-between gap-4 border-b px-6 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 shadow-lg shadow-blue-500/20">
            <MessageSquare className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className={`text-text-primary text-xl font-extrabold tracking-tight ${syne.className}`}>
              Unified Inbox
            </h1>
            <p className="text-text-secondary/60 mt-0.5 text-xs">
              {loading ? 'Loading…' : `${total} conversation${total !== 1 ? 's' : ''}`}
              {!loading && unreadTotal > 0 && (
                <span className="bg-accent/15 text-accent ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold">
                  {unreadTotal} unread
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-shrink-0 items-center gap-2">
          {/* Stats pills */}
          {!loading && conversations.length > 0 && (
            <div className="hidden items-center gap-1.5 lg:flex">
              {conversations.filter((c) => c.status === 'handoff').length > 0 && (
                <StatPill
                  label="handoff"
                  value={conversations.filter((c) => c.status === 'handoff').length}
                  color="bg-amber-500/10 border-amber-500/20 text-amber-400"
                />
              )}
              {conversations.filter((c) => c.status === 'assigned').length > 0 && (
                <StatPill
                  label="assigned"
                  value={conversations.filter((c) => c.status === 'assigned').length}
                  color="bg-purple-500/10 border-purple-500/20 text-purple-400"
                />
              )}
            </div>
          )}

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              fetchConversations();
              if (selectedId) fetchDetail(selectedId, true);
            }}
            className="border-border text-text-secondary hover:text-text-primary flex items-center gap-2 rounded-lg border bg-white/5 px-3 py-1.5 text-xs font-medium transition-all hover:bg-white/10"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </motion.button>
        </div>
      </motion.div>

      {/* ── Three-panel layout ── */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {ConversationList}
        {ChatPanel}
        {ContactSidebar}
      </div>
    </motion.div>
  );
}
