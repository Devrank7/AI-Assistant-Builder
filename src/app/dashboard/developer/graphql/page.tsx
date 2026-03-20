'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Code2, Copy, Check, Loader2, Zap, Clock, BarChart3, ChevronRight, Braces, FileCode } from 'lucide-react';

interface QueryStats {
  callsToday: number;
  avgResponseTime: number;
}

const EXAMPLE_QUERIES = [
  {
    name: 'List Clients',
    query: `query {
  listClients(limit: 10) {
    clients {
      id
      name
      niche
      status
      createdAt
    }
    total
  }
}`,
  },
  {
    name: 'Get Client',
    query: `query {
  getClient(id: "CLIENT_ID") {
    id
    name
    niche
    website
    aiSettings {
      model
      temperature
      systemPrompt
    }
  }
}`,
  },
  {
    name: 'List Conversations',
    query: `query {
  listConversations(clientId: "CLIENT_ID", limit: 20) {
    conversations {
      id
      visitorId
      messageCount
      lastMessageAt
      channel
    }
    total
  }
}`,
  },
  {
    name: 'Get Analytics',
    query: `query {
  getAnalytics(clientId: "CLIENT_ID", period: "7d") {
    totalConversations
    totalMessages
    avgResponseTime
    topQuestions {
      question
      count
    }
  }
}`,
  },
  {
    name: 'List Knowledge Chunks',
    query: `query {
  listKnowledgeChunks(clientId: "CLIENT_ID") {
    chunks {
      id
      title
      content
      source
      createdAt
    }
    total
  }
}`,
  },
  {
    name: 'Create Client (Mutation)',
    query: `mutation {
  createClient(input: {
    name: "My New Client"
    niche: "dental"
    website: "https://example.com"
  }) {
    id
    name
    status
  }
}`,
  },
];

export default function GraphQLPlaygroundPage() {
  const [query, setQuery] = useState(EXAMPLE_QUERIES[0].query);
  const [variables, setVariables] = useState('{}');
  const [response, setResponse] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState<QueryStats>({ callsToday: 0, avgResponseTime: 0 });
  const [copied, setCopied] = useState(false);
  const [showVariables, setShowVariables] = useState(false);
  const [selectedExample, setSelectedExample] = useState(0);
  const [executionTime, setExecutionTime] = useState<number | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/v2/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: '{ __stats { callsToday avgResponseTime } }' }),
      });
      const data = await res.json();
      if (data.data?.__stats) {
        setStats(data.data.__stats);
      }
    } catch {
      // Stats not available
    }
  };

  const executeQuery = async () => {
    setLoading(true);
    setError('');
    setResponse('');
    setExecutionTime(null);

    const startTime = Date.now();

    try {
      let parsedVars = {};
      try {
        parsedVars = JSON.parse(variables);
      } catch {
        setError('Invalid JSON in variables');
        setLoading(false);
        return;
      }

      const res = await fetch('/api/v2/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables: parsedVars }),
      });

      const elapsed = Date.now() - startTime;
      setExecutionTime(elapsed);

      const data = await res.json();
      setResponse(JSON.stringify(data, null, 2));

      setStats((prev) => ({
        callsToday: prev.callsToday + 1,
        avgResponseTime: Math.round((prev.avgResponseTime + elapsed) / 2),
      }));
    } catch {
      setError('Failed to execute query');
      setExecutionTime(Date.now() - startTime);
    }
    setLoading(false);
  };

  const copyResponse = () => {
    navigator.clipboard.writeText(response);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const selectExample = (index: number) => {
    setSelectedExample(index);
    setQuery(EXAMPLE_QUERIES[index].query);
    setResponse('');
    setError('');
    setExecutionTime(null);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-1 flex items-center gap-3">
            <Braces className="h-6 w-6 text-blue-400" />
            <h1 className="text-2xl font-bold text-white">GraphQL Explorer</h1>
          </div>
          <p className="text-sm text-gray-400">Query the WinBix API using GraphQL</p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid gap-4 sm:grid-cols-2"
        >
          {[
            { label: 'API Calls Today', value: String(stats.callsToday), icon: Zap, color: 'text-blue-400' },
            { label: 'Avg Response Time', value: `${stats.avgResponseTime}ms`, icon: Clock, color: 'text-green-400' },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 backdrop-blur"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm text-gray-400">{stat.label}</span>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <div className="text-3xl font-bold text-white">{stat.value}</div>
            </motion.div>
          ))}
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-4">
          {/* Example Queries Sidebar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur lg:col-span-1"
          >
            <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
              <FileCode className="h-4 w-4 text-blue-400" />
              <h3 className="text-sm font-semibold text-white">Example Queries</h3>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {EXAMPLE_QUERIES.map((ex, i) => (
                <button
                  key={ex.name}
                  onClick={() => selectExample(i)}
                  className={`flex w-full items-center gap-2 px-4 py-3 text-left text-sm transition-colors ${
                    selectedExample === i
                      ? 'bg-blue-500/10 text-blue-400'
                      : 'text-gray-400 hover:bg-white/[0.03] hover:text-white'
                  }`}
                >
                  <ChevronRight
                    className={`h-3 w-3 shrink-0 transition-transform ${selectedExample === i ? 'rotate-90' : ''}`}
                  />
                  {ex.name}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Editor + Response */}
          <div className="space-y-4 lg:col-span-3">
            {/* Query Editor */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur"
            >
              <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
                <div className="flex items-center gap-2">
                  <Code2 className="h-4 w-4 text-blue-400" />
                  <h3 className="text-sm font-semibold text-white">Query Editor</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowVariables(!showVariables)}
                    className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                      showVariables ? 'bg-blue-500/20 text-blue-400' : 'bg-white/[0.03] text-gray-400 hover:text-white'
                    }`}
                  >
                    Variables
                  </button>
                  <button
                    onClick={executeQuery}
                    disabled={loading || !query.trim()}
                    className="flex items-center gap-2 rounded-xl bg-blue-500/20 px-4 py-1.5 text-sm font-medium text-blue-400 transition-colors hover:bg-blue-500/30 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                    Execute
                  </button>
                </div>
              </div>
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                rows={12}
                spellCheck={false}
                className="w-full resize-none bg-transparent p-4 font-mono text-sm text-green-400 outline-none"
                placeholder="Enter your GraphQL query..."
              />
              {showVariables && (
                <div className="border-t border-white/[0.06]">
                  <div className="px-4 py-2 text-xs text-gray-500">Variables (JSON)</div>
                  <textarea
                    value={variables}
                    onChange={(e) => setVariables(e.target.value)}
                    rows={4}
                    spellCheck={false}
                    className="w-full resize-none bg-transparent px-4 pb-4 font-mono text-sm text-yellow-400 outline-none"
                    placeholder='{ "id": "..." }'
                  />
                </div>
              )}
            </motion.div>

            {/* Response Viewer */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur"
            >
              <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-blue-400" />
                  <h3 className="text-sm font-semibold text-white">Response</h3>
                  {executionTime !== null && <span className="ml-2 text-xs text-gray-500">{executionTime}ms</span>}
                </div>
                {response && (
                  <button
                    onClick={copyResponse}
                    className="flex items-center gap-1 rounded-lg bg-white/[0.03] px-3 py-1 text-xs text-gray-400 transition-colors hover:text-white"
                  >
                    {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                )}
              </div>
              <div className="max-h-[400px] min-h-[200px] overflow-auto p-4">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
                  </div>
                ) : error ? (
                  <pre className="font-mono text-sm whitespace-pre-wrap text-red-400">{error}</pre>
                ) : response ? (
                  <pre className="font-mono text-sm whitespace-pre-wrap text-gray-300">{response}</pre>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-600">
                    <Play className="mb-2 h-8 w-8" />
                    <p className="text-sm">Execute a query to see results</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
