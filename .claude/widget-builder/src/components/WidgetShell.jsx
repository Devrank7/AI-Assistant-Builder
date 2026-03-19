import { useState, useRef, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-preact';
import useChat from '../hooks/useChat';
import useDrag from '../hooks/useDrag';
import useVoice from '../hooks/useVoice';
import useProactive from '../hooks/useProactive';
import useLanguage from '../hooks/useLanguage';
import useTTS from '../hooks/useTTS';

import Header from './Header';
import ContactBar from './ContactBar';
import ContextBanner from './ContextBanner';
import MessageList from './MessageList';
import ImagePreview from './ImagePreview';
import InputArea from './InputArea';
import PoweredBy from './PoweredBy';
import ToggleButton from './ToggleButton';
import NudgeBubble from './NudgeBubble';

const POSITION_MAP = {
    'bottom-right': 'bottom-4 right-4 sm:bottom-6 sm:right-6 items-end',
    'bottom-left': 'bottom-4 left-4 sm:bottom-6 sm:left-6 items-start',
};

const DEFAULT_STRUCTURE = {
    version: 1,
    components: [
        { id: 'header', slot: 'panel-top', enabled: true },
        { id: 'contactBar', slot: 'panel-top', enabled: true },
        { id: 'contextBanner', slot: 'panel-top', enabled: true },
        { id: 'messageList', slot: 'panel-body', enabled: true },
        { id: 'imagePreview', slot: 'panel-footer', enabled: true },
        { id: 'inputArea', slot: 'panel-footer', enabled: true },
        { id: 'poweredBy', slot: 'panel-footer', enabled: true },
        { id: 'toggleButton', slot: 'external', enabled: true },
        { id: 'nudgeBubble', slot: 'external', enabled: true },
    ],
};

const COMPONENT_MAP = {
    header: Header,
    contactBar: ContactBar,
    contextBanner: ContextBanner,
    messageList: MessageList,
    imagePreview: ImagePreview,
    inputArea: InputArea,
    poweredBy: PoweredBy,
    toggleButton: ToggleButton,
    nudgeBubble: NudgeBubble,
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
    const contacts = config.contacts;

    const { lang, detect: detectLang, ui: uiStrings, voiceLocale } = useLanguage(config.clientId);
    const { speak, speakingIdx, isSupported: ttsSupported } = useTTS();
    const { showNudge, nudgeMessage, unreadCount, dismissNudge } = useProactive(config, isOpen);

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

    useEffect(() => {
        if (isAtBottomRef.current) scrollToBottom();
        else if (messages.length > 0) setHasNewMessages(true);
    }, [messages, isTyping, scrollToBottom]);

    const handleChatScroll = useCallback(() => {
        const el = chatContainerRef.current;
        if (!el) return;
        const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
        isAtBottomRef.current = atBottom;
        setIsAtBottom(atBottom);
        if (atBottom) setHasNewMessages(false);
    }, []);

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

    useEffect(() => {
        if (!showMenu) return;
        const handler = (e) => { if (menuRef.current && !e.composedPath().includes(menuRef.current)) setShowMenu(false); };
        document.addEventListener('pointerdown', handler);
        return () => document.removeEventListener('pointerdown', handler);
    }, [showMenu]);

    const toggleMute = useCallback(() => {
        setIsMuted(v => {
            const next = !v;
            try { localStorage.setItem('aw-muted-' + config.clientId, String(next)); } catch {}
            window.__WIDGET_MUTED__ = next;
            return next;
        });
    }, [config.clientId]);

    const cycleFontSize = useCallback(() => {
        setChatFontSize(f => {
            const next = f === 'sm' ? 'md' : f === 'md' ? 'lg' : 'sm';
            try { localStorage.setItem('aw-fontsize-' + config.clientId, next); } catch {}
            return next;
        });
    }, [config.clientId]);

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

    useEffect(() => {
      const handler = (event) => {
        if (event.data?.type === 'theme_update' && event.data.theme) {
          const theme = event.data.theme;
          const root = document.querySelector('[data-widget-root]');
          if (root) {
            if (theme.cssPrimary) root.style.setProperty('--aw-primary', theme.cssPrimary);
            if (theme.cssAccent) root.style.setProperty('--aw-accent', theme.cssAccent);
          }
        }
      };
      window.addEventListener('message', handler);
      return () => window.removeEventListener('message', handler);
    }, []);

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

    // Build ctx object for all child components
    const ctx = {
        config, isOpen, setIsOpen, isMobile, isOffline, messages, sendMessage, isLoading, isTyping,
        retryLastMessage, clearMessages, sessionId, isReturningUser, inputValue, setInputValue,
        selectedImage, setSelectedImage, expandedImage, setExpandedImage, messagesEndRef, inputRef,
        fileInputRef, typewriterText, typewriterDone, welcomeMsg, chatContainerRef, isAtBottom,
        hasNewMessages, contextDismissed, setContextDismissed, pageTitle, showMenu, setShowMenu,
        isMuted, chatFontSize, menuRef, contacts, uiStrings, lang, detectLang, voiceLocale,
        speak, speakingIdx, ttsSupported, showNudge, nudgeMessage, unreadCount, dismissNudge,
        isDragging, onPointerDown, onPointerMove, onPointerUp, resetPosition, dragStyle,
        isListening, voiceSupported, handleVoiceToggle, handleSwipeStart, handleSwipeMove,
        handleSwipeEnd, scrollToBottom, handleChatScroll, toggleMute, cycleFontSize, exportChat,
        handleImageSelect, removeSelectedImage, handleSubmit, handleRichAction, handleKeyDown,
        showQuickReplies, getDayLabel, getTimeLabel, shouldShowSeparator,
    };

    // Read widget structure (allows runtime customization)
    const structure = (typeof window !== 'undefined' && window.__WIDGET_STRUCTURE__) || DEFAULT_STRUCTURE;
    const enabled = structure.components.filter(comp => comp.enabled !== false);

    const renderSlot = (slotName) =>
        enabled.filter(comp => comp.slot === slotName).map(comp => {
            const Comp = COMPONENT_MAP[comp.id];
            if (!Comp) return null;
            return <Comp key={comp.id} ctx={{ ...ctx, ...comp.props }} />;
        });

    const chatContent = (
        <>
            {isMobile && (
                <div className="flex justify-center pt-2 pb-0.5 cursor-grab active:cursor-grabbing bg-aw-surface-bg"
                    onTouchStart={handleSwipeStart} onTouchMove={handleSwipeMove} onTouchEnd={handleSwipeEnd}>
                    <div className="w-10 h-1 rounded-full bg-aw-surface-border" />
                </div>
            )}
            {renderSlot('panel-top')}
            {renderSlot('panel-body')}
            {renderSlot('panel-footer')}
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
            <AnimatePresence>
                {isMobile && isOpen && (
                    <motion.div key="backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[9998] bg-black/50" onClick={() => setIsOpen(false)} />
                )}
            </AnimatePresence>

            <div data-widget-root className={`fixed z-[9999] flex flex-col gap-3 antialiased ${positionClasses}`} style={{ fontFamily: "Nunito Sans", ...(isMobile && isOpen ? {} : dragStyle) }}>
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            key="chat-panel"
                            initial={isMobile ? { y: '100%' } : { opacity: 0, y: 20, scale: 0.95 }}
                            animate={isMobile ? { y: swipeY > 0 ? swipeY : 0 } : { opacity: 1, y: 0, scale: 1 }}
                            exit={isMobile ? { y: '100%' } : { opacity: 0, y: 20, scale: 0.95 }}
                            transition={{ type: 'spring', stiffness: 300, damping: isMobile ? 30 : 25 }}
                            className={isMobile
                                ? 'fixed inset-x-0 bottom-0 flex flex-col bg-aw-surface-bg shadow-2xl shadow-black/15 rounded-t-3xl overflow-hidden'
                                : 'relative w-[85vw] max-w-[370px] h-[60vh] max-h-[540px] sm:w-[370px] sm:h-[540px] rounded-3xl overflow-hidden flex flex-col bg-aw-surface-bg shadow-2xl shadow-black/15 border border-aw-surface-border'}
                            ref={isMobile ? panelRef : undefined}
                            style={isMobile ? { height: '90dvh', maxHeight: '90dvh' } : {}}
                            role="dialog"
                            aria-label="Chat widget"
                        >
                            {chatContent}
                        </motion.div>
                    )}
                </AnimatePresence>
                {renderSlot('external')}
            </div>
        </>
    );
}
