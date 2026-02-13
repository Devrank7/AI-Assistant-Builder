/**
 * generate-themes-batch2.js
 * Batch 2: ddc, narin, smilelab, dentiplex, meddeo
 * Same generator functions as v2 with new client configs.
 */
const fs = require('fs');
const path = require('path');

const CLIENTS_DIR = path.join(__dirname, '..', 'clients');

// ── Client Configs ─────────────────────────────────────────────────────
const clients = {
    ddc: {
        label: 'Digital Dental Clinic — Premium Monochrome Theme',
        domain: 'ddc.clinic',
        fontUrl: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap',
        font: "'Montserrat', Helvetica, Arial, sans-serif",
        isDark: true,
        // Layout: premium minimalist — taller, angular corners to match site's sharp aesthetic
        widgetW: '370px', widgetH: '540px', widgetMaxW: '370px', widgetMaxH: '540px',
        toggleSize: 'w-[56px] h-[56px]', toggleRadius: 'rounded-xl',
        headerPad: 'px-5 py-4', nameSize: 'text-[14px]',
        headerAccent: '',
        avatarHeaderRound: 'rounded-lg',
        chatAvatarRound: 'rounded-lg',
        hasShine: false, // clean, no frills — matches site's no-gradient policy
        // Monochrome: black → charcoal gradients
        headerFrom: '#1a1a1a', headerVia: '#252525', headerTo: '#333333',
        toggleFrom: '#000000', toggleVia: '#1a1a1a', toggleTo: '#2a2a2a',
        toggleShadow: '#000000', toggleHoverRgb: '50, 50, 50',
        sendFrom: '#565756', sendTo: '#3a3a3a',
        sendHoverFrom: '#6a6b6a', sendHoverTo: '#4a4a4a',
        onlineDotBg: '#8a8a8a', onlineDotBorder: '#333333',
        typingDot: '#565756',
        userMsgFrom: '#333333', userMsgTo: '#1a1a1a', userMsgShadow: '#000000',
        avatarFrom: '#252525', avatarTo: '#2e2e2e', avatarBorder: '#404040', avatarIcon: '#999999',
        linkColor: '#a0a0a0', linkHover: '#cccccc', copyHover: '#999999', copyActive: '#cccccc',
        chipBorder: '#3a3a3a', chipFrom: '#1a1a1a', chipTo: '#222222',
        chipText: '#b0b0b0', chipHoverFrom: '#2a2a2a', chipHoverTo: '#333333', chipHoverBorder: '#565756',
        focusBorder: '#565756', focusRing: '#2a2a2a',
        imgActiveBorder: '#565756', imgActiveBg: '#1a1a1a', imgActiveText: '#a0a0a0',
        imgHoverText: '#a0a0a0', imgHoverBorder: '#444444', imgHoverBg: '#1a1a1a',
        cssPrimary: '#565756', cssAccent: '#000000', focusRgb: '86, 87, 86',
        feedbackActive: '#a0a0a0', feedbackHover: '#cccccc',
        surfaceBg: '#0e0e0e', surfaceCard: '#1a1a1a', surfaceBorder: '#2e2e2e',
        surfaceInput: '#161616', surfaceInputFocus: '#1e1e1e',
        textPrimary: '#e0e0e0', textSecondary: '#808080', textMuted: '#5a5a5a',
    },
    narin: {
        label: 'Narin Dental — Navy & Orange Theme',
        domain: 'narindental.com',
        fontUrl: 'https://fonts.googleapis.com/css2?family=Cabin:wght@400;500;600;700&display=swap',
        font: "'Cabin', -apple-system, BlinkMacSystemFont, sans-serif",
        isDark: false,
        // Standard clinical layout
        widgetW: '360px', widgetH: '520px', widgetMaxW: '360px', widgetMaxH: '520px',
        toggleSize: 'w-14 h-14', toggleRadius: 'rounded-2xl',
        headerPad: 'px-5 py-4', nameSize: 'text-[14px]',
        headerAccent: '',
        avatarHeaderRound: 'rounded-xl',
        chatAvatarRound: 'rounded-xl',
        hasShine: true,
        // Navy blue header
        headerFrom: '#024b6c', headerVia: '#03587d', headerTo: '#036f9e',
        // Orange toggle — strong CTA contrast against navy
        toggleFrom: '#e9490a', toggleVia: '#f05a1d', toggleTo: '#d43e02',
        toggleShadow: '#e9490a', toggleHoverRgb: '233, 73, 10',
        sendFrom: '#e9490a', sendTo: '#d43e02',
        sendHoverFrom: '#d43e02', sendHoverTo: '#c03500',
        onlineDotBg: '#7ec4d8', onlineDotBorder: '#024b6c',
        typingDot: '#036f9e',
        // User messages are navy (not orange — orange is accent only)
        userMsgFrom: '#024b6c', userMsgTo: '#036f9e', userMsgShadow: '#024b6c',
        avatarFrom: '#dceef4', avatarTo: '#c8e3ed', avatarBorder: '#9dcfe0', avatarIcon: '#024b6c',
        linkColor: '#024b6c', linkHover: '#036f9e', copyHover: '#024b6c', copyActive: '#036f9e',
        chipBorder: '#9dcfe0', chipFrom: '#ecf5f9', chipTo: '#dceef4',
        chipText: '#024b6c', chipHoverFrom: '#dceef4', chipHoverTo: '#c8e3ed', chipHoverBorder: '#7ec4d8',
        focusBorder: '#036f9e', focusRing: '#dceef4',
        imgActiveBorder: '#9dcfe0', imgActiveBg: '#ecf5f9', imgActiveText: '#024b6c',
        imgHoverText: '#024b6c', imgHoverBorder: '#9dcfe0', imgHoverBg: '#ecf5f9',
        cssPrimary: '#024b6c', cssAccent: '#e9490a', focusRgb: '2, 75, 108',
        feedbackActive: '#024b6c', feedbackHover: '#036f9e',
    },
    smilelab: {
        label: 'Smile Lab — Teal & Blue Clinical Theme',
        domain: 'smilelab.kiev.ua',
        fontUrl: 'https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;600;700&display=swap',
        font: "'Open Sans', -apple-system, BlinkMacSystemFont, sans-serif",
        isDark: false,
        // Compact clinical — narrower and shorter, matching site's tight layout
        widgetW: '350px', widgetH: '505px', widgetMaxW: '350px', widgetMaxH: '505px',
        toggleSize: 'w-[52px] h-[52px]', toggleRadius: 'rounded-xl',
        headerPad: 'px-5 py-3.5', nameSize: 'text-[13.5px]',
        headerAccent: '',
        avatarHeaderRound: 'rounded-lg',
        chatAvatarRound: 'rounded-lg',
        hasShine: true,
        // Teal → Blue gradient header (both brand colors)
        headerFrom: '#4abeb2', headerVia: '#45b1a6', headerTo: '#5a96f8',
        // Teal toggle (primary CTA color)
        toggleFrom: '#4abeb2', toggleVia: '#45b1a6', toggleTo: '#3da89c',
        toggleShadow: '#4abeb2', toggleHoverRgb: '74, 190, 178',
        sendFrom: '#4abeb2', sendTo: '#3da89c',
        sendHoverFrom: '#3da89c', sendHoverTo: '#339286',
        onlineDotBg: '#a3e2db', onlineDotBorder: '#4abeb2',
        typingDot: '#4abeb2',
        // User messages: teal → blue gradient
        userMsgFrom: '#4abeb2', userMsgTo: '#5a96f8', userMsgShadow: '#4abeb2',
        avatarFrom: '#ddf5f2', avatarTo: '#c9eeea', avatarBorder: '#a3e2db', avatarIcon: '#3da89c',
        linkColor: '#3da89c', linkHover: '#339286', copyHover: '#4abeb2', copyActive: '#4abeb2',
        chipBorder: '#a3e2db', chipFrom: '#edfaf8', chipTo: '#ddf5f2',
        chipText: '#339286', chipHoverFrom: '#ddf5f2', chipHoverTo: '#c9eeea', chipHoverBorder: '#4abeb2',
        focusBorder: '#4abeb2', focusRing: '#ddf5f2',
        imgActiveBorder: '#a3e2db', imgActiveBg: '#edfaf8', imgActiveText: '#3da89c',
        imgHoverText: '#3da89c', imgHoverBorder: '#a3e2db', imgHoverBg: '#edfaf8',
        cssPrimary: '#4abeb2', cssAccent: '#5a96f8', focusRgb: '74, 190, 178',
        feedbackActive: '#4abeb2', feedbackHover: '#5cc8be',
    },
    dentiplex: {
        label: 'DENTIPLEX — Gold & Charcoal Premium Theme',
        domain: 'dentiplex.com.ua',
        fontUrl: 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap',
        font: "'Poppins', -apple-system, BlinkMacSystemFont, sans-serif",
        isDark: false,
        // Premium spacious — slightly wider with extra header padding
        widgetW: '365px', widgetH: '530px', widgetMaxW: '365px', widgetMaxH: '530px',
        toggleSize: 'w-[58px] h-[58px]', toggleRadius: 'rounded-2xl',
        headerPad: 'px-6 py-5', nameSize: 'text-[14.5px]',
        headerAccent: 'border-b border-[#e3a102]/15',
        avatarHeaderRound: 'rounded-xl',
        chatAvatarRound: 'rounded-xl',
        hasShine: true,
        // Gold gradient header
        headerFrom: '#e3a102', headerVia: '#d4960a', headerTo: '#c48b0e',
        // Dark toggle — strong contrast, inverted CTA like site's dark buttons
        toggleFrom: '#131316', toggleVia: '#1e1e22', toggleTo: '#2a2a2f',
        toggleShadow: '#131316', toggleHoverRgb: '19, 19, 22',
        sendFrom: '#e3a102', sendTo: '#c48b0e',
        sendHoverFrom: '#c48b0e', sendHoverTo: '#a87a0a',
        onlineDotBg: '#f5d978', onlineDotBorder: '#c48b0e',
        typingDot: '#e3a102',
        // User messages: dark charcoal (white text on gold is poor contrast)
        userMsgFrom: '#131316', userMsgTo: '#2a2a2f', userMsgShadow: '#131316',
        avatarFrom: '#fdf4d9', avatarTo: '#faeec2', avatarBorder: '#f5d978', avatarIcon: '#c48b0e',
        linkColor: '#c48b0e', linkHover: '#a87a0a', copyHover: '#e3a102', copyActive: '#e3a102',
        chipBorder: '#f5d978', chipFrom: '#fef8e5', chipTo: '#fdf4d9',
        chipText: '#a87a0a', chipHoverFrom: '#fdf4d9', chipHoverTo: '#faeec2', chipHoverBorder: '#e3a102',
        focusBorder: '#e3a102', focusRing: '#fdf4d9',
        imgActiveBorder: '#f5d978', imgActiveBg: '#fef8e5', imgActiveText: '#c48b0e',
        imgHoverText: '#c48b0e', imgHoverBorder: '#f5d978', imgHoverBg: '#fef8e5',
        cssPrimary: '#e3a102', cssAccent: '#131316', focusRgb: '227, 161, 2',
        feedbackActive: '#e3a102', feedbackHover: '#f5c425',
    },
    meddeo: {
        label: 'MED-DEO — Cyan Blue & Warm Clinical Theme',
        domain: 'med-deo.com.ua',
        fontUrl: 'https://fonts.googleapis.com/css2?family=Inter+Tight:wght@300;400;500;600;700&display=swap',
        font: "'Inter Tight', -apple-system, BlinkMacSystemFont, sans-serif",
        isDark: false,
        // Standard size with pill-shaped toggle matching site's 9999px buttons
        widgetW: '360px', widgetH: '520px', widgetMaxW: '360px', widgetMaxH: '520px',
        toggleSize: 'w-14 h-14', toggleRadius: 'rounded-full',
        headerPad: 'px-5 py-4', nameSize: 'text-[14px]',
        headerAccent: '',
        avatarHeaderRound: 'rounded-xl',
        chatAvatarRound: 'rounded-xl',
        hasShine: true,
        // Cyan blue header gradient
        headerFrom: '#0693e3', headerVia: '#0581cc', headerTo: '#0470b5',
        toggleFrom: '#0693e3', toggleVia: '#0581cc', toggleTo: '#0470b5',
        toggleShadow: '#0693e3', toggleHoverRgb: '6, 147, 227',
        sendFrom: '#0693e3', sendTo: '#0470b5',
        sendHoverFrom: '#0581cc', sendHoverTo: '#035e9e',
        onlineDotBg: '#7dcaf2', onlineDotBorder: '#0693e3',
        typingDot: '#0693e3',
        userMsgFrom: '#0693e3', userMsgTo: '#0470b5', userMsgShadow: '#0693e3',
        avatarFrom: '#d9f0fc', avatarTo: '#bee6f9', avatarBorder: '#7dcaf2', avatarIcon: '#0581cc',
        linkColor: '#0581cc', linkHover: '#0470b5', copyHover: '#0693e3', copyActive: '#0693e3',
        chipBorder: '#7dcaf2', chipFrom: '#ecf7fd', chipTo: '#d9f0fc',
        chipText: '#0470b5', chipHoverFrom: '#d9f0fc', chipHoverTo: '#bee6f9', chipHoverBorder: '#0693e3',
        focusBorder: '#0693e3', focusRing: '#d9f0fc',
        imgActiveBorder: '#7dcaf2', imgActiveBg: '#ecf7fd', imgActiveText: '#0581cc',
        imgHoverText: '#0581cc', imgHoverBorder: '#7dcaf2', imgHoverBg: '#ecf7fd',
        cssPrimary: '#0693e3', cssAccent: '#32373c', focusRgb: '6, 147, 227',
        feedbackActive: '#0693e3', feedbackHover: '#39a8e8',
    },
};

// ── Generators (same as v2) ───────────────────────────────────────────

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
console.log('Now run build for each client.');
