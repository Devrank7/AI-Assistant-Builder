'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Gift, Users, Copy, Send, UserPlus, Sparkles, Check, ExternalLink } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';

/* ── Animations ── */
const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.09, delayChildren: 0.08 },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 18, scale: 0.97 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 120, damping: 16 },
  },
};

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.25, 0.4, 0.25, 1] as const } },
};

/* ── Types ── */
interface ReferralEntry {
  date: string;
  status: 'pending' | 'rewarded';
  rewardType: string;
}

interface ReferralData {
  code: string;
  referralLink: string;
  totalReferrals: number;
  rewardsEarned: number;
  referrals?: ReferralEntry[];
}

/* ── Stat card ── */
function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <motion.div
      variants={staggerItem}
      whileHover={{ scale: 1.025, y: -2 }}
      className="bg-bg-primary/80 border-border flex items-start gap-4 rounded-xl border p-6 backdrop-blur-md"
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
          accent ? 'bg-accent text-white' : 'bg-bg-tertiary text-text-secondary'
        }`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-text-tertiary mb-1 text-[11px] font-semibold tracking-widest uppercase">{label}</p>
        <div className="text-text-primary truncate text-xl font-bold">{value}</div>
      </div>
    </motion.div>
  );
}

/* ── How-it-works step ── */
function HowStep({
  icon: Icon,
  step,
  title,
  desc,
  last,
}: {
  icon: React.ElementType;
  step: number;
  title: string;
  desc: string;
  last?: boolean;
}) {
  return (
    <div className="relative flex flex-1 flex-col items-center text-center">
      <div className="bg-accent/10 text-accent mb-3 flex h-14 w-14 items-center justify-center rounded-2xl">
        <Icon className="h-6 w-6" />
      </div>
      <span className="text-text-tertiary mb-1 text-[10px] font-bold tracking-widest uppercase">Step {step}</span>
      <p className="text-text-primary mb-0.5 text-[14px] font-semibold">{title}</p>
      <p className="text-text-secondary max-w-[140px] text-[12px]">{desc}</p>
      {!last && (
        <div className="border-border absolute top-7 right-[calc(-50%+36px)] left-[calc(50%+36px)] hidden h-px border-t-2 border-dashed sm:block" />
      )}
    </div>
  );
}

/* ── Main page ── */
export default function ReferralsPage() {
  useAuth();

  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/referral');
        const json = await res.json();
        if (json.success) {
          setData(json.data);
        } else {
          setError(json.message || 'Failed to load referral data');
        }
      } catch {
        setError('Network error. Please try again.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const copyToClipboard = async (text: string, type: 'code' | 'link') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'code') {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      } else {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      }
    } catch {
      /* ignore */
    }
  };

  const twitterShareUrl = data
    ? `https://twitter.com/intent/tweet?text=${encodeURIComponent(
        `I've been using WinBix AI to power my business with AI chat — try it free! ${data.referralLink}`
      )}`
    : '#';

  const emailShareUrl = data
    ? `mailto:?subject=${encodeURIComponent('Try WinBix AI — AI chat for your business')}&body=${encodeURIComponent(
        `Hey! I've been using WinBix AI and thought you might like it.\n\nSign up with my referral link and we both get rewards:\n${data.referralLink}`
      )}`
    : '#';

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="mx-auto max-w-3xl animate-pulse space-y-6 pb-12">
        <div className="bg-bg-tertiary h-10 w-48 rounded-xl" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-bg-tertiary h-24 rounded-xl" />
          ))}
        </div>
        <div className="bg-bg-tertiary h-32 rounded-xl" />
        <div className="bg-bg-tertiary h-48 rounded-xl" />
      </div>
    );
  }

  /* ── Error ── */
  if (error) {
    return (
      <div className="mx-auto max-w-3xl pb-12">
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="bg-bg-tertiary mb-4 flex h-16 w-16 items-center justify-center rounded-2xl">
            <Gift className="text-text-tertiary h-8 w-8" />
          </div>
          <h3 className="text-text-primary mb-1.5 text-base font-semibold">Could not load referrals</h3>
          <p className="text-text-secondary text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-12">
      {/* Header */}
      <motion.div {...fadeUp}>
        <h1 className="text-text-primary text-2xl font-bold">Referrals</h1>
        <p className="text-text-secondary mt-1 text-[13px]">Invite friends and earn rewards</p>
      </motion.div>

      {/* Stats row */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 gap-4 sm:grid-cols-3"
      >
        <StatCard icon={Users} label="Total Referrals" value={data?.totalReferrals ?? 0} />
        <StatCard icon={Gift} label="Rewards Earned" value={data?.rewardsEarned ?? 0} accent />
        <StatCard
          icon={Copy}
          label="Your Code"
          value={
            <span className="flex items-center gap-2">
              <span className="font-mono text-base">{data?.code ?? '—'}</span>
              {data?.code && (
                <button
                  onClick={() => copyToClipboard(data.code, 'code')}
                  className="text-text-secondary hover:text-accent hover:bg-accent/10 ml-1 flex h-6 w-6 items-center justify-center rounded-md transition-colors"
                  title="Copy code"
                >
                  {copiedCode ? <Check className="text-accent h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              )}
            </span>
          }
        />
      </motion.div>

      {/* Referral Link card */}
      <motion.div
        variants={staggerItem}
        initial="hidden"
        animate="show"
        whileHover={{ scale: 1.008 }}
        className="bg-bg-secondary border-border space-y-4 rounded-xl border p-6"
      >
        <h2 className="text-text-primary text-[13px] font-semibold">Your Referral Link</h2>
        <div className="flex gap-2">
          <input
            type="text"
            readOnly
            value={data?.referralLink ?? ''}
            className="border-border bg-bg-primary text-text-secondary min-w-0 flex-1 rounded-lg border px-3 py-2 font-mono text-[13px] outline-none select-all"
          />
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => data?.referralLink && copyToClipboard(data.referralLink, 'link')}
            className="bg-accent hover:bg-accent/90 flex shrink-0 items-center gap-1.5 rounded-lg px-4 py-2 text-[13px] font-medium text-white transition-colors"
          >
            {copiedLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copiedLink ? 'Copied!' : 'Copy Link'}
          </motion.button>
        </div>

        {/* Share buttons */}
        <div className="flex flex-wrap gap-2 pt-1">
          <span className="text-text-tertiary mr-1 self-center text-[11px] font-semibold tracking-wider uppercase">
            Share via:
          </span>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => data?.referralLink && copyToClipboard(data.referralLink, 'link')}
            className="border-border bg-bg-primary text-text-secondary hover:text-text-primary hover:border-accent/40 flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-colors"
          >
            <Copy className="h-3.5 w-3.5" />
            Copy
          </motion.button>
          <a
            href={twitterShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="border-border bg-bg-primary text-text-secondary hover:text-text-primary hover:border-accent/40 flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />X / Twitter
          </a>
          <a
            href={emailShareUrl}
            className="border-border bg-bg-primary text-text-secondary hover:text-text-primary hover:border-accent/40 flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-colors"
          >
            <Send className="h-3.5 w-3.5" />
            Email
          </a>
        </div>
      </motion.div>

      {/* How It Works */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0, transition: { duration: 0.45, delay: 0.15 } }}
        className="bg-bg-secondary border-border rounded-xl border p-6"
      >
        <h2 className="text-text-primary mb-6 text-[13px] font-semibold">How It Works</h2>
        <div className="relative flex flex-col gap-6 sm:flex-row sm:gap-2">
          <HowStep
            icon={Send}
            step={1}
            title="Share your link"
            desc="Send your referral link to friends or colleagues"
          />
          <HowStep icon={UserPlus} step={2} title="Friend signs up" desc="They register using your link" />
          <HowStep
            icon={Sparkles}
            step={3}
            title="Both earn rewards"
            desc="You and your friend both receive rewards"
            last
          />
        </div>
      </motion.div>

      {/* Recent Referrals table */}
      {data?.referrals && data.referrals.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.45, delay: 0.2 } }}
          className="bg-bg-secondary border-border overflow-hidden rounded-xl border"
        >
          <div className="border-border border-b px-6 py-4">
            <h2 className="text-text-primary text-[13px] font-semibold">Recent Referrals</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-border border-b">
                  <th className="text-text-tertiary px-6 py-3 text-left text-[10px] font-semibold tracking-widest uppercase">
                    Date
                  </th>
                  <th className="text-text-tertiary px-6 py-3 text-left text-[10px] font-semibold tracking-widest uppercase">
                    Status
                  </th>
                  <th className="text-text-tertiary px-6 py-3 text-left text-[10px] font-semibold tracking-widest uppercase">
                    Reward
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.referrals.map((entry, i) => (
                  <tr
                    key={i}
                    className={`hover:bg-bg-tertiary/40 transition-colors ${
                      i < data.referrals!.length - 1 ? 'border-border border-b' : ''
                    }`}
                  >
                    <td className="text-text-secondary px-6 py-3">
                      {new Date(entry.date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase ${
                          entry.status === 'rewarded'
                            ? 'bg-accent-subtle text-accent'
                            : 'bg-bg-tertiary text-text-secondary'
                        }`}
                      >
                        {entry.status === 'rewarded' && (
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="bg-accent absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" />
                            <span className="bg-accent relative inline-flex h-1.5 w-1.5 rounded-full" />
                          </span>
                        )}
                        {entry.status}
                      </span>
                    </td>
                    <td className="text-text-secondary px-6 py-3 capitalize">{entry.rewardType}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Empty referrals placeholder */}
      {(!data?.referrals || data.referrals.length === 0) && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.45, delay: 0.2 } }}
          className="bg-bg-secondary border-border flex flex-col items-center justify-center rounded-xl border py-12 text-center"
        >
          <div className="bg-bg-tertiary mb-3 flex h-12 w-12 items-center justify-center rounded-2xl">
            <Users className="text-text-tertiary h-6 w-6" />
          </div>
          <p className="text-text-primary mb-1 text-sm font-medium">No referrals yet</p>
          <p className="text-text-secondary text-[12px]">Share your link above to get started</p>
        </motion.div>
      )}
    </div>
  );
}
