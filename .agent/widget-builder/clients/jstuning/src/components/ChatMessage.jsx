import { memo, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { User, Copy, Check, RotateCcw, ZoomIn, Sparkles } from 'lucide-preact';

function formatRelativeTime(timestamp) {
    if (!timestamp) return '';
    const diff = Date.now() - timestamp;
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return 'щойно';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} хв`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} год`;
    return `${Math.floor(hours / 24)} д`;
}

function ChatMessage({ role, content, timestamp, isError, onRetry, imageUrl, onImageClick }) {
    const isBot = role === 'assistant';
    const [copied, setCopied] = useState(false);
    const [logoErr, setLogoErr] = useState(false);

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
                <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#2a1e40] to-[#352850] flex items-center justify-center flex-shrink-0 shadow-sm border border-[#4a3570]/50 overflow-hidden p-0.5">
                    {!logoErr ? (
                        <img src="https://www.google.com/s2/favicons?domain=jstuningkyiv.com.ua&sz=32" alt="" className="w-full h-full object-contain rounded-sm" onError={() => setLogoErr(true)} />
                    ) : (
                        <Sparkles size={13} className="text-[#b58af5]" />
                    )}
                </div>
            )}

            <div className="flex flex-col max-w-[78%]">
                {imageUrl && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className={`mb-1.5 ${isBot ? '' : 'flex justify-end'}`}>
                        <div className="relative group/img cursor-pointer overflow-hidden rounded-2xl border border-[#363636] shadow-sm" onClick={() => onImageClick?.(imageUrl)}>
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
                              ? 'bg-[#262626] text-[#e5e5e5] border border-[#363636] shadow-sm rounded-bl-md'
                              : 'bg-[#221a35] text-[#e5e5e5] border border-[#3a2860] rounded-br-md shadow-sm'
                    }`}>
                        <div className="max-w-none [&>p]:my-0 [&>p+p]:mt-2 [&>ul]:my-1.5 [&>ol]:my-1.5 [&>ul]:pl-4 [&>ol]:pl-4 [&>ul]:list-disc [&>ol]:list-decimal">
                            <ReactMarkdown
                                components={{
                                    a: ({ href, children }) => (
                                        <a href={href} target="_blank" rel="noopener noreferrer" className="underline decoration-1 underline-offset-2 transition-colors text-[#b58af5] hover:text-[#cda8ff]">{children}</a>
                                    ),
                                    strong: ({ children }) => (
                                        <strong className="font-semibold text-white">{children}</strong>
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
                    {timestamp && <span className="text-[10px] text-[#808080] font-medium">{formatRelativeTime(timestamp)}</span>}
                    {isBot && !isError && content && (
                        <button onClick={handleCopy} className="opacity-0 group-hover:opacity-100 p-0.5 text-[#555555] hover:text-[#8b50ef] transition-all duration-200" aria-label="Copy">
                            {copied ? <Check size={11} className="text-[#b58af5]" /> : <Copy size={11} />}
                        </button>
                    )}
                    {isError && onRetry && (
                        <button onClick={onRetry} className="flex items-center gap-1 text-[10px] font-medium text-red-500 hover:text-red-600 transition-colors">
                            <RotateCcw size={10} /> Повторити
                        </button>
                    )}
                </div>
            </div>

            {!isBot && (
                <div className="w-7 h-7 rounded-xl flex items-center justify-center bg-gradient-to-br from-[#2a1e40] to-[#352850] border border-[#4a3570]/50 text-[#b58af5] flex-shrink-0 shadow-sm">
                    <User size={13} />
                </div>
            )}
        </motion.div>
    );
}

export default memo(ChatMessage);
