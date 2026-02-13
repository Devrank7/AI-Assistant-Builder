/**
 * generate-themes-batch3.js
 * Batch 3: dentalart, osadchyclinic, coraldent, whiteclinic, smileclinic
 */
const fs = require('fs');
const path = require('path');

const CLIENTS_DIR = path.join(__dirname, '..', 'clients');

const clients = {
    dentalart: {
        label: 'Dental-Art — Warm Orange Theme',
        domain: 'dentalart.ua',
        fontUrl: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap',
        font: "'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif",
        isDark: false,
        // Pill-shaped toggle matching site's 50px-radius buttons; standard size
        widgetW: '360px', widgetH: '520px', widgetMaxW: '360px', widgetMaxH: '520px',
        toggleSize: 'w-14 h-14', toggleRadius: 'rounded-full',
        headerPad: 'px-5 py-4', nameSize: 'text-[14px]',
        headerAccent: '',
        avatarHeaderRound: 'rounded-xl',
        chatAvatarRound: 'rounded-xl',
        hasShine: true,
        // Warm orange gradient
        headerFrom: '#f67316', headerVia: '#f47e28', headerTo: '#e86810',
        toggleFrom: '#f67316', toggleVia: '#f47e28', toggleTo: '#e86810',
        toggleShadow: '#f67316', toggleHoverRgb: '246, 115, 22',
        sendFrom: '#f67316', sendTo: '#e86810',
        sendHoverFrom: '#e86810', sendHoverTo: '#d45e0a',
        onlineDotBg: '#fbc589', onlineDotBorder: '#f67316',
        typingDot: '#f67316',
        userMsgFrom: '#f67316', userMsgTo: '#e86810', userMsgShadow: '#f67316',
        avatarFrom: '#fef0e0', avatarTo: '#fde4c8', avatarBorder: '#fbc589', avatarIcon: '#e86810',
        linkColor: '#e86810', linkHover: '#d45e0a', copyHover: '#f67316', copyActive: '#f67316',
        chipBorder: '#fbc589', chipFrom: '#fef7ed', chipTo: '#fef0e0',
        chipText: '#c45a08', chipHoverFrom: '#fef0e0', chipHoverTo: '#fde4c8', chipHoverBorder: '#f67316',
        focusBorder: '#f67316', focusRing: '#fef0e0',
        imgActiveBorder: '#fbc589', imgActiveBg: '#fef7ed', imgActiveText: '#e86810',
        imgHoverText: '#e86810', imgHoverBorder: '#fbc589', imgHoverBg: '#fef7ed',
        cssPrimary: '#f67316', cssAccent: '#e86810', focusRgb: '246, 115, 22',
        feedbackActive: '#f67316', feedbackHover: '#f89644',
    },
    osadchyclinic: {
        label: 'Osadchy Dental — Crimson Red Clinical Theme',
        domain: 'osadchyclinic.com.ua',
        fontUrl: 'https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700;800&display=swap',
        font: "'Open Sans', -apple-system, BlinkMacSystemFont, sans-serif",
        isDark: false,
        // Angular, sharp aesthetic — smaller toggle, more compact
        widgetW: '355px', widgetH: '515px', widgetMaxW: '355px', widgetMaxH: '515px',
        toggleSize: 'w-[54px] h-[54px]', toggleRadius: 'rounded-lg',
        headerPad: 'px-5 py-3.5', nameSize: 'text-[13.5px]',
        headerAccent: '',
        avatarHeaderRound: 'rounded-lg',
        chatAvatarRound: 'rounded-lg',
        hasShine: false, // clean, structured — no shine
        // Crimson red gradient header
        headerFrom: '#dd3333', headerVia: '#c92e2e', headerTo: '#b52828',
        toggleFrom: '#dd3333', toggleVia: '#c92e2e', toggleTo: '#b52828',
        toggleShadow: '#dd3333', toggleHoverRgb: '221, 51, 51',
        sendFrom: '#dd3333', sendTo: '#b52828',
        sendHoverFrom: '#c92e2e', sendHoverTo: '#a02222',
        onlineDotBg: '#f09999', onlineDotBorder: '#dd3333',
        typingDot: '#dd3333',
        userMsgFrom: '#dd3333', userMsgTo: '#b52828', userMsgShadow: '#dd3333',
        avatarFrom: '#fce4e4', avatarTo: '#f9cccc', avatarBorder: '#f09999', avatarIcon: '#c92e2e',
        linkColor: '#c92e2e', linkHover: '#a02222', copyHover: '#dd3333', copyActive: '#dd3333',
        chipBorder: '#f09999', chipFrom: '#fef2f2', chipTo: '#fce4e4',
        chipText: '#a02222', chipHoverFrom: '#fce4e4', chipHoverTo: '#f9cccc', chipHoverBorder: '#dd3333',
        focusBorder: '#dd3333', focusRing: '#fce4e4',
        imgActiveBorder: '#f09999', imgActiveBg: '#fef2f2', imgActiveText: '#c92e2e',
        imgHoverText: '#c92e2e', imgHoverBorder: '#f09999', imgHoverBg: '#fef2f2',
        cssPrimary: '#dd3333', cssAccent: '#363636', focusRgb: '221, 51, 51',
        feedbackActive: '#dd3333', feedbackHover: '#e85a5a',
    },
    coraldent: {
        label: 'Coral Dent — Blue & Magenta Theme',
        domain: 'coral-dent.kiev.ua',
        fontUrl: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap',
        font: "'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif",
        isDark: false,
        // Standard with two-tone: blue header, magenta toggle
        widgetW: '360px', widgetH: '520px', widgetMaxW: '360px', widgetMaxH: '520px',
        toggleSize: 'w-14 h-14', toggleRadius: 'rounded-xl',
        headerPad: 'px-5 py-4', nameSize: 'text-[14px]',
        headerAccent: '',
        avatarHeaderRound: 'rounded-xl',
        chatAvatarRound: 'rounded-xl',
        hasShine: true,
        // Cerulean blue header
        headerFrom: '#1196cc', headerVia: '#0f87bb', headerTo: '#0d739d',
        // Magenta toggle — CTA contrast
        toggleFrom: '#D0006E', toggleVia: '#c0005e', toggleTo: '#b50654',
        toggleShadow: '#D0006E', toggleHoverRgb: '208, 0, 110',
        sendFrom: '#1196cc', sendTo: '#0d739d',
        sendHoverFrom: '#0f87bb', sendHoverTo: '#0a6189',
        onlineDotBg: '#7ccce6', onlineDotBorder: '#1196cc',
        typingDot: '#1196cc',
        // User messages are blue (primary), not magenta
        userMsgFrom: '#1196cc', userMsgTo: '#0d739d', userMsgShadow: '#1196cc',
        avatarFrom: '#ddf0f8', avatarTo: '#c5e4f2', avatarBorder: '#7ccce6', avatarIcon: '#0f87bb',
        linkColor: '#0f87bb', linkHover: '#0d739d', copyHover: '#1196cc', copyActive: '#1196cc',
        chipBorder: '#7ccce6', chipFrom: '#ecf7fb', chipTo: '#ddf0f8',
        chipText: '#0d739d', chipHoverFrom: '#ddf0f8', chipHoverTo: '#c5e4f2', chipHoverBorder: '#1196cc',
        focusBorder: '#1196cc', focusRing: '#ddf0f8',
        imgActiveBorder: '#7ccce6', imgActiveBg: '#ecf7fb', imgActiveText: '#0f87bb',
        imgHoverText: '#0f87bb', imgHoverBorder: '#7ccce6', imgHoverBg: '#ecf7fb',
        cssPrimary: '#1196cc', cssAccent: '#D0006E', focusRgb: '17, 150, 204',
        feedbackActive: '#1196cc', feedbackHover: '#3dadd6',
    },
    whiteclinic: {
        label: 'White Clinic — Premium Teal Theme',
        domain: 'whiteclinic.ua',
        fontUrl: 'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap',
        font: "'Manrope', -apple-system, BlinkMacSystemFont, sans-serif",
        isDark: false,
        // Premium layout — wider, taller, spacious header
        widgetW: '370px', widgetH: '540px', widgetMaxW: '370px', widgetMaxH: '540px',
        toggleSize: 'w-[58px] h-[58px]', toggleRadius: 'rounded-2xl',
        headerPad: 'px-6 py-5', nameSize: 'text-[15px]',
        headerAccent: '',
        avatarHeaderRound: 'rounded-2xl',
        chatAvatarRound: 'rounded-xl',
        hasShine: true,
        // Teal gradient (matching site's 135deg gradient)
        headerFrom: '#76A6B9', headerVia: '#5a9ab0', headerTo: '#509BB9',
        toggleFrom: '#509BB9', toggleVia: '#4a90ac', toggleTo: '#4C7F94',
        toggleShadow: '#509BB9', toggleHoverRgb: '80, 155, 185',
        sendFrom: '#509BB9', sendTo: '#4C7F94',
        sendHoverFrom: '#4a90ac', sendHoverTo: '#43788a',
        onlineDotBg: '#a0cedc', onlineDotBorder: '#509BB9',
        typingDot: '#509BB9',
        userMsgFrom: '#509BB9', userMsgTo: '#4C7F94', userMsgShadow: '#509BB9',
        avatarFrom: '#e0eff4', avatarTo: '#cce3ec', avatarBorder: '#a0cedc', avatarIcon: '#4C7F94',
        linkColor: '#4C7F94', linkHover: '#43788a', copyHover: '#509BB9', copyActive: '#509BB9',
        chipBorder: '#a0cedc', chipFrom: '#eef6f9', chipTo: '#e0eff4',
        chipText: '#43788a', chipHoverFrom: '#e0eff4', chipHoverTo: '#cce3ec', chipHoverBorder: '#509BB9',
        focusBorder: '#509BB9', focusRing: '#e0eff4',
        imgActiveBorder: '#a0cedc', imgActiveBg: '#eef6f9', imgActiveText: '#4C7F94',
        imgHoverText: '#4C7F94', imgHoverBorder: '#a0cedc', imgHoverBg: '#eef6f9',
        cssPrimary: '#509BB9', cssAccent: '#4C7F94', focusRgb: '80, 155, 185',
        feedbackActive: '#509BB9', feedbackHover: '#6cafc4',
    },
    smileclinic: {
        label: 'Smile Clinic — Medical Green & Navy Theme',
        domain: 'smileclinic.com.ua',
        fontUrl: 'https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@400;600;700;800&display=swap',
        font: "'Nunito Sans', -apple-system, BlinkMacSystemFont, sans-serif",
        isDark: false,
        // Standard clinical layout
        widgetW: '360px', widgetH: '520px', widgetMaxW: '360px', widgetMaxH: '520px',
        toggleSize: 'w-14 h-14', toggleRadius: 'rounded-xl',
        headerPad: 'px-5 py-4', nameSize: 'text-[14px]',
        headerAccent: '',
        avatarHeaderRound: 'rounded-xl',
        chatAvatarRound: 'rounded-xl',
        hasShine: true,
        // Medical green header
        headerFrom: '#268e18', headerVia: '#239115', headerTo: '#1e7b12',
        toggleFrom: '#268e18', toggleVia: '#239115', toggleTo: '#1e7b12',
        toggleShadow: '#268e18', toggleHoverRgb: '38, 142, 24',
        sendFrom: '#268e18', sendTo: '#1e7b12',
        sendHoverFrom: '#1e7b12', sendHoverTo: '#196a0f',
        onlineDotBg: '#8ccf84', onlineDotBorder: '#268e18',
        typingDot: '#268e18',
        userMsgFrom: '#268e18', userMsgTo: '#1e7b12', userMsgShadow: '#268e18',
        avatarFrom: '#dcf0d9', avatarTo: '#c6e6c2', avatarBorder: '#8ccf84', avatarIcon: '#1e7b12',
        linkColor: '#1e7b12', linkHover: '#196a0f', copyHover: '#268e18', copyActive: '#268e18',
        chipBorder: '#8ccf84', chipFrom: '#eef8ec', chipTo: '#dcf0d9',
        chipText: '#196a0f', chipHoverFrom: '#dcf0d9', chipHoverTo: '#c6e6c2', chipHoverBorder: '#268e18',
        focusBorder: '#268e18', focusRing: '#dcf0d9',
        imgActiveBorder: '#8ccf84', imgActiveBg: '#eef8ec', imgActiveText: '#1e7b12',
        imgHoverText: '#1e7b12', imgHoverBorder: '#8ccf84', imgHoverBg: '#eef8ec',
        cssPrimary: '#268e18', cssAccent: '#052c54', focusRgb: '38, 142, 24',
        feedbackActive: '#268e18', feedbackHover: '#4aad3e',
    },
};

// ── Generators (identical to v2/batch2) ───────────────────────────────

function genCSS(c) {
    return `@tailwind base;
@tailwind components;
@tailwind utilities;

/* ${c.label} */
:host {
    --aw-primary: ${c.cssPrimary};
    --aw-accent: ${c.cssAccent};
    --aw-bg: ${c.isDark ? c.surfaceBg : '#ffffff'};
    --aw-text: ${c.isDark ? c.textPrimary : '#374151'};
    font-family: ${c.font};
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
}

.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }

* {
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
}

*:focus-visible {
    outline: 2px solid rgba(${c.focusRgb}, 0.35);
    outline-offset: 2px;
}
button:focus-visible {
    outline: 2px solid rgba(${c.focusRgb}, 0.35);
    outline-offset: 2px;
    border-radius: 12px;
}
button, a, input, textarea {
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}
@media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
    }
}
`;
}

function genMainJSX(c) {
    const fontInject = c.fontUrl ? `
        const fontHref = '${c.fontUrl}';
        if (!document.querySelector('link[href="' + fontHref + '"]')) {
            const fontLink = document.createElement('link');
            fontLink.rel = 'stylesheet';
            fontLink.href = fontHref;
            document.head.appendChild(fontLink);
        }` : '';

    return `import { h, render } from 'preact';
import { Widget } from './components/Widget';
import './index.css';

window.__WIDGET_CONFIG__ = __WIDGET_CONFIG__;

class AIChatWidget extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {${fontInject}

        const container = document.createElement('div');
        container.id = 'widget-root';

        const styleSheet = document.createElement('style');
        styleSheet.textContent = window.__WIDGET_CSS__ || '';
        this.shadowRoot.appendChild(styleSheet);
        this.shadowRoot.appendChild(container);

        render(h(Widget, { config: window.__WIDGET_CONFIG__ }), container);
    }
}

if (!customElements.get('ai-chat-widget')) {
    customElements.define('ai-chat-widget', AIChatWidget);
}

function mountWidget() {
    if (!document.querySelector('ai-chat-widget')) {
        document.body.appendChild(document.createElement('ai-chat-widget'));
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountWidget);
} else {
    mountWidget();
}
`;
}

function genWidget(c) {
    const containerBg = c.isDark ? `bg-[${c.surfaceBg}]` : 'bg-white';
    const containerBorder = c.isDark ? `border-[${c.surfaceBorder}]` : 'border-gray-100';
    const containerShadow = c.isDark ? 'shadow-black/40' : 'shadow-black/15';
    const chatBg = c.isDark
        ? `bg-gradient-to-b from-[${c.surfaceBg}] to-[${c.surfaceCard}]`
        : 'bg-gradient-to-b from-gray-50/80 to-white';
    const inputAreaBg = c.isDark ? `bg-[${c.surfaceBg}]` : 'bg-white';
    const inputAreaBorder = c.isDark ? `border-[${c.surfaceBorder}]` : 'border-gray-100';
    const inputBg = c.isDark ? `bg-[${c.surfaceInput}]` : 'bg-gray-50/80';
    const inputText = c.isDark ? `text-[${c.textPrimary}]` : 'text-gray-800';
    const inputPlaceholder = c.isDark ? `placeholder-[${c.textSecondary}]` : 'placeholder-gray-400';
    const inputBorderColor = c.isDark ? `border-[${c.surfaceBorder}]` : 'border-gray-200';
    const inputFocusBg = c.isDark ? `focus:bg-[${c.surfaceInputFocus}]` : 'focus:bg-white';
    const imgPreviewBg = c.isDark ? `bg-[${c.surfaceBg}] border-[${c.surfaceBorder}]` : 'bg-white border-t border-gray-50';
    const imgPreviewBorder = c.isDark ? `border-[${c.surfaceBorder}]` : 'border-gray-200';
    const shine = c.hasShine ? `\n                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_60%)]" />` : '';
    const faviconUrl = `https://www.google.com/s2/favicons?domain=${c.domain}&sz=64`;

    return `import { useState, useRef, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageCircle, X, Send, Trash2, ImagePlus, Sparkles } from 'lucide-preact';
import ChatMessage from './ChatMessage';
import MessageFeedback from './MessageFeedback';
import QuickReplies from './QuickReplies';
import useChat from '../hooks/useChat';
import useDrag from '../hooks/useDrag';

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
    const [headerLogoErr, setHeaderLogoErr] = useState(false);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const fileInputRef = useRef(null);

    const position = config.design?.position || 'bottom-right';
    const positionClasses = POSITION_MAP[position] || POSITION_MAP['bottom-right'];
    const { offset, isDragging, onPointerDown, onPointerMove, onPointerUp, resetPosition, dragStyle } = useDrag(config.clientId);

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
        const text = inputValue.trim() || (selectedImage ? 'Проанализируй це зображення' : '');
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
        <div className={\`fixed z-50 flex flex-col gap-4 antialiased \${positionClasses}\`} style={{ fontFamily: "${c.font.replace(/'/g, "\\'")}", ...dragStyle }}>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                        className="relative w-[85vw] max-w-[${c.widgetMaxW}] h-[60vh] max-h-[${c.widgetMaxH}] sm:w-[${c.widgetW}] sm:h-[${c.widgetH}] rounded-3xl overflow-hidden flex flex-col ${containerBg} shadow-2xl ${containerShadow} border ${containerBorder}"
                        role="dialog"
                        aria-label="Chat widget"
                    >
                        {/* HEADER */}
                        <div className="relative ${c.headerPad} flex items-center justify-between overflow-hidden ${c.headerAccent}">
                            <div className="absolute inset-0 bg-gradient-to-br from-[${c.headerFrom}] via-[${c.headerVia}] to-[${c.headerTo}]" />${shine}

                            <div className="relative flex items-center gap-3">
                                <div className="relative">
                                    <div className="w-10 h-10 ${c.avatarHeaderRound} bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-inner shadow-white/10 overflow-hidden p-1.5">
                                        {!headerLogoErr ? (
                                            <img src="${faviconUrl}" alt="" className="w-full h-full object-contain rounded" crossOrigin="anonymous" onError={() => setHeaderLogoErr(true)} />
                                        ) : (
                                            <Sparkles size={18} className="text-white" />
                                        )}
                                    </div>
                                    {!isOffline && (
                                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[${c.onlineDotBg}] border-[2.5px] border-[${c.onlineDotBorder}] shadow-sm" />
                                    )}
                                </div>
                                <div>
                                    <h3 className="font-semibold ${c.nameSize} text-white tracking-tight leading-tight">{config.bot.name}</h3>
                                    <p className="text-[11px] text-white/65 font-medium">{isOffline ? 'Офлайн' : 'Онлайн — відповідаю миттєво'}</p>
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
                        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 scrollbar-hide ${chatBg}" aria-live="polite">
                            <ChatMessage role="assistant" content={config.bot.greeting} onImageClick={setExpandedImage} />
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
                                        <motion.span key={i} className="w-2 h-2 bg-[${c.typingDot}] rounded-full"
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
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-4 overflow-hidden ${imgPreviewBg}">
                                    <div className="relative inline-block my-2.5">
                                        <img src={selectedImage.previewUrl} alt="" className="h-16 w-auto rounded-xl border ${imgPreviewBorder} object-cover shadow-sm" />
                                        <button onClick={removeSelectedImage} className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white shadow-md transition-colors">
                                            <X size={10} />
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* INPUT */}
                        <div className="px-4 py-3.5 border-t ${inputAreaBorder} ${inputAreaBg} space-y-2.5">
                            {showQuickReplies && <QuickReplies options={config.features?.quickReplies?.starters} onSelect={(t) => sendMessage(t)} />}
                            <form onSubmit={handleSubmit} className="flex items-end gap-2">
                                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                                <button type="button" onClick={() => fileInputRef.current?.click()}
                                    className={\`flex-shrink-0 p-2.5 rounded-xl border transition-all duration-200 \${selectedImage ? 'border-[${c.imgActiveBorder}] bg-[${c.imgActiveBg}] text-[${c.imgActiveText}] shadow-sm' : 'border-gray-200 text-gray-400 hover:text-[${c.imgHoverText}] hover:border-[${c.imgHoverBorder}] hover:bg-[${c.imgHoverBg}]'}\`}
                                    aria-label="Upload photo">
                                    <ImagePlus size={16} />
                                </button>
                                <textarea ref={inputRef} value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={handleKeyDown}
                                    placeholder={selectedImage ? 'Опишіть проблему...' : 'Задайте питання...'}
                                    rows={1}
                                    className="flex-1 min-w-0 ${inputBg} ${inputText} ${inputPlaceholder} rounded-xl py-2.5 pl-3.5 pr-3.5 border ${inputBorderColor} focus:outline-none focus:border-[${c.focusBorder}] focus:ring-2 focus:ring-[${c.focusRing}] ${inputFocusBg} transition-all resize-none text-[13.5px] leading-relaxed"
                                    style={{ maxHeight: '100px' }}
                                />
                                <button type="submit" disabled={(!inputValue.trim() && !selectedImage) || isLoading}
                                    className="flex-shrink-0 w-9 h-9 rounded-xl bg-[${c.sendFrom}] text-white flex items-center justify-center hover:bg-[${c.sendHoverFrom}] active:scale-95 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed shadow-md shadow-[${c.sendFrom}]/25">
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
                whileHover={isDragging ? {} : { scale: 1.08, boxShadow: '0 8px 30px rgba(${c.toggleHoverRgb}, 0.35)' }}
                whileTap={isDragging ? {} : { scale: 0.92 }}
                onClick={() => { if (!isDragging) setIsOpen(!isOpen); }}
                onDoubleClick={resetPosition}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                className="${c.toggleSize} ${c.toggleRadius} flex items-center justify-center text-white shadow-lg shadow-[${c.toggleShadow}]/30 bg-gradient-to-br from-[${c.toggleFrom}] via-[${c.toggleVia}] to-[${c.toggleTo}] border border-white/10"
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
`;
}

function genChatMessage(c) {
    const botMsgClasses = c.isDark
        ? `bg-[${c.surfaceCard}] text-[${c.textPrimary}] border border-[${c.surfaceBorder}] shadow-sm rounded-bl-md`
        : 'bg-white text-gray-700 border border-gray-100 shadow-sm rounded-bl-md';
    const strongClasses = c.isDark ? 'text-white' : 'text-gray-900';
    const timestampColor = c.isDark ? `text-[${c.textSecondary}]` : 'text-gray-400';
    const copyDefault = c.isDark ? `text-[${c.textMuted}]` : 'text-gray-300';
    const imgBorder = c.isDark ? `border-[${c.surfaceBorder}]` : 'border-gray-200';
    const userMsgClasses = c.isDark
        ? `bg-[${c.chipFrom}] text-[${c.textPrimary}] border border-[${c.chipBorder}] rounded-br-md shadow-sm`
        : `bg-gradient-to-r from-[${c.chipFrom}] to-[${c.chipTo}] text-gray-700 border border-[${c.chipBorder}]/50 rounded-br-md shadow-sm`;
    const faviconSmall = `https://www.google.com/s2/favicons?domain=${c.domain}&sz=32`;

    return `import { memo, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { User, Copy, Check, RotateCcw, ZoomIn, Sparkles } from 'lucide-preact';

function formatRelativeTime(timestamp) {
    if (!timestamp) return '';
    const diff = Date.now() - timestamp;
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return 'щойно';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return \`\${minutes} хв\`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return \`\${hours} год\`;
    return \`\${Math.floor(hours / 24)} д\`;
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
            className={\`flex items-end gap-2 mb-3 group \${isBot ? 'justify-start' : 'justify-end'}\`}
            role="article"
        >
            {isBot && (
                <div className="w-7 h-7 ${c.chatAvatarRound} bg-gradient-to-br from-[${c.avatarFrom}] to-[${c.avatarTo}] flex items-center justify-center flex-shrink-0 shadow-sm border border-[${c.avatarBorder}]/50 overflow-hidden p-0.5">
                    {!logoErr ? (
                        <img src="${faviconSmall}" alt="" className="w-full h-full object-contain rounded-sm" onError={() => setLogoErr(true)} />
                    ) : (
                        <Sparkles size={13} className="text-[${c.avatarIcon}]" />
                    )}
                </div>
            )}

            <div className="flex flex-col max-w-[78%]">
                {imageUrl && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className={\`mb-1.5 \${isBot ? '' : 'flex justify-end'}\`}>
                        <div className="relative group/img cursor-pointer overflow-hidden rounded-2xl border ${imgBorder} shadow-sm" onClick={() => onImageClick?.(imageUrl)}>
                            <img src={imageUrl} alt="" className="max-w-[200px] max-h-[140px] object-cover rounded-2xl" />
                            <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/15 transition-all duration-200 flex items-center justify-center">
                                <ZoomIn size={18} className="text-white opacity-0 group-hover/img:opacity-90 transition-opacity drop-shadow-lg" />
                            </div>
                        </div>
                    </motion.div>
                )}

                {content && (
                    <div className={\`rounded-2xl px-3.5 py-2.5 text-[13px] leading-[1.6] \${
                        isError
                            ? 'bg-red-50 text-red-600 border border-red-200 rounded-bl-md'
                            : isBot
                              ? '${botMsgClasses}'
                              : '${userMsgClasses}'
                    }\`}>
                        <div className="max-w-none [&>p]:my-0 [&>p+p]:mt-2 [&>ul]:my-1.5 [&>ol]:my-1.5 [&>ul]:pl-4 [&>ol]:pl-4 [&>ul]:list-disc [&>ol]:list-decimal">
                            <ReactMarkdown
                                components={{
                                    a: ({ href, children }) => (
                                        <a href={href} target="_blank" rel="noopener noreferrer" className="underline decoration-1 underline-offset-2 transition-colors text-[${c.linkColor}] hover:text-[${c.linkHover}]">{children}</a>
                                    ),
                                    strong: ({ children }) => (
                                        <strong className="font-semibold ${strongClasses}">{children}</strong>
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

                <div className={\`flex items-center gap-2 mt-1 px-1 \${isBot ? '' : 'justify-end'}\`}>
                    {timestamp && <span className="text-[10px] ${timestampColor} font-medium">{formatRelativeTime(timestamp)}</span>}
                    {isBot && !isError && content && (
                        <button onClick={handleCopy} className="opacity-0 group-hover:opacity-100 p-0.5 ${copyDefault} hover:text-[${c.copyHover}] transition-all duration-200" aria-label="Copy">
                            {copied ? <Check size={11} className="text-[${c.copyActive}]" /> : <Copy size={11} />}
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
                <div className="w-7 h-7 ${c.chatAvatarRound} flex items-center justify-center bg-gradient-to-br from-[${c.avatarFrom}] to-[${c.avatarTo}] border border-[${c.avatarBorder}]/50 text-[${c.avatarIcon}] flex-shrink-0 shadow-sm">
                    <User size={13} />
                </div>
            )}
        </motion.div>
    );
}

export default memo(ChatMessage);
`;
}

function genQuickReplies(c) {
    return `import { motion } from 'framer-motion';

export default function QuickReplies({ options, onSelect }) {
    if (!options || options.length === 0) return null;

    return (
        <div className="flex flex-col gap-1.5">
            {options.map((option, idx) => (
                <motion.button
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.08, type: 'spring', stiffness: 400, damping: 28 }}
                    whileHover={{ scale: 1.02, x: 2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onSelect(option)}
                    className="w-full px-3 py-1.5 rounded-xl border border-[${c.chipBorder}] bg-gradient-to-r from-[${c.chipFrom}] to-[${c.chipTo}]/50 text-[11.5px] font-medium text-[${c.chipText}] hover:from-[${c.chipHoverFrom}] hover:to-[${c.chipHoverTo}]/50 hover:border-[${c.chipHoverBorder}] hover:shadow-sm transition-all duration-200 cursor-pointer text-left"
                >
                    {option}
                </motion.button>
            ))}
        </div>
    );
}
`;
}

function genFeedback(c) {
    return `import { useState } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-preact';

export default function MessageFeedback({ messageIndex, sessionId, clientId }) {
    const storageKey = \`aiwidget_feedback_\${clientId}_\${sessionId}_\${messageIndex}\`;

    const [rating, setRating] = useState(() => {
        try { return localStorage.getItem(storageKey) || null; } catch { return null; }
    });

    const handleRate = (value) => {
        const newRating = rating === value ? null : value;
        setRating(newRating);
        try {
            if (newRating) localStorage.setItem(storageKey, newRating);
            else localStorage.removeItem(storageKey);
        } catch {}
        fetch('/api/feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clientId, sessionId, messageIndex, rating: newRating }),
        }).catch(() => {});
    };

    return (
        <div className="flex items-center gap-1 mt-0.5 ml-8">
            <button onClick={() => handleRate('up')}
                className={\`p-0.5 rounded transition-colors \${rating === 'up' ? 'text-[${c.feedbackActive}]' : 'text-gray-300 hover:text-[${c.feedbackHover}]'}\`}
                aria-label="Helpful">
                <ThumbsUp size={11} />
            </button>
            <button onClick={() => handleRate('down')}
                className={\`p-0.5 rounded transition-colors \${rating === 'down' ? 'text-red-400' : 'text-gray-300 hover:text-red-300'}\`}
                aria-label="Not helpful">
                <ThumbsDown size={11} />
            </button>
        </div>
    );
}
`;
}

// ── Write All Files ────────────────────────────────────────────────────
let count = 0;
for (const [id, c] of Object.entries(clients)) {
    const srcDir = path.join(CLIENTS_DIR, id, 'src');
    const compDir = path.join(srcDir, 'components');
    fs.mkdirSync(compDir, { recursive: true });

    fs.writeFileSync(path.join(srcDir, 'index.css'), genCSS(c));
    fs.writeFileSync(path.join(srcDir, 'main.jsx'), genMainJSX(c));
    fs.writeFileSync(path.join(compDir, 'Widget.jsx'), genWidget(c));
    fs.writeFileSync(path.join(compDir, 'ChatMessage.jsx'), genChatMessage(c));
    fs.writeFileSync(path.join(compDir, 'QuickReplies.jsx'), genQuickReplies(c));
    fs.writeFileSync(path.join(compDir, 'MessageFeedback.jsx'), genFeedback(c));

    count++;
    console.log(`✅ ${id}: 6 files generated`);
}

console.log(`\n🎨 Done! ${count} clients × 6 files = ${count * 6} files generated.`);
