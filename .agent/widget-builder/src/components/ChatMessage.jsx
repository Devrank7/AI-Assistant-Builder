import { memo, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { User, Copy, Check, RotateCcw, ZoomIn, Sparkles, Volume2, VolumeX } from 'lucide-preact';

function formatTime(timestamp) {
    if (!timestamp) return '';
    try { return new Date(timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }); }
    catch { return ''; }
}

function BotAvatar() {
    const ba = window.__WIDGET_CONFIG__?.botAvatar;
    if (ba && ba.startsWith('http')) {
        return <img src={ba} alt="" className="w-7 h-7 rounded-xl object-cover shadow-sm" />;
    }
    if (ba && ba.length <= 3) {
        return (
            <span className="w-7 h-7 rounded-xl bg-[#37ca37]/20 flex items-center justify-center text-[11px] font-semibold border border-[#afeaaf]/50 shadow-sm">
                {ba}
            </span>
        );
    }
    return (
        <span className="w-7 h-7 rounded-xl bg-[#37ca37]/20 flex items-center justify-center border border-[#afeaaf]/50 shadow-sm">
            <Sparkles size={13} className="text-[#37ca37]" />
        </span>
    );
}

function ChatMessage({ role, content, timestamp, isError, onRetry, imageUrl, onImageClick, onSpeak, isSpeaking, prevSender, nextSender }) {
    const isBot = role === 'assistant';
    const [copied, setCopied] = useState(false);

    // Message grouping
    const samePrev = prevSender === role;
    const sameNext = nextSender === role;
    const showAvatar = !sameNext;
    const showTail = !sameNext;
    const showMeta = !sameNext;

    const handleCopy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(content);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {}
    }, [content]);

    const tailClass = isBot
        ? (showTail ? 'rounded-bl-sm' : '')
        : (showTail ? 'rounded-br-sm' : '');

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            className={`flex items-end gap-2 group ${isBot ? 'justify-start' : 'justify-end'} ${samePrev ? 'mt-0.5' : 'mt-3'}`}
            role="article"
        >
            {/* Bot Avatar — only on last message in group */}
            {isBot && (showAvatar ? <BotAvatar /> : <div className="w-7 flex-shrink-0" />)}

            <div className="flex flex-col max-w-[85%] sm:max-w-[78%]">
                {imageUrl && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className={`mb-1.5 ${isBot ? '' : 'flex justify-end'}`}>
                        <div className="relative group/img cursor-pointer overflow-hidden rounded-2xl border border-[#11312a] shadow-sm" onClick={() => onImageClick?.(imageUrl)}>
                            <img src={imageUrl} alt="" className="max-w-[200px] max-h-[140px] object-cover rounded-2xl" />
                            <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/15 transition-all duration-200 flex items-center justify-center">
                                <ZoomIn size={18} className="text-white opacity-0 group-hover/img:opacity-90 transition-opacity drop-shadow-lg" />
                            </div>
                        </div>
                    </motion.div>
                )}

                {content && (
                    <div className={`rounded-2xl px-3.5 py-2.5 text-[13px] leading-[1.6] ${tailClass} ${
                        isError
                            ? 'bg-red-50 text-red-600 border border-red-200 rounded-bl-md'
                            : isBot
                              ? 'bg-[#091d1b] text-[#e2e8f0] border border-[#11312a] shadow-sm'
                              : 'bg-[#37ca37] text-white shadow-sm'
                    }`}>
                        <div className="max-w-none msg-text [&>p]:my-0 [&>p+p]:mt-2 [&>ul]:my-1.5 [&>ol]:my-1.5 [&>ul]:pl-4 [&>ol]:pl-4 [&>ul]:list-disc [&>ol]:list-decimal">
                            <ReactMarkdown
                                components={{
                                    a: ({ href, children }) => (
                                        <a href={href} target="_blank" rel="noopener noreferrer" className="underline decoration-1 underline-offset-2 transition-colors text-[#37ca37] hover:text-[#2ca22c]">{children}</a>
                                    ),
                                    strong: ({ children }) => (
                                        <strong className="font-semibold text-white">{children}</strong>
                                    ),
                                    li: ({ children }) => (
                                        <li className="text-[12.5px] leading-relaxed">{children}</li>
                                    ),
                                    h1: ({ children }) => <h1 className="text-base font-semibold mt-3 mb-1 text-white">{children}</h1>,
                                    h2: ({ children }) => <h2 className="text-sm font-semibold mt-2 mb-1 text-white">{children}</h2>,
                                    h3: ({ children }) => <h3 className="text-sm font-medium mt-2 mb-0.5 text-white">{children}</h3>,
                                    code: ({ children, className: cn }) => cn
                                        ? <code className={cn}>{children}</code>
                                        : <code className="bg-[#031615] px-1 py-0.5 rounded text-[11px] font-mono">{children}</code>,
                                    pre: ({ children }) => <pre className="bg-[#031615] p-2 rounded-lg overflow-x-auto text-[11px] my-2 font-mono">{children}</pre>,
                                    blockquote: ({ children }) => <blockquote className="border-l-2 border-[#37ca37] pl-2 italic opacity-80 my-1">{children}</blockquote>,
                                }}
                            >
                                {content}
                            </ReactMarkdown>
                        </div>
                    </div>
                )}

                {showMeta && (
                    <div className={`flex items-center gap-2 mt-1 px-1 ${isBot ? '' : 'justify-end'}`}>
                        {timestamp && <span className="text-[10px] text-[#64748b] font-medium">{formatTime(timestamp)}</span>}
                        {isBot && !isError && content && (
                            <button onClick={handleCopy} className="opacity-0 group-hover:opacity-100 p-0.5 text-[#475569] hover:text-[#37ca37] transition-all duration-200" aria-label="Copy">
                                {copied ? <Check size={11} className="text-[#37ca37]" /> : <Copy size={11} />}
                            </button>
                        )}
                        {isBot && !isError && content && onSpeak && (
                            <button onClick={() => onSpeak(content)}
                                className={`p-0.5 transition-all duration-200 ${isSpeaking ? 'text-[#37ca37] opacity-100' : 'opacity-0 group-hover:opacity-100 text-[#475569] hover:text-[#37ca37]'}`}
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
                )}
            </div>

            {/* User Avatar — only on last message in group */}
            {!isBot && (showAvatar ? (
                <div className="w-7 h-7 rounded-xl flex items-center justify-center bg-[#37ca37] text-white flex-shrink-0 shadow-sm">
                    <User size={13} />
                </div>
            ) : <div className="w-7 flex-shrink-0" />)}
        </motion.div>
    );
}

export default memo(ChatMessage);
