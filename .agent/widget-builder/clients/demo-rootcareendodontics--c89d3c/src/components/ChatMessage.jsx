import { memo, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { User, Copy, Check, RotateCcw, ZoomIn, Sparkles, Volume2, VolumeX } from 'lucide-preact';

function formatRelativeTime(timestamp) {
    if (!timestamp) return '';
    const diff = Date.now() - timestamp;
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
}

function ChatMessage({ role, content, timestamp, isError, onRetry, imageUrl, onImageClick, onSpeak, isSpeaking }) {
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
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            className={`flex items-end gap-2 mb-3 group ${isBot ? 'justify-start' : 'justify-end'}`}
            role="article"
        >
            {/* Bot Avatar */}
            {isBot && (
                <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#e8eaee] to-[#babfcb] flex items-center justify-center flex-shrink-0 shadow-sm border border-[#a3aab9]/50">
                    <Sparkles size={13} className="text-[#1a2b50]" />
                </div>
            )}

            <div className="flex flex-col max-w-[78%]">
                {imageUrl && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className={`mb-1.5 ${isBot ? '' : 'flex justify-end'}`}>
                        <div className="relative group/img cursor-pointer overflow-hidden rounded-2xl border border-gray-200 shadow-sm" onClick={() => onImageClick?.(imageUrl)}>
                            <img src={imageUrl} alt="" className="max-w-[200px] max-h-[140px] object-cover rounded-2xl" />
                            <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/15 transition-all duration-200 flex items-center justify-center">
                                <ZoomIn size={18} className="text-white opacity-0 group-hover/img:opacity-90 transition-opacity drop-shadow-lg" />
                            </div>
                        </div>
                    </motion.div>
                )}

                {content && (
                    <div className={`rounded-2xl px-3.5 py-2.5 text-[13px] leading-[1.6] ${
                        isError
                            ? 'bg-red-50 text-red-600 border border-red-200 rounded-bl-md'
                            : isBot
                              ? 'bg-white text-gray-700 border border-gray-100 shadow-sm rounded-bl-md'
                              : 'bg-gradient-to-r from-[#e8eaee] to-[#babfcb] text-gray-700 border border-[#a3aab9]/50 rounded-br-md shadow-sm'
                    }`}>
                        <div className="max-w-none msg-text [&>p]:my-0 [&>p+p]:mt-2 [&>ul]:my-1.5 [&>ol]:my-1.5 [&>ul]:pl-4 [&>ol]:pl-4 [&>ul]:list-disc [&>ol]:list-decimal">
                            <ReactMarkdown
                                components={{
                                    a: ({ href, children }) => (
                                        <a href={href} target="_blank" rel="noopener noreferrer" className="underline decoration-1 underline-offset-2 transition-colors text-[#1a2b50] hover:text-[#152342]">{children}</a>
                                    ),
                                    strong: ({ children }) => (
                                        <strong className="font-semibold text-gray-900">{children}</strong>
                                    ),
                                    li: ({ children }) => (
                                        <li className="text-[12.5px] leading-relaxed">{children}</li>
                                    ),
                                }}
                            >
                                {content}
                            </ReactMarkdown>
                        </div>
                    </div>
                )}

                <div className={`flex items-center gap-2 mt-1 px-1 ${isBot ? '' : 'justify-end'}`}>
                    {timestamp && <span className="text-[10px] text-gray-400 font-medium">{formatRelativeTime(timestamp)}</span>}
                    {isBot && !isError && content && (
                        <button onClick={handleCopy} className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-300 hover:text-[#1a2b50] transition-all duration-200" aria-label="Copy">
                            {copied ? <Check size={11} className="text-[#1a2b50]" /> : <Copy size={11} />}
                        </button>
                    )}
                    {isBot && !isError && content && onSpeak && (
                        <button onClick={() => onSpeak(content)}
                            className={`p-0.5 transition-all duration-200 ${isSpeaking ? 'text-[#1a2b50] opacity-100' : 'opacity-0 group-hover:opacity-100 text-gray-300 hover:text-[#1a2b50]'}`}
                            aria-label={isSpeaking ? 'Stop reading' : 'Read aloud'}>
                            {isSpeaking ? <VolumeX size={11} /> : <Volume2 size={11} />}
                        </button>
                    )}
                    {isError && onRetry && (
                        <button onClick={onRetry} className="flex items-center gap-1 text-[10px] font-medium text-red-500 hover:text-red-600 transition-colors">
                            <RotateCcw size={10} /> Retry
                        </button>
                    )}
                </div>
            </div>

            {!isBot && (
                <div className="w-7 h-7 rounded-xl flex items-center justify-center bg-gradient-to-br from-[#e8eaee] to-[#babfcb] border border-[#a3aab9]/50 text-[#1a2b50] flex-shrink-0 shadow-sm">
                    <User size={13} />
                </div>
            )}
        </motion.div>
    );
}

export default memo(ChatMessage);
