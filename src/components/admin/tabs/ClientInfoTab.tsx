'use client';

import { IClient } from '@/models/Client';

interface ClientInfoTabProps {
  client: IClient;
  scriptUrl: string;
  startDate: Date;
  daysUntilPayment: number;
}

export default function ClientInfoTab({ client, scriptUrl, startDate, daysUntilPayment }: ClientInfoTabProps) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Contact Information */}
      <div className="glass-card p-6">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
          <svg className="h-5 w-5 text-[var(--neon-cyan)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
          Contact Information
        </h3>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-400">Username</label>
            <p className="text-white">{client.username}</p>
          </div>
          <div>
            <label className="text-sm text-gray-400">Email</label>
            <p className="text-white">{client.email}</p>
          </div>
          <div>
            <label className="text-sm text-gray-400">Website</label>
            <a
              href={client.website}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-[var(--neon-cyan)] hover:underline"
            >
              {client.website}
            </a>
          </div>
          {client.phone && (
            <div>
              <label className="text-sm text-gray-400">Phone</label>
              <p className="text-white">{client.phone}</p>
            </div>
          )}
          {client.instagram && (
            <div>
              <label className="text-sm text-gray-400">Instagram</label>
              <a
                href={`https://instagram.com/${client.instagram}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-[var(--neon-pink)] hover:underline"
              >
                @{client.instagram}
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Widget Integration */}
      <div className="glass-card p-6">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
          <svg className="h-5 w-5 text-[var(--neon-purple)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
            />
          </svg>
          Widget Integration
        </h3>
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm text-gray-400">Script URL</label>
            <div className="rounded-lg bg-black/30 p-3 font-mono text-sm break-all text-[var(--neon-cyan)]">
              {scriptUrl}
            </div>
          </div>
          <div>
            <label className="mb-2 block text-sm text-gray-400">Embed Code</label>
            <div className="overflow-x-auto rounded-lg bg-black/30 p-3 font-mono text-sm text-gray-300">
              <pre>{`<script src="${scriptUrl}"></script>`}</pre>
            </div>
          </div>
          <button onClick={() => navigator.clipboard.writeText(scriptUrl)} className="neon-button w-full">
            Copy Script URL
          </button>
        </div>
      </div>

      {/* Subscription Info */}
      <div className="glass-card p-6 lg:col-span-2">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
          <svg className="h-5 w-5 text-[var(--neon-pink)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          Subscription Details
        </h3>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
          <div>
            <label className="text-sm text-gray-400">Start Date</label>
            <p className="text-white">{startDate.toLocaleDateString()}</p>
          </div>
          <div>
            <label className="text-sm text-gray-400">Next Payment</label>
            <p className="text-white">
              {new Date(Date.now() + daysUntilPayment * 24 * 60 * 60 * 1000).toLocaleDateString()}
            </p>
          </div>
          <div>
            <label className="text-sm text-gray-400">Client ID</label>
            <p className="font-mono text-sm text-white">{client.clientId}</p>
          </div>
          <div>
            <label className="text-sm text-gray-400">Client Token</label>
            <div className="flex items-center gap-2">
              <p className="truncate font-mono text-sm text-[var(--neon-cyan)]">{client.clientToken}</p>
              <button
                onClick={() => navigator.clipboard.writeText(client.clientToken)}
                className="text-gray-400 transition-colors hover:text-white"
                title="Copy token"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
