import { useState, useRef, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageCircle, X, Send, Trash2, ImagePlus, Sparkles, Mic, MicOff } from 'lucide-preact';
import ChatMessage from './ChatMessage';
import MessageFeedback from './MessageFeedback';
import QuickReplies from './QuickReplies';
import useChat from '../hooks/useChat';
import useDrag from '../hooks/useDrag';
import useVoice from '../hooks/useVoice';

const POSITION_MAP = {
    'bottom-right': 'bottom-4 right-4 sm:bottom-6 sm:right-6 items-end',
    'bottom-left': 'bottom-4 left-4 sm:bottom-6 sm:left-6 items-start',
};

export function Widget({ config }) {
    const [isOpen, setIsOpen] = useState(false);
    const { messages, sendMessage, isLoading, isTyping, isOffline, retryLastMessage, clearMessages, sessionId } =
        useChat(config);
    const [inputValue, setInputValue] = useState('');
    const [selectedImage, setSelectedImage] = useState(null);
    const [expandedImage, setExpandedImage] = useState(null);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const fileInputRef = useRef(null);

    const position = config.design?.position || 'bottom-right';
    const positionClasses = POSITION_MAP[position] || POSITION_MAP['bottom-right'];
    const { offset, isDragging, onPointerDown, onPointerMove, onPointerUp, resetPosition, dragStyle } = useDrag(config.clientId);
    const { isListening, isSupported: voiceSupported, transcript, startListening, stopListening } = useVoice('uk-UA');

    const handleVoiceToggle = useCallback(() => {
        if (isListening) {
            stopListening();
        } else {
            startListening((finalText) => {
                setInputValue(prev => prev ? prev + ' ' + finalText : finalText);
                if (inputRef.current) inputRef.current.focus();
            });
        }
    }, [isListening, startListening, stopListening]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => { scrollToBottom(); }, [messages, isTyping]);
    useEffect(() => {
        if (isOpen && inputRef.current) setTimeout(() => inputRef.current?.focus(), 150);
    }, [isOpen]);
    useEffect(() => {
        if (!isOpen) return;
        const h = (e) => { if (e.key === 'Escape') expandedImage ? setExpandedImage(null) : setIsOpen(false); };
        document.addEventListener('keydown', h);
        return () => document.removeEventListener('keydown', h);
    }, [isOpen, expandedImage]);
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.style.height = 'auto';
            inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 100) + 'px';
        }
    }, [inputValue]);

    const handleImageSelect = useCallback((e) => {
        const file = e.target.files?.[0];
        if (!file || !file.type.startsWith('image/') || file.size > 10 * 1024 * 1024) return;
        setSelectedImage({ file, previewUrl: URL.createObjectURL(file) });
        if (fileInputRef.current) fileInputRef.current.value = '';
    }, []);

    const removeSelectedImage = useCallback(() => {
        if (selectedImage?.previewUrl) URL.revokeObjectURL(selectedImage.previewUrl);
        setSelectedImage(null);
    }, [selectedImage]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!inputValue.trim() && !selectedImage) return;
        const text = inputValue.trim() || (selectedImage ? 'Analyze this image' : '');
        if (selectedImage) {
            sendMessage(text, undefined, selectedImage.file);
            URL.revokeObjectURL(selectedImage.previewUrl);
            setSelectedImage(null);
        } else {
            sendMessage(text);
        }
        setInputValue('');
        if (inputRef.current) inputRef.current.style.height = 'auto';
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e); }
    };

    const showQuickReplies = messages.filter((m) => m.role === 'user').length === 0;

    return (
        <div className={`fixed z-50 flex flex-col gap-4 antialiased ${positionClasses}`} style={{ fontFamily: "\'Inter\', -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif", ...dragStyle }}>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                        className="relative w-[85vw] max-w-[370px] h-[60vh] max-h-[540px] sm:w-[370px] sm:h-[540px] rounded-3xl overflow-hidden flex flex-col bg-white shadow-2xl shadow-black/15 border border-gray-100"
                        role="dialog"
                        aria-label="Chat widget"
                    >
                        {/* HEADER */}
                        <div className="relative px-6 py-5 flex items-center justify-between overflow-hidden ">
                            <div className="absolute inset-0 bg-gradient-to-br from-[#222C4F] via-[#1B2440] to-[#0B1D4B]" />
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_60%)]" />

                            <div className="relative flex items-center gap-3">
                                <div className="relative">
                                    <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-inner shadow-white/10">
                                        <Sparkles size={18} className="text-white" />
                                    </div>
                                    {!isOffline && (
                                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#D2B589] border-[2.5px] border-[#222C4F] shadow-sm" />
                                    )}
                                </div>
                                <div>
                                    <h3 className="font-semibold text-[15px] text-white tracking-tight leading-tight">{config.botName || config.bot?.name}</h3>
                                    <p className="text-[11px] text-white/65 font-medium">{isOffline ? 'Offline' : 'Online'}</p>
                                </div>
                            </div>
                            <div className="relative flex items-center gap-1">
                                {messages.length > 0 && (
                                    <button onClick={clearMessages} className="p-2 hover:bg-white/15 rounded-xl text-white/50 hover:text-white transition-all duration-200" aria-label="Clear">
                                        <Trash2 size={14} />
                                    </button>
                                )}
                                <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/15 rounded-xl text-white/50 hover:text-white transition-all duration-200" aria-label="Close">
                                    <X size={16} />
                                </button>
                            </div>
                        </div>

                        {/* MESSAGES */}
                        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 scrollbar-hide bg-gradient-to-b from-gray-50/80 to-white" aria-live="polite">
                            <ChatMessage role="assistant" content={config.welcomeMessage || config.bot?.greeting} onImageClick={setExpandedImage} />
                            {messages.map((msg, idx) => (
                                <div key={idx}>
                                    <ChatMessage
                                        role={msg.role} content={msg.content} timestamp={msg.timestamp}
                                        isError={msg.isError} onRetry={msg.isError ? retryLastMessage : undefined}
                                        imageUrl={msg.imageUrl} onImageClick={setExpandedImage}
                                    />
                                    {msg.role === 'assistant' && !msg.isError && msg.content && config.features?.feedback !== false && (
                                        <MessageFeedback messageIndex={idx} sessionId={sessionId} clientId={config.clientId} />
                                    )}
                                </div>
                            ))}
                            {isTyping && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-1.5 items-center ml-10 py-2">
                                    {[0, 1, 2].map((i) => (
                                        <motion.span key={i} className="w-2 h-2 bg-[#D2B589] rounded-full"
                                            animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.8, 0.3] }}
                                            transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
                                        />
                                    ))}
                                </motion.div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* IMAGE PREVIEW */}
                        <AnimatePresence>
                            {selectedImage && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-4 overflow-hidden bg-white border-t border-gray-50">
                                    <div className="relative inline-block my-2.5">
                                        <img src={selectedImage.previewUrl} alt="" className="h-16 w-auto rounded-xl border border-gray-200 object-cover shadow-sm" />
                                        <button onClick={removeSelectedImage} className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white shadow-md transition-colors">
                                            <X size={10} />
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* INPUT */}
                        <div className="px-4 py-3.5 border-t border-gray-100 bg-white space-y-2.5">
                            {showQuickReplies && <QuickReplies options={config.quickReplies || config.features?.quickReplies?.starters} onSelect={(t) => sendMessage(t)} />}
                            <form onSubmit={handleSubmit} className="flex items-end gap-2">
                                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                                <button type="button" onClick={() => fileInputRef.current?.click()}
                                    className={`flex-shrink-0 p-2.5 rounded-xl border transition-all duration-200 ${selectedImage ? 'border-[#D2B589] bg-[#FAF6F0] text-[#222C4F] shadow-sm' : 'border-gray-200 text-gray-400 hover:text-[#222C4F] hover:border-[#D2B589] hover:bg-[#FAF6F0]'}`}
                                    aria-label="Upload photo">
                                    <ImagePlus size={16} />
                                </button>
                                {voiceSupported && config.features?.voiceInput !== false && (
                                    <button type="button" onClick={handleVoiceToggle}
                                        className={`flex-shrink-0 p-2.5 rounded-xl border transition-all duration-200 ${isListening ? 'border-[#D2B589] bg-[#FAF6F0] text-[#222C4F] shadow-sm animate-pulse' : 'border-gray-200 text-gray-400 hover:text-[#222C4F] hover:border-[#D2B589] hover:bg-[#FAF6F0]'}`}
                                        aria-label={isListening ? 'Stop recording' : 'Voice input'}>
                                        {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                                    </button>
                                )}
                                <textarea ref={inputRef} value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={handleKeyDown}
                                    placeholder="Ask a question..."
                                    rows={1}
                                    className="flex-1 min-w-0 bg-gray-50/80 text-gray-800 placeholder-gray-400 rounded-xl py-2.5 pl-3.5 pr-3.5 border border-gray-200 focus:outline-none focus:border-[#D2B589] focus:ring-2 focus:ring-[#FAF6F0] focus:bg-white transition-all resize-none text-[13.5px] leading-relaxed"
                                    style={{ maxHeight: '100px' }}
                                />
                                <button type="submit" disabled={(!inputValue.trim() && !selectedImage) || isLoading}
                                    className="flex-shrink-0 w-9 h-9 rounded-xl bg-[#222C4F] text-white flex items-center justify-center hover:bg-[#1B2440] active:scale-95 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed shadow-md shadow-[#222C4F]/25">
                                    <Send size={16} />
                                </button>
                            </form>
                        </div>

                        {/* EXPANDED IMAGE */}
                        <AnimatePresence>
                            {expandedImage && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    className="absolute inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 rounded-3xl"
                                    onClick={() => setExpandedImage(null)}>
                                    <motion.img initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}
                                        src={expandedImage} alt="" className="max-w-full max-h-full rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()} />
                                    <button onClick={() => setExpandedImage(null)} className="absolute top-4 right-4 p-2 bg-white/15 hover:bg-white/25 rounded-xl text-white transition-all">
                                        <X size={16} />
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* TOGGLE BUTTON */}
            <motion.button
                whileHover={isDragging ? {} : { scale: 1.08, boxShadow: '0 8px 30px rgba(34, 44, 79, 0.35)' }}
                whileTap={isDragging ? {} : { scale: 0.92 }}
                onClick={() => { if (!isDragging) setIsOpen(!isOpen); }}
                onDoubleClick={resetPosition}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                className="w-[58px] h-[58px] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-[#222C4F]/30 bg-gradient-to-br from-[#222C4F] via-[#1B2440] to-[#0B1D4B] border border-white/10"
                aria-label={isOpen ? 'Close chat' : 'Open chat'}
            >
                <AnimatePresence mode="wait">
                    {isOpen ? (
                        <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
                            <X size={22} strokeWidth={2.5} />
                        </motion.div>
                    ) : (
                        <motion.div key="chat" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} transition={{ duration: 0.2 }}>
                            <MessageCircle size={22} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.button>
        </div>
    );
}
