import { useState, useEffect, useRef } from 'preact/hooks';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageCircle, X, Send } from 'lucide-preact';
import clsx from 'clsx';
import { useChat } from '../hooks/useChat';
import { ChatMessage } from './ChatMessage';

export function Widget({ config }) {
    const [isOpen, setIsOpen] = useState(false);
    const {
        messages,
        sendMessage,
        isLoading,
        typing,
        starters
    } = useChat(config);

    const [inputValue, setInputValue] = useState('');
    const messagesEndRef = useRef(null);

    const toggleOpen = () => setIsOpen(!isOpen);

    const handleSend = () => {
        if (!inputValue.trim()) return;
        sendMessage(inputValue);
        setInputValue('');
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleSend();
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(scrollToBottom, [messages, typing]);

    const style = {
        '--aw-primary': config.theme.primary,
        '--aw-accent': config.theme.accent,
    };

    return (
        <div style={style} className={clsx("fixed bottom-5 right-5 z-[9999] font-sans text-gray-900 antialiased", config.design?.position === 'bottom-left' && 'left-5 right-auto')}>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: "spring", bounce: 0.3 }}
                        className={clsx(
                            "absolute bottom-20 right-0 w-[380px] h-[600px] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-white/20",
                            config.design?.style === 'glass' && "backdrop-blur-xl bg-white/80",
                            config.design?.style === 'neon' && "bg-[#0a0a0f] text-white border-cyan-500/30 shadow-[0_0_40px_rgba(0,217,255,0.2)]"
                        )}
                    >
                        {/* Header */}
                        <div className={clsx(
                            "p-4 flex items-center gap-3 border-b",
                            config.design?.style === 'neon' ? "border-white/10 bg-white/5" : "border-gray-100 bg-white"
                        )}>
                            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-xl text-white">
                                {config.bot.avatar}
                            </div>
                            <div>
                                <h3 className={clsx("font-bold text-base", config.design?.style === 'neon' ? "text-white" : "text-gray-900")}>
                                    {config.bot.name}
                                </h3>
                                <span className="flex items-center gap-1.5 text-xs text-primary font-medium">
                                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                    Online
                                </span>
                            </div>
                            <button
                                onClick={toggleOpen}
                                className="ml-auto p-2 hover:bg-black/5 rounded-full transition-colors"
                            >
                                <X size={20} className={config.design?.style === 'neon' ? "text-gray-400" : "text-gray-500"} />
                            </button>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
                            {messages.map((msg, i) => (
                                <ChatMessage key={i} message={msg} config={config} />
                            ))}

                            {typing && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex gap-1.5 p-3 bg-gray-100 dark:bg-white/10 rounded-2xl rounded-tl-none w-fit"
                                >
                                    <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-2 h-2 bg-gray-400 rounded-full" />
                                    <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.1 }} className="w-2 h-2 bg-gray-400 rounded-full" />
                                    <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-2 h-2 bg-gray-400 rounded-full" />
                                </motion.div>
                            )}

                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div className={clsx(
                            "p-4 border-t flex items-center gap-2",
                            config.design?.style === 'neon' ? "border-white/10 bg-white/5" : "border-gray-100 bg-white"
                        )}>
                            <div className="relative flex-1">
                                <input
                                    type="text"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Type a message..."
                                    className={clsx(
                                        "w-full px-4 py-3 rounded-full text-sm outline-none transition-all border",
                                        config.design?.style === 'neon'
                                            ? "bg-black/20 border-white/10 text-white placeholder-gray-500 focus:border-primary/50"
                                            : "bg-gray-50 border-transparent text-gray-900 focus:bg-white focus:border-primary/30"
                                    )}
                                />
                            </div>
                            <button
                                onClick={handleSend}
                                disabled={!inputValue.trim() || isLoading}
                                className={clsx(
                                    "w-10 h-10 rounded-full flex items-center justify-center transition-all disabled:opacity-50",
                                    "bg-gradient-to-tr from-primary to-accent text-white shadow-lg hover:shadow-xl hover:scale-105"
                                )}
                            >
                                <Send size={18} />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={toggleOpen}
                className="w-14 h-14 rounded-full bg-gradient-to-tr from-primary to-accent shadow-lg shadow-primary/30 flex items-center justify-center text-white"
            >
                <AnimatePresence mode='wait'>
                    {isOpen ? (
                        <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
                            <X size={26} />
                        </motion.div>
                    ) : (
                        <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
                            <MessageCircle size={26} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.button>
        </div>
    );
}
