/**
 * generate-themes-batch4.js
 * Batch 4: upstage, gtuning, jstuning, tuningcomua, fasttuning (car tuning companies)
 * Same generator functions as batch2 with new client configs.
 */
const fs = require('fs');
const path = require('path');

const CLIENTS_DIR = path.join(__dirname, '..', 'clients');

// ── Client Configs ─────────────────────────────────────────────────────
const clients = {
    upstage: {
        label: 'UPstage Chip Tuning — Dark Crimson & Charcoal Theme',
        domain: 'upstage.com.ua',
        fontUrl: 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap',
        font: "'Roboto', -apple-system, BlinkMacSystemFont, sans-serif",
        isDark: true,
        // Angular automotive: compact, no-frills, 3px radius feel
        widgetW: '360px', widgetH: '520px', widgetMaxW: '360px', widgetMaxH: '520px',
        toggleSize: 'w-14 h-14', toggleRadius: 'rounded-[10px]',
        headerPad: 'px-5 py-4', nameSize: 'text-[14px]',
        headerAccent: '',
        avatarHeaderRound: 'rounded-[8px]',
        chatAvatarRound: 'rounded-[8px]',
        hasShine: false, // clean dark — no gloss
        // Crimson red header
        headerFrom: '#ce3939', headerVia: '#b93232', headerTo: '#a42c2c',
        toggleFrom: '#ce3939', toggleVia: '#b93232', toggleTo: '#a42c2c',
        toggleShadow: '#ce3939', toggleHoverRgb: '206, 57, 57',
        sendFrom: '#ce3939', sendTo: '#a42c2c',
        sendHoverFrom: '#b93232', sendHoverTo: '#8e2525',
        onlineDotBg: '#e88a8a', onlineDotBorder: '#ce3939',
        typingDot: '#ce3939',
        userMsgFrom: '#ce3939', userMsgTo: '#a42c2c', userMsgShadow: '#ce3939',
        avatarFrom: '#3a2020', avatarTo: '#4a2828', avatarBorder: '#5a3030', avatarIcon: '#e88a8a',
        linkColor: '#e88a8a', linkHover: '#f0a0a0', copyHover: '#ce3939', copyActive: '#e88a8a',
        chipBorder: '#4a3030', chipFrom: '#2a1e1e', chipTo: '#332525',
        chipText: '#e88a8a', chipHoverFrom: '#3a2525', chipHoverTo: '#4a3030', chipHoverBorder: '#ce3939',
        focusBorder: '#ce3939', focusRing: '#3a2020',
        imgActiveBorder: '#5a3030', imgActiveBg: '#2a1e1e', imgActiveText: '#e88a8a',
        imgHoverText: '#e88a8a', imgHoverBorder: '#5a3030', imgHoverBg: '#2a1e1e',
        cssPrimary: '#ce3939', cssAccent: '#383e42', focusRgb: '206, 57, 57',
        feedbackActive: '#ce3939', feedbackHover: '#e88a8a',
        surfaceBg: '#292e31', surfaceCard: '#333839', surfaceBorder: '#404547',
        surfaceInput: '#303538', surfaceInputFocus: '#383d40',
        textPrimary: '#e8e8e8', textSecondary: '#8e9499', textMuted: '#5a6268',
    },
    gtuning: {
        label: 'G-TUNING — Red & Dark Sporty Theme',
        domain: 'www.g-tuning.com.ua',
        fontUrl: 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap',
        font: "'Poppins', -apple-system, BlinkMacSystemFont, sans-serif",
        isDark: false,
        // Sporty: slightly wider, pill toggle for punchy CTA
        widgetW: '365px', widgetH: '530px', widgetMaxW: '365px', widgetMaxH: '530px',
        toggleSize: 'w-14 h-14', toggleRadius: 'rounded-full',
        headerPad: 'px-5 py-4', nameSize: 'text-[14px]',
        headerAccent: '',
        avatarHeaderRound: 'rounded-xl',
        chatAvatarRound: 'rounded-xl',
        hasShine: true,
        // Red header gradient
        headerFrom: '#D72323', headerVia: '#c01e1e', headerTo: '#a81a1a',
        toggleFrom: '#D72323', toggleVia: '#c01e1e', toggleTo: '#a81a1a',
        toggleShadow: '#D72323', toggleHoverRgb: '215, 35, 35',
        sendFrom: '#D72323', sendTo: '#a81a1a',
        sendHoverFrom: '#c01e1e', sendHoverTo: '#901515',
        onlineDotBg: '#f09090', onlineDotBorder: '#D72323',
        typingDot: '#D72323',
        userMsgFrom: '#D72323', userMsgTo: '#a81a1a', userMsgShadow: '#D72323',
        avatarFrom: '#fce4e4', avatarTo: '#f8cccc', avatarBorder: '#f09090', avatarIcon: '#c01e1e',
        linkColor: '#c01e1e', linkHover: '#a81a1a', copyHover: '#D72323', copyActive: '#D72323',
        chipBorder: '#f09090', chipFrom: '#fef0f0', chipTo: '#fce4e4',
        chipText: '#a81a1a', chipHoverFrom: '#fce4e4', chipHoverTo: '#f8cccc', chipHoverBorder: '#D72323',
        focusBorder: '#D72323', focusRing: '#fce4e4',
        imgActiveBorder: '#f09090', imgActiveBg: '#fef0f0', imgActiveText: '#c01e1e',
        imgHoverText: '#c01e1e', imgHoverBorder: '#f09090', imgHoverBg: '#fef0f0',
        cssPrimary: '#D72323', cssAccent: '#232E35', focusRgb: '215, 35, 35',
        feedbackActive: '#D72323', feedbackHover: '#e84545',
    },
    jstuning: {
        label: 'JS Tuning — Dark Purple Premium Theme',
        domain: 'jstuningkyiv.com.ua',
        fontUrl: 'https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;500;600;700&display=swap',
        font: "'Open Sans', -apple-system, BlinkMacSystemFont, sans-serif",
        isDark: true,
        // Premium dark: larger, spacious
        widgetW: '370px', widgetH: '540px', widgetMaxW: '370px', widgetMaxH: '540px',
        toggleSize: 'w-[58px] h-[58px]', toggleRadius: 'rounded-2xl',
        headerPad: 'px-5 py-4', nameSize: 'text-[14.5px]',
        headerAccent: '',
        avatarHeaderRound: 'rounded-xl',
        chatAvatarRound: 'rounded-xl',
        hasShine: true,
        // Vibrant purple header
        headerFrom: '#6e23e7', headerVia: '#5c1ecc', headerTo: '#542793',
        toggleFrom: '#6e23e7', toggleVia: '#5c1ecc', toggleTo: '#542793',
        toggleShadow: '#6e23e7', toggleHoverRgb: '110, 35, 231',
        sendFrom: '#6e23e7', sendTo: '#542793',
        sendHoverFrom: '#5c1ecc', sendHoverTo: '#4520a0',
        onlineDotBg: '#b58af5', onlineDotBorder: '#6e23e7',
        typingDot: '#8b50ef',
        userMsgFrom: '#6e23e7', userMsgTo: '#542793', userMsgShadow: '#6e23e7',
        avatarFrom: '#2a1e40', avatarTo: '#352850', avatarBorder: '#4a3570', avatarIcon: '#b58af5',
        linkColor: '#b58af5', linkHover: '#cda8ff', copyHover: '#8b50ef', copyActive: '#b58af5',
        chipBorder: '#3a2860', chipFrom: '#221a35', chipTo: '#2a2040',
        chipText: '#b58af5', chipHoverFrom: '#302545', chipHoverTo: '#3a2860', chipHoverBorder: '#6e23e7',
        focusBorder: '#6e23e7', focusRing: '#2a1e40',
        imgActiveBorder: '#4a3570', imgActiveBg: '#221a35', imgActiveText: '#b58af5',
        imgHoverText: '#b58af5', imgHoverBorder: '#4a3570', imgHoverBg: '#221a35',
        cssPrimary: '#6e23e7', cssAccent: '#a701e2', focusRgb: '110, 35, 231',
        feedbackActive: '#8b50ef', feedbackHover: '#b58af5',
        surfaceBg: '#1d1d1d', surfaceCard: '#262626', surfaceBorder: '#363636',
        surfaceInput: '#222222', surfaceInputFocus: '#2a2a2a',
        textPrimary: '#e5e5e5', textSecondary: '#808080', textMuted: '#555555',
    },
    tuningcomua: {
        label: 'Tuning.com.ua — Navy & Green E-Commerce Theme',
        domain: 'tuning.com.ua',
        fontUrl: 'https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;500;600;700&display=swap',
        font: "'Open Sans', -apple-system, BlinkMacSystemFont, sans-serif",
        isDark: false,
        // E-commerce clean: standard size, sharp corners
        widgetW: '360px', widgetH: '520px', widgetMaxW: '360px', widgetMaxH: '520px',
        toggleSize: 'w-14 h-14', toggleRadius: 'rounded-lg',
        headerPad: 'px-5 py-4', nameSize: 'text-[14px]',
        headerAccent: '',
        avatarHeaderRound: 'rounded-lg',
        chatAvatarRound: 'rounded-lg',
        hasShine: true,
        // Navy → Blue gradient header
        headerFrom: '#072346', headerVia: '#0a3060', headerTo: '#388ECB',
        // Navy toggle
        toggleFrom: '#072346', toggleVia: '#0a3060', toggleTo: '#0d3d7a',
        toggleShadow: '#072346', toggleHoverRgb: '7, 35, 70',
        // Green CTA send button (matches site's green CTAs)
        sendFrom: '#46A74E', sendTo: '#3a9040',
        sendHoverFrom: '#3a9040', sendHoverTo: '#2e7a34',
        onlineDotBg: '#7dcaf2', onlineDotBorder: '#072346',
        typingDot: '#388ECB',
        // User messages: navy blue
        userMsgFrom: '#072346', userMsgTo: '#0d3d7a', userMsgShadow: '#072346',
        avatarFrom: '#dce8f5', avatarTo: '#c8dbed', avatarBorder: '#96c3e0', avatarIcon: '#072346',
        linkColor: '#388ECB', linkHover: '#0a3060', copyHover: '#388ECB', copyActive: '#388ECB',
        chipBorder: '#96c3e0', chipFrom: '#ecf3fa', chipTo: '#dce8f5',
        chipText: '#0a3060', chipHoverFrom: '#dce8f5', chipHoverTo: '#c8dbed', chipHoverBorder: '#388ECB',
        focusBorder: '#388ECB', focusRing: '#dce8f5',
        imgActiveBorder: '#96c3e0', imgActiveBg: '#ecf3fa', imgActiveText: '#072346',
        imgHoverText: '#072346', imgHoverBorder: '#96c3e0', imgHoverBg: '#ecf3fa',
        cssPrimary: '#072346', cssAccent: '#46A74E', focusRgb: '7, 35, 70',
        feedbackActive: '#388ECB', feedbackHover: '#5ca3d5',
    },
    fasttuning: {
        label: 'Fasttuning — Dark Red Aggressive Theme',
        domain: 'fasttuning.kiev.ua',
        fontUrl: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap',
        font: "'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif",
        isDark: true,
        // Compact aggressive: slightly smaller, modern asymmetric radius
        widgetW: '355px', widgetH: '515px', widgetMaxW: '355px', widgetMaxH: '515px',
        toggleSize: 'w-[56px] h-[56px]', toggleRadius: 'rounded-[20px]',
        headerPad: 'px-5 py-4', nameSize: 'text-[13.5px]',
        headerAccent: '',
        avatarHeaderRound: 'rounded-xl',
        chatAvatarRound: 'rounded-xl',
        hasShine: false, // aggressive dark — no gloss
        // Red header
        headerFrom: '#dc1000', headerVia: '#c20e00', headerTo: '#a80c00',
        toggleFrom: '#dc1000', toggleVia: '#c20e00', toggleTo: '#a80c00',
        toggleShadow: '#dc1000', toggleHoverRgb: '220, 16, 0',
        sendFrom: '#dc1000', sendTo: '#a80c00',
        sendHoverFrom: '#c20e00', sendHoverTo: '#900a00',
        onlineDotBg: '#f07060', onlineDotBorder: '#dc1000',
        typingDot: '#dc1000',
        userMsgFrom: '#dc1000', userMsgTo: '#a80c00', userMsgShadow: '#dc1000',
        avatarFrom: '#3a1a1a', avatarTo: '#4a2222', avatarBorder: '#5a2a2a', avatarIcon: '#f07060',
        linkColor: '#f07060', linkHover: '#f8a090', copyHover: '#dc1000', copyActive: '#f07060',
        chipBorder: '#4a2222', chipFrom: '#2a1515', chipTo: '#331c1c',
        chipText: '#f07060', chipHoverFrom: '#3a2020', chipHoverTo: '#4a2828', chipHoverBorder: '#dc1000',
        focusBorder: '#dc1000', focusRing: '#3a1a1a',
        imgActiveBorder: '#5a2a2a', imgActiveBg: '#2a1515', imgActiveText: '#f07060',
        imgHoverText: '#f07060', imgHoverBorder: '#5a2a2a', imgHoverBg: '#2a1515',
        cssPrimary: '#dc1000', cssAccent: '#a80c00', focusRgb: '220, 16, 0',
        feedbackActive: '#dc1000', feedbackHover: '#f07060',
        surfaceBg: '#1a1a1a', surfaceCard: '#232323', surfaceBorder: '#333333',
        surfaceInput: '#1f1f1f', surfaceInputFocus: '#282828',
        textPrimary: '#e5e5e5', textSecondary: '#888888', textMuted: '#555555',
    },
};

// ── Generators (same as batch2 with fixed send button & quick replies) ─

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
