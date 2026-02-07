import { memo, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { User, Copy, Check, RotateCcw } from 'lucide-preact';

function formatRelativeTime(timestamp) {
    if (!timestamp) return '';
    const diff = Date.now() - timestamp;
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}

function ChatMessage({ role, content, avatar, timestamp, isError, onRetry }) {
    const isBot = role === 'assistant';
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(content);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {}
    }, [content]);

    return (
        <motion.div
            initial={{ opacity: 0, x: isBot ? -20 : 20, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className={`flex items-end gap-2 mb-3 group ${isBot ? 'justify-start' : 'justify-end'}`}
            role="article"
            aria-label={`${isBot ? 'Bot' : 'You'}: ${content?.slice(0, 80) || ''}`}
        >
            {isBot && (
                <div className="w-8 h-8 rounded-full overflow-hidden bg-white/10 border border-white/20 flex-shrink-0">
                    <img src={avatar} alt="" className="w-full h-full object-cover" />
                </div>
            )}

            <div className="flex flex-col max-w-[80%]">
                <div
                    className={`rounded-2xl px-4 py-3 text-sm shadow-md backdrop-blur-md border border-white/5 ${
                        isError
                            ? 'bg-red-500/10 text-red-200 border-red-500/20 rounded-bl-sm'
                            : isBot
                              ? 'bg-white/10 text-white rounded-bl-sm'
                              : 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-br-sm shadow-emerald-500/10'
                    }`}
                >
                    <div className="prose prose-invert prose-sm max-w-none leading-relaxed">
                        <ReactMarkdown
                            components={{
                                a: ({ href, children }) => (
                                    <a
                                        href={href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-emerald-300 underline hover:text-emerald-200"
                                    >
                                        {children}
                                    </a>
                                ),
                            }}
                        >
                            {content}
                        </ReactMarkdown>
                    </div>
                </div>

                {/* Timestamp + Actions */}
                <div className={`flex items-center gap-2 mt-1 px-1 ${isBot ? '' : 'justify-end'}`}>
                    {timestamp && <span className="text-[10px] text-white/20">{formatRelativeTime(timestamp)}</span>}

                    {isBot && !isError && content && (
                        <button
                            onClick={handleCopy}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded text-white/20 hover:text-white/40 transition-all"
                            aria-label={copied ? 'Copied' : 'Copy message'}
                        >
                            {copied ? <Check size={12} /> : <Copy size={12} />}
                        </button>
                    )}

                    {isError && onRetry && (
                        <button
                            onClick={onRetry}
                            className="flex items-center gap-1 text-[10px] text-red-300/60 hover:text-red-200 transition-colors"
                            aria-label="Retry"
                        >
                            <RotateCcw size={10} />
                            <span>Retry</span>
                        </button>
                    )}
                </div>
            </div>

            {!isBot && (
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 border border-white/10 text-white/50">
                    <User size={14} />
                </div>
            )}
        </motion.div>
    );
}

export default memo(ChatMessage);
