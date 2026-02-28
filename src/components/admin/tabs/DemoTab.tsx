'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

const demoTemplates = [
  {
    id: 'dental',
    name: 'Dental Clinic',
    description: 'Modern dental clinic website with appointment booking',
    image: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800&q=80',
    gradient: 'from-cyan-500 to-blue-600',
    icon: '🦷',
    isClientSite: false,
  },
  {
    id: 'construction',
    name: 'Construction Co.',
    description: 'Professional construction company website',
    image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80',
    gradient: 'from-orange-500 to-amber-600',
    icon: '🏗️',
    isClientSite: false,
  },
  {
    id: 'hotel',
    name: 'Luxury Hotel',
    description: 'Elegant hotel booking website',
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',
    gradient: 'from-purple-500 to-pink-600',
    icon: '🏨',
    isClientSite: false,
  },
  {
    id: 'client-website',
    name: 'Client Website',
    description: 'Preview widget on the actual client website',
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
    gradient: 'from-green-500 to-emerald-600',
    icon: '🌐',
    isClientSite: true,
  },
];

interface DemoTabProps {
  clientId: string;
  website: string;
}

export default function DemoTab({ clientId, website }: DemoTabProps) {
  const [shortUrl, setShortUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`/api/short-link?clientId=${clientId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.shortUrl) setShortUrl(data.shortUrl);
      })
      .catch(() => {});
  }, [clientId]);

  const fullDemoUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/demo/client-website?client=${clientId}&website=${encodeURIComponent(website)}`
      : '';

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      {/* Short Link Section */}
      {(shortUrl || fullDemoUrl) && (
        <div className="mb-8 rounded-xl border border-white/10 bg-white/[0.03] p-5">
          <h4 className="mb-3 text-sm font-semibold tracking-wider text-gray-400 uppercase">Demo Links</h4>

          {shortUrl && (
            <div className="mb-3 flex items-center gap-3">
              <span className="shrink-0 text-xs text-gray-500">Short:</span>
              <code className="min-w-0 flex-1 truncate rounded bg-black/40 px-3 py-1.5 text-sm text-green-400">
                {shortUrl}
              </code>
              <button
                onClick={() => handleCopy(shortUrl)}
                className="shrink-0 rounded-lg bg-green-500/20 px-3 py-1.5 text-xs font-medium text-green-400 transition-colors hover:bg-green-500/30"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          )}

          <div className="flex items-center gap-3">
            <span className="shrink-0 text-xs text-gray-500">Full:</span>
            <code className="min-w-0 flex-1 truncate rounded bg-black/40 px-3 py-1.5 text-xs text-gray-400">
              {fullDemoUrl}
            </code>
            <button
              onClick={() => handleCopy(fullDemoUrl)}
              className="shrink-0 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:bg-white/20"
            >
              Copy
            </button>
          </div>
        </div>
      )}

      <div className="mb-6">
        <h3 className="mb-2 text-2xl font-bold text-white">Live Demo Templates</h3>
        <p className="text-gray-400">Preview how your widget looks on different website templates</p>
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {demoTemplates.map((template) => {
          const href = template.isClientSite
            ? `/demo/${template.id}?client=${clientId}&website=${encodeURIComponent(website)}`
            : `/demo/${template.id}?client=${clientId}`;

          return (
            <Link key={template.id} href={href} className="group">
              <div
                className={`glass-card overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl ${template.isClientSite ? 'ring-2 ring-green-500/30 hover:shadow-green-500/20' : 'hover:shadow-[var(--neon-cyan)]/20'}`}
              >
                <div className="relative h-48 overflow-hidden">
                  <Image
                    src={template.image}
                    alt={template.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className={`absolute inset-0 bg-gradient-to-t ${template.gradient} opacity-60`} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-6xl">{template.icon}</span>
                  </div>
                  <div
                    className={`absolute top-3 right-3 rounded-full px-3 py-1 text-xs text-white backdrop-blur-sm ${template.isClientSite ? 'bg-green-500/70' : 'bg-black/50'}`}
                  >
                    {template.isClientSite ? 'Your Website' : 'Live Preview'}
                  </div>
                </div>
                <div className="p-5">
                  <h4
                    className={`mb-1 text-lg font-semibold text-white transition-colors ${template.isClientSite ? 'group-hover:text-green-400' : 'group-hover:text-[var(--neon-cyan)]'}`}
                  >
                    {template.name}
                  </h4>
                  <p className="mb-2 text-sm text-gray-400">{template.description}</p>
                  {template.isClientSite && <p className="mb-2 truncate text-xs text-green-400/70">{website}</p>}
                  <div
                    className={`flex items-center text-sm font-medium ${template.isClientSite ? 'text-green-400' : 'text-[var(--neon-cyan)]'}`}
                  >
                    <span>Open Demo</span>
                    <svg
                      className="ml-2 h-4 w-4 transform transition-transform group-hover:translate-x-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
