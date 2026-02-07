import { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageCircle, X, Send, Trash2 } from 'lucide-preact';
import ChatMessage from './ChatMessage';
import MessageFeedback from './MessageFeedback';
import QuickReplies from './QuickReplies';
import useChat from '../hooks/useChat';

const POSITION_MAP = {
    'bottom-right': 'bottom-4 right-4 sm:bottom-6 sm:right-6 items-end',
    'bottom-left': 'bottom-4 left-4 sm:bottom-6 sm:left-6 items-start',
};

export function Widget({ config }) {
    const [isOpen, setIsOpen] = useState(false);
    const { messages, sendMessage, isLoading, isTyping, isOffline, retryLastMessage, clearMessages, sessionId } =
        useChat(config);
    const [inputValue, setInputValue] = useState('');
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    const position = config.design?.position || 'bottom-right';
    const positionClasses = POSITION_MAP[position] || POSITION_MAP['bottom-right'];

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    // Focus input when widget opens
    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    // Escape to close
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') setIsOpen(false);
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    // Auto-resize textarea
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.style.height = 'auto';
            inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + 'px';
        }
    }, [inputValue]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!inputValue.trim()) return;
        sendMessage(inputValue);
        setInputValue('');
        if (inputRef.current) inputRef.current.style.height = 'auto';
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    const handleQuickReply = (text) => {
        sendMessage(text);
    };

    // Show quick replies only when no user messages yet
    const showQuickReplies = messages.filter((m) => m.role === 'user').length === 0;

    // Glassmorphism & 3D Tokens (Emerald)
    const glassStyle =
        'bg-emerald-900/80 backdrop-blur-xl border border-white/20 shadow-2xl shadow-emerald-500/20';
    const gradientText = 'bg-clip-text text-transparent bg-gradient-to-r from-emerald-200 to-teal-100';

    return (
        <div
            className={`fixed z-50 flex flex-col gap-4 font-sans antialiased text-white selection:bg-emerald-500/30 ${positionClasses}`}
        >
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                        className={`w-[90vw] max-w-[400px] h-[80vh] max-h-[600px] sm:w-[400px] sm:h-[600px] rounded-3xl overflow-hidden flex flex-col ${glassStyle}`}
                        role="dialog"
                        aria-label="Chat widget"
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-400 to-teal-600 p-[2px] shadow-lg shadow-emerald-500/30">
                                        <img
                                            src={config.bot.avatar}
                                            alt=""
                                            className="w-full h-full rounded-full bg-black/20"
                                        />
                                    </div>
                                    <div
                                        className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-emerald-900 ${
                                            isOffline ? 'bg-red-400' : 'bg-green-400 animate-pulse'
                                        }`}
                                    />
                                </div>
                                <div>
                                    <h3 className={`font-bold text-lg ${gradientText}`}>{config.bot.name}</h3>
                                    <p className="text-xs text-emerald-200/70">
                                        {isOffline ? 'Offline' : 'Online \u00B7 Reply time: <1m'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                {messages.length > 0 && (
                                    <button
                                        onClick={clearMessages}
                                        className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/40 hover:text-white/70"
                                        aria-label="New conversation"
                                        title="New conversation"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/70 hover:text-white"
                                    aria-label="Close chat"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div
                            className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
                            aria-live="polite"
                            aria-label="Chat messages"
                        >
                            <div className="text-center text-xs text-white/30 my-4">Today</div>

                            {/* Bot Greeting */}
                            <ChatMessage role="assistant" content={config.bot.greeting} avatar={config.bot.avatar} />

                            {messages.map((msg, idx) => (
                                <div key={idx}>
                                    <ChatMessage
                                        role={msg.role}
                                        content={msg.content}
                                        avatar={config.bot.avatar}
                                        timestamp={msg.timestamp}
                                        isError={msg.isError}
                                        onRetry={msg.isError ? retryLastMessage : undefined}
                                    />
                                    {msg.role === 'assistant' &&
                                        !msg.isError &&
                                        msg.content &&
                                        config.features?.feedback !== false && (
                                            <MessageFeedback
                                                messageIndex={idx}
                                                sessionId={sessionId}
                                                clientId={config.clientId}
                                            />
                                        )}
                                </div>
                            ))}

                            {isTyping && (
                                <motion.div
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex gap-2 items-center text-xs text-white/40 ml-12"
                                >
                                    <span
                                        className="w-2 h-2 bg-emerald-400/50 rounded-full animate-bounce"
                                        style={{ animationDelay: '0ms' }}
                                    />
                                    <span
                                        className="w-2 h-2 bg-emerald-400/50 rounded-full animate-bounce"
                                        style={{ animationDelay: '150ms' }}
                                    />
                                    <span
                                        className="w-2 h-2 bg-emerald-400/50 rounded-full animate-bounce"
                                        style={{ animationDelay: '300ms' }}
                                    />
                                    <span>typing...</span>
                                </motion.div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-4 bg-white/5 border-t border-white/10 space-y-3">
                            {showQuickReplies && (
                                <QuickReplies
                                    options={config.features?.quickReplies?.starters}
                                    onSelect={handleQuickReply}
                                />
                            )}

                            <form onSubmit={handleSubmit} className="relative flex items-center gap-2">
                                <textarea
                                    ref={inputRef}
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Ask a question..."
                                    rows={1}
                                    className="w-full bg-black/20 text-white placeholder-white/30 rounded-2xl py-3 pl-4 pr-12 border border-white/5 focus:outline-none focus:border-emerald-500/50 focus:bg-black/30 transition-all shadow-inner resize-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
                                    aria-label="Type a message"
                                    style={{ maxHeight: '120px' }}
                                />
                                <button
                                    type="submit"
                                    disabled={!inputValue.trim() || isLoading}
                                    className="absolute right-2 p-3 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    aria-label="Send message"
                                >
                                    <Send size={18} />
                                </button>
                            </form>
                            <div className="text-center text-[10px] text-white/20">
                                Powered by <span className="font-semibold text-white/30">Antigravity AI</span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Toggle Button */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className="w-14 h-14 rounded-full flex items-center justify-center text-white shadow-2xl shadow-emerald-500/40 transition-all bg-gradient-to-tr from-emerald-500 to-teal-500 border border-white/20"
                aria-label={isOpen ? 'Close chat' : 'Open chat'}
            >
                <AnimatePresence mode="wait">
                    {isOpen ? (
                        <motion.div
                            key="close"
                            initial={{ rotate: -90, opacity: 0 }}
                            animate={{ rotate: 0, opacity: 1 }}
                            exit={{ rotate: 90, opacity: 0 }}
                        >
                            <X size={28} />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="chat"
                            initial={{ rotate: 90, opacity: 0 }}
                            animate={{ rotate: 0, opacity: 1 }}
                            exit={{ rotate: -90, opacity: 0 }}
                        >
                            <MessageCircle size={28} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.button>
        </div>
    );
}
