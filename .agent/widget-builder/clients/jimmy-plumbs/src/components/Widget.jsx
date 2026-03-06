import { useState, useRef, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageCircle, X, Send, Trash2, ImagePlus, Sparkles, Mic, MicOff, ChevronDown, Phone, Mail, Globe, MoreVertical, ArrowDown, Type, Download, Volume2, VolumeX } from 'lucide-preact';
import ChatMessage from './ChatMessage';
import MessageFeedback from './MessageFeedback';
import QuickReplies from './QuickReplies';
import RichBlocks from './RichBlocks';
import useChat from '../hooks/useChat';
import useDrag from '../hooks/useDrag';
import useVoice from '../hooks/useVoice';
import useProactive from '../hooks/useProactive';
import useLanguage from '../hooks/useLanguage';
import useTTS from '../hooks/useTTS';

const POSITION_MAP = {
    'bottom-right': 'bottom-4 right-4 sm:bottom-6 sm:right-6 items-end',
    'bottom-left': 'bottom-4 left-4 sm:bottom-6 sm:left-6 items-start',
};

export function Widget({ config }) {
    const [isOpen, setIsOpen] = useState(false);
    const { messages, sendMessage, isLoading, isTyping, isOffline, retryLastMessage, clearMessages, sessionId, isReturningUser } =
        useChat(config);
    const [inputValue, setInputValue] = useState('');
    const [selectedImage, setSelectedImage] = useState(null);
    const [expandedImage, setExpandedImage] = useState(null);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const fileInputRef = useRef(null);

    // Typewriter welcome
    const rawWelcome = config.welcomeMessage || config.bot?.greeting || '';
    const welcomeMsg = rawWelcome.length > 180 ? rawWelcome.slice(0, 177) + '...' : rawWelcome;
    const [typewriterText, setTypewriterText] = useState('');
    const [typewriterDone, setTypewriterDone] = useState(false);

    // New messages pill
    const chatContainerRef = useRef(null);
    const isAtBottomRef = useRef(true);
    const [isAtBottom, setIsAtBottom] = useState(true);
    const [hasNewMessages, setHasNewMessages] = useState(false);

    // Header quick actions menu
    // Context banner
    const [contextDismissed, setContextDismissed] = useState(() => {
        try { return sessionStorage.getItem('aw-ctx-' + config.clientId) === '1'; } catch { return false; }
    });
    const pageTitle = typeof document !== 'undefined' ? (document.title || '').replace(/\s*[-|–].*$/, '').trim() : '';

    const [showMenu, setShowMenu] = useState(false);
    const [isMuted, setIsMuted] = useState(() => {
        try { const v = localStorage.getItem('aw-muted-' + config.clientId) === 'true'; window.__WIDGET_MUTED__ = v; return v; } catch { return false; }
    });
    const [chatFontSize, setChatFontSize] = useState(() => {
        try { return localStorage.getItem('aw-fontsize-' + config.clientId) || 'md'; } catch { return 'md'; }
    });
    const menuRef = useRef(null);

    // Contact bar
    const contacts = config.contacts;

    // Auto language detection + dynamic UI strings
    const { lang, detect: detectLang, ui: uiStrings, voiceLocale } = useLanguage(config.clientId);

    // Text-to-Speech
    const { speak, speakingIdx, isSupported: ttsSupported } = useTTS();

    // Proactive nudge bubble
    const { showNudge, nudgeMessage, unreadCount, dismissNudge } = useProactive(config, isOpen);

    // Mobile bottom sheet detection
    const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 640 : false);
    const swipeStartRef = useRef(0);
    const [swipeY, setSwipeY] = useState(0);

    useEffect(() => {
        const onResize = () => setIsMobile(window.innerWidth < 640);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    const position = config.design?.position || 'bottom-right';
    const positionClasses = POSITION_MAP[position] || POSITION_MAP['bottom-right'];
    const { offset, isDragging, onPointerDown, onPointerMove, onPointerUp, resetPosition, dragStyle } = useDrag(config.clientId);
    const { isListening, isSupported: voiceSupported, transcript, startListening, stopListening } = useVoice(voiceLocale);

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

    // Mobile swipe-to-close handlers
    const swipeStartTime = useRef(0);
    const handleSwipeStart = useCallback((e) => {
        swipeStartRef.current = e.touches[0].clientY;
        swipeStartTime.current = Date.now();
    }, []);
    const handleSwipeMove = useCallback((e) => {
        const diff = e.touches[0].clientY - swipeStartRef.current;
        if (diff > 0) { setSwipeY(diff); e.preventDefault(); }
    }, []);
    const handleSwipeEnd = useCallback(() => {
        const elapsed = Date.now() - swipeStartTime.current;
        const velocity = swipeY / Math.max(elapsed, 1);
        if (swipeY > 80 || velocity > 0.5) setIsOpen(false);
        setSwipeY(0);
        swipeStartRef.current = 0;
    }, [swipeY]);

    // Keyboard-aware resize for mobile (visualViewport API)
    const panelRef = useRef(null);
    useEffect(() => {
        if (!isMobile || !isOpen) return;
        const vv = window.visualViewport;
        if (!vv) return;
        const onResize = () => {
            if (panelRef.current) panelRef.current.style.height = vv.height + 'px';
        };
        vv.addEventListener('resize', onResize);
        return () => vv.removeEventListener('resize', onResize);
    }, [isMobile, isOpen]);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        setHasNewMessages(false);
    }, []);

    // Smart scroll: only auto-scroll if user is near bottom
    useEffect(() => {
        if (isAtBottomRef.current) scrollToBottom();
        else if (messages.length > 0) setHasNewMessages(true);
    }, [messages, isTyping, scrollToBottom]);

    // Scroll tracking for new messages pill
    const handleChatScroll = useCallback(() => {
        const el = chatContainerRef.current;
        if (!el) return;
        const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
        isAtBottomRef.current = atBottom;
        setIsAtBottom(atBottom);
        if (atBottom) setHasNewMessages(false);
    }, []);

    // Typewriter effect for welcome message
    useEffect(() => {
        if (!isOpen || typewriterDone) return;
        let i = 0;
        const timer = setInterval(() => {
            i++;
            setTypewriterText(welcomeMsg.slice(0, i));
            if (i >= welcomeMsg.length) {
                clearInterval(timer);
                setTypewriterDone(true);
            }
        }, 18);
        return () => clearInterval(timer);
    }, [isOpen, typewriterDone, welcomeMsg]);

    // Header menu: close on outside click (composedPath for Shadow DOM)
    useEffect(() => {
        if (!showMenu) return;
        const handler = (e) => { if (menuRef.current && !e.composedPath().includes(menuRef.current)) setShowMenu(false); };
        document.addEventListener('pointerdown', handler);
        return () => document.removeEventListener('pointerdown', handler);
    }, [showMenu]);

    // Mute toggle persistence
    const toggleMute = useCallback(() => {
        setIsMuted(v => {
            const next = !v;
            try { localStorage.setItem('aw-muted-' + config.clientId, String(next)); } catch {}
            window.__WIDGET_MUTED__ = next;
            return next;
        });
    }, [config.clientId]);

    // Font size cycling
    const cycleFontSize = useCallback(() => {
        setChatFontSize(f => {
            const next = f === 'sm' ? 'md' : f === 'md' ? 'lg' : 'sm';
            try { localStorage.setItem('aw-fontsize-' + config.clientId, next); } catch {}
            return next;
        });
    }, [config.clientId]);

    // Export chat to file
    const exportChat = useCallback(() => {
        const lines = messages.map(m => (m.role === 'user' ? 'You' : (config.botName || 'AI')) + ': ' + m.content);
        const blob = new Blob([lines.join('\n\n')], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'chat.txt'; a.click();
        URL.revokeObjectURL(url);
        setShowMenu(false);
    }, [messages, config.botName]);

    useEffect(() => {
        if (isOpen && inputRef.current) setTimeout(() => inputRef.current?.focus(), 150);
    }, [isOpen]);
    useEffect(() => {
        if (!isOpen) return;
        const h = (e) => { if (e.key === 'Escape') expandedImage ? setExpandedImage(null) : showMenu ? setShowMenu(false) : setIsOpen(false); };
        document.addEventListener('keydown', h);
        return () => document.removeEventListener('keydown', h);
    }, [isOpen, expandedImage, showMenu]);
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
        detectLang(text);
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

    // Handle rich block actions (cards, buttons, forms)
    const handleRichAction = useCallback((urlOrType, label) => {
        if (urlOrType === 'form_submit') {
            sendMessage(label);
        } else if (urlOrType?.startsWith('http')) {
            window.open(urlOrType, '_blank', 'noopener');
        } else {
            sendMessage(label);
        }
    }, [sendMessage]);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e); }
    };

    const showQuickReplies = messages.filter((m) => m.role === 'user').length === 0;

    // Day separator helper
    const getDayLabel = useCallback((ts) => {
        if (!ts) return '';
        const d = new Date(ts);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const yesterday = today - 86400000;
        const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
        if (msgDay === today) return uiStrings.today;
        if (msgDay === yesterday) return uiStrings.yesterday;
        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }, [uiStrings]);

    const getTimeLabel = useCallback((ts) => {
        if (!ts) return '';
        return new Date(ts).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    }, []);

    const shouldShowSeparator = useCallback((idx) => {
        if (idx === 0) return true;
        const curr = messages[idx]?.timestamp;
        const prev = messages[idx - 1]?.timestamp;
        if (!curr || !prev) return false;
        const currDay = new Date(curr).toDateString();
        const prevDay = new Date(prev).toDateString();
        return currDay !== prevDay;
    }, [messages]);

    // Chat panel content (shared between mobile & desktop)
    const chatContent = (
        <>
            {/* Mobile swipe handle */}
            {isMobile && (
                <div className="flex justify-center pt-2 pb-0.5 cursor-grab active:cursor-grabbing bg-white"
                    onTouchStart={handleSwipeStart} onTouchMove={handleSwipeMove} onTouchEnd={handleSwipeEnd}>
                    <div className="w-10 h-1 rounded-full bg-gray-300" />
                </div>
            )}

            {/* HEADER */}
            <div className="relative px-5 py-4 flex items-center justify-between ">
                <div className="absolute inset-0 bg-gradient-to-br from-[#1565C0] via-[#2c74c6] to-[#0288D1]" />
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_60%)]" />

                <div className="relative flex items-center gap-3">
                    <div className="relative">
                        <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-inner shadow-white/10">
                            <Sparkles size={18} className="text-white" />
                        </div>
                        {!isOffline && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#b9d1ec] border-[2.5px] border-[#1565C0] shadow-sm" />
                        )}
                    </div>
                    <div>
                        <h3 className="font-semibold text-[14px] text-white tracking-tight leading-tight truncate max-w-[140px] sm:max-w-[180px]">{config.botName || config.bot?.name}</h3>
                        <p className="text-[11px] text-white/65 font-medium flex items-center gap-1">
                            {isOffline ? uiStrings.offline : (<><span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />{uiStrings.respondsInstantly}</>)}
                        </p>
                    </div>
                </div>
                <div className="relative flex items-center gap-1">
                    <div className="relative" ref={menuRef}>
                        <button onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                            className="p-2 hover:bg-white/15 rounded-xl text-white/50 hover:text-white transition-all duration-200" aria-label="Menu">
                            <MoreVertical size={15} />
                        </button>
                        {showMenu && (
                            <div className="absolute right-0 top-full mt-1.5 w-[168px] rounded-2xl shadow-xl border overflow-hidden z-50 bg-white/95 border-gray-200/80" style={{ backdropFilter: 'blur(16px)' }}>
                                <button onClick={() => { clearMessages(); setShowMenu(false); }}
                                    className="w-full px-3.5 py-2.5 text-left text-[12px] font-medium flex items-center gap-2.5 transition-colors text-gray-700 hover:bg-gray-50">
                                    <Trash2 size={13} /> {uiStrings.newChat}
                                </button>
                                <button onClick={() => { toggleMute(); setShowMenu(false); }}
                                    className="w-full px-3.5 py-2.5 text-left text-[12px] font-medium flex items-center gap-2.5 transition-colors text-gray-700 hover:bg-gray-50">
                                    {isMuted ? <Volume2 size={13} /> : <VolumeX size={13} />} {isMuted ? uiStrings.unmute : uiStrings.mute}
                                </button>
                                <button onClick={() => { cycleFontSize(); }}
                                    className="w-full px-3.5 py-2.5 text-left text-[12px] font-medium flex items-center justify-between transition-colors text-gray-700 hover:bg-gray-50">
                                    <span className="flex items-center gap-2.5"><Type size={13} /> {uiStrings.fontSize}</span>
                                    <span className="text-[10px] opacity-60 font-bold tracking-wider">{chatFontSize.toUpperCase()}</span>
                                </button>
                                {messages.length > 0 && (
                                    <button onClick={exportChat}
                                        className="w-full px-3.5 py-2.5 text-left text-[12px] font-medium flex items-center gap-2.5 transition-colors text-gray-700 hover:bg-gray-50">
                                        <Download size={13} /> {uiStrings.exportChat}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                    <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/15 rounded-xl text-white/50 hover:text-white transition-all duration-200" aria-label="Close">
                        {isMobile ? <ChevronDown size={18} /> : <X size={16} />}
                    </button>
                </div>
            </div>

            {/* CONTACT BAR */}
            {contacts && Object.keys(contacts).length > 0 && (
                <div className="flex items-center gap-1.5 px-4 py-1.5 border-b overflow-x-auto scrollbar-hide bg-gray-50/60 border-gray-100">
                    {contacts.phone && (
                        <a href={'tel:' + contacts.phone} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[12px] font-medium transition-all whitespace-nowrap text-gray-500 hover:text-[#1565C0] hover:bg-white" target="_blank" rel="noopener">
                            <Phone size={12} /> {uiStrings.call}
                        </a>
                    )}
                    {contacts.email && (
                        <a href={'mailto:' + contacts.email} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[12px] font-medium transition-all whitespace-nowrap text-gray-500 hover:text-[#1565C0] hover:bg-white">
                            <Mail size={12} /> Email
                        </a>
                    )}
                    {contacts.website && (
                        <a href={contacts.website} target="_blank" rel="noopener" className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[12px] font-medium transition-all whitespace-nowrap text-gray-500 hover:text-[#1565C0] hover:bg-white">
                            <Globe size={12} /> {uiStrings.website}
                        </a>
                    )}
                </div>
            )}

            {/* CONTEXT BANNER */}
            {pageTitle && !contextDismissed && messages.length === 0 && (
                <div className="flex items-center gap-2 px-4 py-2 border-b bg-[#1565C0]/5 border-[#1565C0]/10 text-gray-700">
                    <Globe size={13} className="text-[#1565C0]" />
                    <span className="flex-1 text-[11.5px] font-medium truncate">{uiStrings.contextBanner}: <strong>{pageTitle}</strong></span>
                    <button onClick={() => { setContextDismissed(true); try { sessionStorage.setItem('aw-ctx-' + config.clientId, '1'); } catch {} }}
                        className="p-0.5 text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={12} />
                    </button>
                </div>
            )}

            {/* MESSAGES */}
            <div ref={chatContainerRef} onScroll={handleChatScroll}
                className={`flex-1 overflow-y-auto px-4 py-4 space-y-1 scrollbar-hide chat-pattern font-${chatFontSize}`} aria-live="polite">
                <ChatMessage role="assistant" content={typewriterDone ? welcomeMsg : typewriterText} onImageClick={setExpandedImage}
                    onSpeak={ttsSupported && typewriterDone ? () => speak(welcomeMsg, lang, -1) : null} isSpeaking={speakingIdx === -1} />
                {messages.map((msg, idx) => (
                    <div key={idx}>
                        {shouldShowSeparator(idx) && msg.timestamp && (
                            <div className="flex items-center gap-3 my-3">
                                <div className="flex-1 h-px bg-gray-200/70" />
                                <span className="text-[10px] font-medium text-gray-400 whitespace-nowrap">{getDayLabel(msg.timestamp)}</span>
                                <div className="flex-1 h-px bg-gray-200/70" />
                            </div>
                        )}
                        <ChatMessage
                            role={msg.role} content={msg.content} timestamp={msg.timestamp}
                            isError={msg.isError} onRetry={msg.isError ? retryLastMessage : undefined}
                            imageUrl={msg.imageUrl} onImageClick={setExpandedImage}
                            onSpeak={msg.role === 'assistant' && ttsSupported ? () => speak(msg.content, lang, idx) : null}
                            isSpeaking={speakingIdx === idx}
                        />
                        {msg.role === 'assistant' && !msg.isError && msg.content && config.features?.feedback !== false && (
                            <MessageFeedback messageIndex={idx} sessionId={sessionId} clientId={config.clientId} />
                        )}
                        {/* Rich interactive blocks (cards, carousel, forms) */}
                        {msg.role === 'assistant' && msg.richBlocks?.length > 0 && (
                            <RichBlocks blocks={msg.richBlocks} onAction={handleRichAction} />
                        )}
                        {/* Follow-up suggestions */}
                        {msg.role === 'assistant' && !msg.isError && msg.suggestions?.length > 0 && idx === messages.length - 1 && (
                            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                                className="flex flex-wrap gap-1.5 ml-7 sm:ml-9 mt-2 mb-1">
                                {msg.suggestions.map((s, si) => (
                                    <button key={si} onClick={() => { detectLang(s); sendMessage(s); }}
                                        className="px-2.5 py-1.5 rounded-lg border text-[12px] font-medium transition-all duration-200 cursor-pointer border-[#a1c1e6] bg-[#e8f0f9] text-[#1256a3] hover:bg-[#b9d1ec] hover:border-[#73a3d9]">
                                        {s}
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </div>
                ))}
                {isTyping && (
                    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-2 py-2">
                        <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#e8f0f9] to-[#b9d1ec] flex items-center justify-center flex-shrink-0 shadow-sm border border-[#a1c1e6]/50">
                            <Sparkles size={13} className="text-[#1565C0]" />
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-[11px] font-medium text-gray-400 ml-1">{config.botName || 'AI'} {uiStrings.isTyping}</span>
                            <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-tl-md px-4 py-3 flex items-center gap-1.5">
                                <span className="typing-dot" />
                                <span className="typing-dot" />
                                <span className="typing-dot" />
                            </div>
                        </div>
                    </motion.div>
                )}
                {/* New messages pill */}
                {hasNewMessages && !isAtBottom && (
                    <div className="sticky bottom-2 left-0 right-0 flex justify-center z-10">
                        <button onClick={scrollToBottom}
                            className="new-msg-pill px-3.5 py-1.5 rounded-full text-[12px] font-semibold shadow-lg flex items-center gap-1.5 cursor-pointer transition-all hover:shadow-xl bg-white text-gray-700 border border-gray-200 shadow-black/10">
                            <ArrowDown size={12} /> {uiStrings.newMessages}
                        </button>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* IMAGE PREVIEW */}
            <AnimatePresence>
                {selectedImage && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-4 overflow-hidden bg-white border-t border-gray-50">
                        <div className="relative inline-block my-2.5">
                            <img src={selectedImage.previewUrl} alt="" className="h-16 w-auto rounded-xl border border-gray-200 object-cover shadow-sm" />
                            <button onClick={removeSelectedImage} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white shadow-md transition-colors">
                                <X size={11} />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* INPUT */}
            <div className="px-4 pt-2 pb-3 border-t border-gray-100 bg-white space-y-1.5 safe-area-bottom">
                {showQuickReplies && <QuickReplies options={config.quickReplies || config.features?.quickReplies?.starters} onSelect={(t) => sendMessage(t)} />}
                <form onSubmit={handleSubmit} className="flex items-end gap-2">
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                    <button type="button" onClick={() => fileInputRef.current?.click()}
                        className={`flex-shrink-0 p-2.5 rounded-xl border transition-all duration-200 ${selectedImage ? 'border-[#73a3d9] bg-[#e8f0f9] text-[#1565C0] shadow-sm' : 'border-gray-200 text-gray-400 hover:text-[#1565C0] hover:border-[#73a3d9] hover:bg-[#e8f0f9]'}`}
                        aria-label="Upload photo">
                        <ImagePlus size={16} />
                    </button>
                    {voiceSupported && config.features?.voiceInput !== false && (
                        <button type="button" onClick={handleVoiceToggle}
                            className={`flex-shrink-0 p-2.5 rounded-xl border transition-all duration-200 ${isListening ? 'border-[#73a3d9] bg-[#e8f0f9] text-[#1565C0] shadow-sm animate-pulse' : 'border-gray-200 text-gray-400 hover:text-[#1565C0] hover:border-[#73a3d9] hover:bg-[#e8f0f9]'}`}
                            aria-label={isListening ? 'Stop recording' : 'Voice input'}>
                            {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                        </button>
                    )}
                    <textarea ref={inputRef} value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={handleKeyDown}
                        placeholder={uiStrings.placeholder}
                        rows={1}
                        className="flex-1 min-w-0 bg-gray-50/80 text-gray-800 placeholder-gray-400 rounded-xl py-2.5 pl-3.5 pr-3.5 border border-gray-200 focus:outline-none focus:border-[#73a3d9] focus:ring-2 focus:ring-[#e8f0f9] focus:bg-white transition-all resize-none text-[13.5px] leading-relaxed"
                        style={{ maxHeight: '100px' }}
                    />
                    <button type="submit" disabled={(!inputValue.trim() && !selectedImage) || isLoading}
                        className="flex-shrink-0 w-9 h-9 rounded-xl bg-[#1565C0] text-white flex items-center justify-center hover:bg-[#1256a3] active:scale-95 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed shadow-md shadow-[#1565C0]/25">
                        <Send size={16} />
                    </button>
                </form>
            </div>

            {/* POWERED BY */}
            <div className="flex justify-center py-1.5 bg-gray-50/50">
                <a href="https://winbix-ai.xyz" target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[10px] font-medium text-gray-400 hover:text-gray-500 transition-colors opacity-70 hover:opacity-100">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                    Powered by WinBix AI
                </a>
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
        </>
    );

    return (
        <>
            {/* Feature 4: Mobile backdrop overlay */}
            <AnimatePresence>
                {isMobile && isOpen && (
                    <motion.div key="backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[9998] bg-black/50" onClick={() => setIsOpen(false)} />
                )}
            </AnimatePresence>

            <div className={`fixed z-[9999] flex flex-col gap-3 antialiased ${positionClasses}`} style={{ fontFamily: "-apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif", ...(isMobile && isOpen ? {} : dragStyle) }}>
                {/* Chat panel */}
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            key="chat-panel"
                            initial={isMobile ? { y: '100%' } : { opacity: 0, y: 20, scale: 0.95 }}
                            animate={isMobile ? { y: swipeY > 0 ? swipeY : 0 } : { opacity: 1, y: 0, scale: 1 }}
                            exit={isMobile ? { y: '100%' } : { opacity: 0, y: 20, scale: 0.95 }}
                            transition={{ type: 'spring', stiffness: 300, damping: isMobile ? 30 : 25 }}
                            className={isMobile
                                ? 'fixed inset-x-0 bottom-0 flex flex-col bg-white shadow-2xl shadow-black/15 rounded-t-3xl overflow-hidden'
                                : 'relative w-[85vw] max-w-[360px] h-[60vh] max-h-[520px] sm:w-[360px] sm:h-[520px] rounded-3xl overflow-hidden flex flex-col bg-white shadow-2xl shadow-black/15 border border-gray-100'}
                            ref={isMobile ? panelRef : undefined}
                            style={isMobile ? { height: '90dvh', maxHeight: '90dvh' } : {}}
                            role="dialog"
                            aria-label="Chat widget"
                        >
                            {chatContent}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Feature 1: Proactive nudge bubble */}
                <AnimatePresence>
                    {showNudge && !isOpen && nudgeMessage && (
                        <motion.div key="nudge"
                            initial={{ opacity: 0, y: 10, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.9 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                            className="max-w-[200px] sm:max-w-[220px] px-3.5 py-2.5 rounded-2xl shadow-xl shadow-black/10 border cursor-pointer relative bg-white border-gray-100 text-gray-700"
                            onClick={() => { dismissNudge(); setIsOpen(true); }}
                        >
                            <button onClick={(e) => { e.stopPropagation(); dismissNudge(); }}
                                className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full flex items-center justify-center transition-colors bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600">
                                <X size={11} />
                            </button>
                            <p className="text-[12.5px] leading-relaxed pr-2">{nudgeMessage}</p>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Feature 5: Toggle button with breathing animation + pulse ring + unread badge */}
                {(!isMobile || !isOpen) && (
                    <div className="relative self-end">
                        {!isOpen && unreadCount > 0 && (
                            <span className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#1565C0] to-[#0288D1] animate-pulse-ring" />
                        )}
                        <motion.button
                            whileHover={isDragging ? {} : { scale: 1.08, boxShadow: '0 8px 30px rgba(21, 101, 192, 0.35)' }}
                            whileTap={isDragging ? {} : { scale: 0.92 }}
                            onClick={() => { if (!isDragging) setIsOpen(!isOpen); }}
                            onDoubleClick={resetPosition}
                            onPointerDown={onPointerDown}
                            onPointerMove={onPointerMove}
                            onPointerUp={onPointerUp}
                            className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-[#1565C0]/30 bg-gradient-to-br from-[#1565C0] via-[#2c74c6] to-[#0288D1] border border-white/10 ${!isOpen ? 'animate-breathe' : ''}`}
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
                        {!isOpen && unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white shadow-sm pointer-events-none">
                                {unreadCount}
                            </span>
                        )}
                    </div>
                )}
            </div>
        </>
    );
}
