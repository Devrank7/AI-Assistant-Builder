/**
 * generate-themes-v2.js
 * Improved version: adds Google Fonts, client logos, per-client layout variations.
 */
const fs = require('fs');
const path = require('path');

const CLIENTS_DIR = path.join(__dirname, '..', 'clients');

// ── Client Configs ─────────────────────────────────────────────────────
const clients = {
    drcare: {
        label: 'Dr. Care Clinic — Purple & Blue Theme',
        domain: 'drcare.com.ua',
        fontUrl: 'https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600&family=Yantramanav:wght@400;500;700&display=swap',
        font: "'Yantramanav', 'Source Sans 3', -apple-system, BlinkMacSystemFont, sans-serif",
        isDark: false,
        // Layout: slightly larger toggle with pill shape (matches site's buttons)
        widgetW: '360px', widgetH: '520px', widgetMaxW: '360px', widgetMaxH: '520px',
        toggleSize: 'w-[58px] h-[58px]', toggleRadius: 'rounded-[18px]',
        headerPad: 'px-5 py-4', nameSize: 'text-[14px]',
        headerAccent: '', // no extra accent
        avatarHeaderRound: 'rounded-xl',
        chatAvatarRound: 'rounded-xl',
        hasShine: true,
        // Brand
        headerFrom: '#6f4495', headerVia: '#7c52a8', headerTo: '#1a80dd',
        toggleFrom: '#6f4495', toggleVia: '#7c52a8', toggleTo: '#1a80dd',
        toggleShadow: '#6f4495', toggleHoverRgb: '111, 68, 149',
        sendFrom: '#6f4495', sendTo: '#1a80dd',
        sendHoverFrom: '#5c3a7d', sendHoverTo: '#1568b5',
        onlineDotBg: '#b99fd4', onlineDotBorder: '#6f4495',
        typingDot: '#8b6aad',
        userMsgFrom: '#6f4495', userMsgTo: '#1a80dd', userMsgShadow: '#6f4495',
        avatarFrom: '#ede5f5', avatarTo: '#e3d6f0', avatarBorder: '#d4bfe6', avatarIcon: '#6f4495',
        linkColor: '#6f4495', linkHover: '#5c3a7d', copyHover: '#6f4495', copyActive: '#6f4495',
        chipBorder: '#d4bfe6', chipFrom: '#f3eef8', chipTo: '#ede5f5',
        chipText: '#5c3a7d', chipHoverFrom: '#ede5f5', chipHoverTo: '#e3d6f0', chipHoverBorder: '#b99fd4',
        focusBorder: '#8b6aad', focusRing: '#ede5f5',
        imgActiveBorder: '#b99fd4', imgActiveBg: '#f3eef8', imgActiveText: '#6f4495',
        imgHoverText: '#6f4495', imgHoverBorder: '#b99fd4', imgHoverBg: '#f3eef8',
        cssPrimary: '#6f4495', cssAccent: '#1a80dd', focusRgb: '111, 68, 149',
        feedbackActive: '#6f4495', feedbackHover: '#8b6aad',
    },
    dentline: {
        label: 'Dent Line — Forest Green Clinical Theme',
        domain: 'dentline.com.ua',
        fontUrl: null,
        font: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        isDark: false,
        // Layout: compact, clinical, no frills
        widgetW: '350px', widgetH: '500px', widgetMaxW: '350px', widgetMaxH: '500px',
        toggleSize: 'w-[50px] h-[50px]', toggleRadius: 'rounded-xl',
        headerPad: 'px-5 py-3.5', nameSize: 'text-[13.5px]',
        headerAccent: '',
        avatarHeaderRound: 'rounded-lg',
        chatAvatarRound: 'rounded-lg',
        hasShine: false, // cleaner clinical look
        headerFrom: '#2d8659', headerVia: '#339963', headerTo: '#3a9e6b',
        toggleFrom: '#2d8659', toggleVia: '#339963', toggleTo: '#3a9e6b',
        toggleShadow: '#2d8659', toggleHoverRgb: '45, 134, 89',
        sendFrom: '#2d8659', sendTo: '#339963',
        sendHoverFrom: '#246e49', sendHoverTo: '#2d8659',
        onlineDotBg: '#8cc9a6', onlineDotBorder: '#2d8659',
        typingDot: '#4aad78',
        userMsgFrom: '#2d8659', userMsgTo: '#339963', userMsgShadow: '#2d8659',
        avatarFrom: '#d4eede', avatarTo: '#c5e7d3', avatarBorder: '#a3d4b8', avatarIcon: '#2d8659',
        linkColor: '#2d8659', linkHover: '#246e49', copyHover: '#2d8659', copyActive: '#2d8659',
        chipBorder: '#a3d4b8', chipFrom: '#edf7f1', chipTo: '#d4eede',
        chipText: '#246e49', chipHoverFrom: '#d4eede', chipHoverTo: '#c5e7d3', chipHoverBorder: '#8cc9a6',
        focusBorder: '#4aad78', focusRing: '#d4eede',
        imgActiveBorder: '#8cc9a6', imgActiveBg: '#edf7f1', imgActiveText: '#2d8659',
        imgHoverText: '#2d8659', imgHoverBorder: '#8cc9a6', imgHoverBg: '#edf7f1',
        cssPrimary: '#2d8659', cssAccent: '#339963', focusRgb: '45, 134, 89',
        feedbackActive: '#2d8659', feedbackHover: '#4aad78',
    },
    dentify: {
        label: 'DENTIFY — Premium Gold & Charcoal Theme',
        domain: 'dentify.com.ua',
        fontUrl: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap',
        font: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
        isDark: false,
        // Layout: premium — wider, taller, more spacious
        widgetW: '380px', widgetH: '560px', widgetMaxW: '380px', widgetMaxH: '560px',
        toggleSize: 'w-16 h-16', toggleRadius: 'rounded-[20px]',
        headerPad: 'px-6 py-5', nameSize: 'text-[15px]',
        headerAccent: 'border-b border-[#C1A01E]/20',
        avatarHeaderRound: 'rounded-2xl',
        chatAvatarRound: 'rounded-xl',
        hasShine: true,
        headerFrom: '#252A2F', headerVia: '#2d3238', headerTo: '#353b42',
        toggleFrom: '#C1A01E', toggleVia: '#d4b42e', toggleTo: '#a88d1a',
        toggleShadow: '#C1A01E', toggleHoverRgb: '193, 160, 30',
        sendFrom: '#C1A01E', sendTo: '#a88d1a',
        sendHoverFrom: '#a88d1a', sendHoverTo: '#8f7816',
        onlineDotBg: '#e6d98a', onlineDotBorder: '#C1A01E',
        typingDot: '#C1A01E',
        userMsgFrom: '#252A2F', userMsgTo: '#353b42', userMsgShadow: '#252A2F',
        avatarFrom: '#faf6e3', avatarTo: '#f0eacc', avatarBorder: '#e6d98a', avatarIcon: '#a88d1a',
        linkColor: '#a88d1a', linkHover: '#8f7816', copyHover: '#C1A01E', copyActive: '#C1A01E',
        chipBorder: '#e6d98a', chipFrom: '#fdf9eb', chipTo: '#faf6e3',
        chipText: '#8f7816', chipHoverFrom: '#faf6e3', chipHoverTo: '#f0eacc', chipHoverBorder: '#C1A01E',
        focusBorder: '#C1A01E', focusRing: '#faf6e3',
        imgActiveBorder: '#e6d98a', imgActiveBg: '#fdf9eb', imgActiveText: '#a88d1a',
        imgHoverText: '#a88d1a', imgHoverBorder: '#e6d98a', imgHoverBg: '#fdf9eb',
        cssPrimary: '#C1A01E', cssAccent: '#252A2F', focusRgb: '193, 160, 30',
        feedbackActive: '#C1A01E', feedbackHover: '#d4b42e',
    },
    dentalbar: {
        label: 'Dental Bar — Dark Cyan & Blue Theme',
        domain: 'dental-bar.in.ua',
        fontUrl: 'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap',
        font: "'Manrope', -apple-system, BlinkMacSystemFont, sans-serif",
        isDark: true,
        widgetW: '360px', widgetH: '520px', widgetMaxW: '360px', widgetMaxH: '520px',
        toggleSize: 'w-14 h-14', toggleRadius: 'rounded-full',
        headerPad: 'px-5 py-4', nameSize: 'text-[14px]',
        headerAccent: '',
        avatarHeaderRound: 'rounded-xl',
        chatAvatarRound: 'rounded-lg',
        hasShine: true,
        headerFrom: '#00a1c9', headerVia: '#2e8eb8', headerTo: '#5879c5',
        toggleFrom: '#00a1c9', toggleVia: '#2e8eb8', toggleTo: '#5879c5',
        toggleShadow: '#00a1c9', toggleHoverRgb: '0, 161, 201',
        sendFrom: '#00a1c9', sendTo: '#5879c5',
        sendHoverFrom: '#0088ac', sendHoverTo: '#4a68b0',
        onlineDotBg: '#7dd4ec', onlineDotBorder: '#00a1c9',
        typingDot: '#00a1c9',
        userMsgFrom: '#00a1c9', userMsgTo: '#5879c5', userMsgShadow: '#00a1c9',
        avatarFrom: '#162536', avatarTo: '#1a2d42', avatarBorder: '#2a4060', avatarIcon: '#00a1c9',
        linkColor: '#5cc8e4', linkHover: '#7dd4ec', copyHover: '#00a1c9', copyActive: '#00a1c9',
        chipBorder: '#1e3348', chipFrom: '#0d1a26', chipTo: '#111f2e',
        chipText: '#5cc8e4', chipHoverFrom: '#142638', chipHoverTo: '#1a2d42', chipHoverBorder: '#00a1c9',
        focusBorder: '#00a1c9', focusRing: '#162536',
        imgActiveBorder: '#00a1c9', imgActiveBg: '#0d1a26', imgActiveText: '#00a1c9',
        imgHoverText: '#00a1c9', imgHoverBorder: '#2a4060', imgHoverBg: '#0d1a26',
        cssPrimary: '#00a1c9', cssAccent: '#5879c5', focusRgb: '0, 161, 201',
        feedbackActive: '#00a1c9', feedbackHover: '#5cc8e4',
        surfaceBg: '#0b1018', surfaceCard: '#111927', surfaceBorder: '#1e2d3d',
        surfaceInput: '#0f1720', surfaceInputFocus: '#162232',
        textPrimary: '#e2e8f0', textSecondary: '#64748b', textMuted: '#475569',
    },
    zdorovo: {
        label: 'ZDÓROVO — Vivid Green & Blue Theme',
        domain: 'www.zdorovo-dent.com.ua',
        fontUrl: null,
        font: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        isDark: false,
        widgetW: '360px', widgetH: '520px', widgetMaxW: '360px', widgetMaxH: '520px',
        toggleSize: 'w-14 h-14', toggleRadius: 'rounded-2xl',
        headerPad: 'px-5 py-4', nameSize: 'text-[14px]',
        headerAccent: '',
        avatarHeaderRound: 'rounded-2xl',
        chatAvatarRound: 'rounded-xl',
        hasShine: true,
        headerFrom: '#00d084', headerVia: '#00b878', headerTo: '#0693e3',
        toggleFrom: '#00d084', toggleVia: '#00b878', toggleTo: '#0693e3',
        toggleShadow: '#00d084', toggleHoverRgb: '0, 208, 132',
        sendFrom: '#00d084', sendTo: '#00b070',
        sendHoverFrom: '#00b070', sendHoverTo: '#009960',
        onlineDotBg: '#7ee8c0', onlineDotBorder: '#00d084',
        typingDot: '#00d084',
        userMsgFrom: '#00d084', userMsgTo: '#00b070', userMsgShadow: '#00d084',
        avatarFrom: '#ccf5e5', avatarTo: '#b3f0d8', avatarBorder: '#7ee8c0', avatarIcon: '#00b070',
        linkColor: '#00b070', linkHover: '#009960', copyHover: '#00d084', copyActive: '#00d084',
        chipBorder: '#7ee8c0', chipFrom: '#e6faf2', chipTo: '#ccf5e5',
        chipText: '#00905c', chipHoverFrom: '#ccf5e5', chipHoverTo: '#b3f0d8', chipHoverBorder: '#4edda8',
        focusBorder: '#00d084', focusRing: '#ccf5e5',
        imgActiveBorder: '#7ee8c0', imgActiveBg: '#e6faf2', imgActiveText: '#00b070',
        imgHoverText: '#00b070', imgHoverBorder: '#7ee8c0', imgHoverBg: '#e6faf2',
        cssPrimary: '#00d084', cssAccent: '#0693e3', focusRgb: '0, 208, 132',
        feedbackActive: '#00d084', feedbackHover: '#4edda8',
    },
};

// ── Generators ─────────────────────────────────────────────────────────

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
        // Load Google Fonts into document head (fonts are global, available in Shadow DOM)
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
                        className="relative w-[85vw] ${c.widgetMaxW ? `max-w-[${c.widgetMaxW}]` : 'max-w-[360px]'} h-[60vh] ${c.widgetMaxH ? `max-h-[${c.widgetMaxH}]` : 'max-h-[480px]'} ${c.widgetW ? `sm:w-[${c.widgetW}]` : 'sm:w-[360px]'} ${c.widgetH ? `sm:h-[${c.widgetH}]` : 'sm:h-[480px]'} rounded-3xl overflow-hidden flex flex-col ${containerBg} shadow-2xl ${containerShadow} border ${containerBorder}"
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
                                    className={\`flex-shrink-0 p-2.5 rounded-xl border transition-all duration-200 \${selectedImage ? 'border-[${c.imgActiveBorder}] bg-[${c.imgActiveBg}] text-[${c.imgActiveText}] shadow-sm' : '${c.isDark ? `border-[${c.surfaceBorder}] text-[${c.textSecondary}]` : 'border-gray-200 text-gray-400'} hover:text-[${c.imgHoverText}] hover:border-[${c.imgHoverBorder}] hover:bg-[${c.imgHoverBg}]'}\`}
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
            {/* Bot Avatar */}
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
                className={\`p-0.5 rounded transition-colors \${rating === 'up' ? 'text-[${c.feedbackActive}]' : '${c.isDark ? `text-[${c.textMuted}]` : 'text-gray-300'} hover:text-[${c.feedbackHover}]'}\`}
                aria-label="Helpful">
                <ThumbsUp size={11} />
            </button>
            <button onClick={() => handleRate('down')}
                className={\`p-0.5 rounded transition-colors \${rating === 'down' ? 'text-red-400' : '${c.isDark ? `text-[${c.textMuted}]` : 'text-gray-300'} hover:text-red-300'}\`}
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
    console.log(`✅ ${id}: 6 files (incl. main.jsx with font loader)`);
}

console.log(`\n🎨 Done! ${count} clients × 6 files = ${count * 6} files generated.`);
console.log('Now run: node scripts/build.js <clientId> for each client');
