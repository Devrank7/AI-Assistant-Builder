/**
 * generate-single-theme.js
 *
 * Generates 7 themed source files for a single client from a JSON theme config.
 * Used by AI agents via the create-quick-widget and mass-quick-widgets skills.
 *
 * Usage:
 *   node .agent/widget-builder/scripts/generate-single-theme.js <clientId>
 *
 * Expects theme config at:
 *   .agent/widget-builder/clients/<clientId>/theme.json
 *
 * Generates:
 *   .agent/widget-builder/clients/<clientId>/src/index.css
 *   .agent/widget-builder/clients/<clientId>/src/main.jsx
 *   .agent/widget-builder/clients/<clientId>/src/components/Widget.jsx
 *   .agent/widget-builder/clients/<clientId>/src/components/ChatMessage.jsx
 *   .agent/widget-builder/clients/<clientId>/src/components/QuickReplies.jsx
 *   .agent/widget-builder/clients/<clientId>/src/components/MessageFeedback.jsx
 *   .agent/widget-builder/clients/<clientId>/src/components/RichBlocks.jsx
 */
const fs = require('fs');
const path = require('path');

const CLIENTS_DIR = path.join(__dirname, '..', 'clients');

// ── CLI ─────────────────────────────────────────────────────────────────
const clientId = process.argv[2];
if (!clientId) {
    console.error('Usage: node generate-single-theme.js <clientId>');
    console.error('Expects theme config at: clients/<clientId>/theme.json');
    process.exit(1);
}

const configPath = path.join(CLIENTS_DIR, clientId, 'theme.json');
if (!fs.existsSync(configPath)) {
    console.error(`❌ Theme config not found: ${configPath}`);
    process.exit(1);
}

const c = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

// ── Validate required fields ────────────────────────────────────────────
const REQUIRED_FIELDS = [
    'domain', 'font', 'isDark',
    'widgetW', 'widgetH', 'widgetMaxW', 'widgetMaxH',
    'toggleSize', 'toggleRadius',
    'headerPad', 'nameSize',
    'avatarHeaderRound', 'chatAvatarRound',
    'headerFrom', 'headerVia', 'headerTo',
    'toggleFrom', 'toggleVia', 'toggleTo',
    'toggleShadow', 'toggleHoverRgb',
    'sendFrom', 'sendHoverFrom',
    'onlineDotBg', 'onlineDotBorder',
    'typingDot',
    'userMsgFrom', 'userMsgTo', 'userMsgShadow',
    'avatarFrom', 'avatarTo', 'avatarBorder', 'avatarIcon',
    'linkColor', 'linkHover', 'copyHover', 'copyActive',
    'chipBorder', 'chipFrom', 'chipTo',
    'chipText', 'chipHoverFrom', 'chipHoverTo', 'chipHoverBorder',
    'focusBorder', 'focusRing',
    'imgActiveBorder', 'imgActiveBg', 'imgActiveText',
    'imgHoverText', 'imgHoverBorder', 'imgHoverBg',
    'cssPrimary', 'cssAccent', 'focusRgb',
    'feedbackActive', 'feedbackHover',
];

const DARK_REQUIRED = [
    'surfaceBg', 'surfaceCard', 'surfaceBorder',
    'surfaceInput', 'surfaceInputFocus',
    'textPrimary', 'textSecondary', 'textMuted',
];

const missing = REQUIRED_FIELDS.filter(f => c[f] === undefined);
if (c.isDark) {
    missing.push(...DARK_REQUIRED.filter(f => c[f] === undefined));
}
if (missing.length > 0) {
    console.error(`❌ Missing required fields in theme.json: ${missing.join(', ')}`);
    process.exit(1);
}

// ── Apply defaults ──────────────────────────────────────────────────────
if (c.hasShine === undefined) c.hasShine = true;
if (!c.headerAccent) c.headerAccent = '';
if (!c.label) c.label = `${clientId} theme`;

// ── Generators ──────────────────────────────────────────────────────────

function genCSS(c) {
    // Rich outlined SVG chat pattern — messaging icons like Telegram/iMessage style
    const pc = c.cssPrimary;
    const sw = '1.5';
    const o1 = c.isDark ? '0.18' : '0.13';
    const o2 = c.isDark ? '0.14' : '0.10';
    const o3 = c.isDark ? '0.10' : '0.07';
    const svgRaw = `<svg width='200' height='200' xmlns='http://www.w3.org/2000/svg'>`
        // Shared stroke group
        + `<g fill='none' stroke='${pc}' stroke-width='${sw}' stroke-linecap='round' stroke-linejoin='round'>`
        // 1. Chat bubble with text lines (top-left)
        + `<g opacity='${o1}'><rect x='8' y='6' width='32' height='24' rx='5'/><path d='M12 30l-5 7 8-3'/><line x1='15' y1='14' x2='33' y2='14'/><line x1='15' y1='20' x2='28' y2='20'/></g>`
        // 2. Smiley face in circle (top-center)
        + `<g opacity='${o2}'><circle cx='82' cy='18' r='12'/><circle cx='77' cy='15' r='1.5' fill='${pc}' stroke='none'/><circle cx='87' cy='15' r='1.5' fill='${pc}' stroke='none'/><path d='M76 22q6 5 12 0'/></g>`
        // 3. Chat bubble with dots (top-right)
        + `<g opacity='${o1}'><rect x='145' y='4' width='30' height='22' rx='5'/><path d='M168 26l5 6-1-6'/><circle cx='154' cy='15' r='2' fill='${pc}' stroke='none'/><circle cx='160' cy='15' r='2' fill='${pc}' stroke='none'/><circle cx='166' cy='15' r='2' fill='${pc}' stroke='none'/></g>`
        // 4. Paper plane / send (mid-left)
        + `<g opacity='${o2}'><path d='M8 58l24 9-24 9 6-9z'/><line x1='14' y1='67' x2='32' y2='67'/></g>`
        // 5. Two overlapping chat bubbles (center-left)
        + `<g opacity='${o1}'><rect x='58' y='52' width='26' height='18' rx='5'/><rect x='68' y='58' width='26' height='18' rx='5'/></g>`
        // 6. Photo/image icon (center)
        + `<g opacity='${o2}'><rect x='112' y='48' width='30' height='24' rx='4'/><circle cx='121' cy='56' r='4'/><polyline points='115,68 123,60 130,66 135,59 139,64'/></g>`
        // 7. Play button in circle (center-right)
        + `<g opacity='${o1}'><circle cx='178' cy='62' r='14'/><polygon points='173,53 173,71 186,62'/></g>`
        // 8. Person with chat bubble (left-mid)
        + `<g opacity='${o2}'><circle cx='18' cy='108' r='7'/><path d='M8 124q10-7 20 0'/><rect x='30' y='98' width='18' height='14' rx='4'/><path d='M38 112l-4 5v-5'/></g>`
        // 9. Group of people (center-left)
        + `<g opacity='${o1}'><circle cx='78' cy='104' r='6'/><circle cx='92' cy='104' r='6'/><path d='M68 118q10-6 20 0'/><path d='M82 118q10-6 20 0'/></g>`
        // 10. Rounded pill chat bubble (center)
        + `<g opacity='${o2}'><rect x='118' y='100' width='28' height='20' rx='10'/><line x1='125' y1='108' x2='139' y2='108'/><line x1='125' y1='114' x2='134' y2='114'/></g>`
        // 11. Forward/send arrow in box (right)
        + `<g opacity='${o1}'><rect x='168' y='98' width='24' height='22' rx='5'/><path d='M175 109h12m-5-5l5 5-5 5'/></g>`
        // 12. Large chat bubble with tail (bottom-left)
        + `<g opacity='${o2}'><path d='M10 150c0-3 2-5 5-5h28c3 0 5 2 5 5v16c0 3-2 5-5 5H27l-7 8v-8h-5c-3 0-5-2-5-5z'/><line x1='17' y1='158' x2='40' y2='158'/><line x1='17' y1='164' x2='34' y2='164'/></g>`
        // 13. Video camera (bottom-center-left)
        + `<g opacity='${o1}'><rect x='68' y='152' width='26' height='20' rx='4'/><polygon points='94,155 106,162 94,169'/></g>`
        // 14. Envelope/mail (bottom-center)
        + `<g opacity='${o2}'><rect x='120' y='154' width='28' height='20' rx='3'/><polyline points='120,154 134,167 148,154'/></g>`
        // 15. Sparkle star (bottom-right)
        + `<g opacity='${o1}'><path d='M178 155l4 8 8 3-8 3-4 8-4-8-8-3 8-3z'/></g>`
        + `</g>`
        // Small decorative filled accents
        + `<g fill='${pc}' stroke='none'>`
        + `<path d='M55 30l2 4 4 2-4 2-2 4-2-4-4-2 4-2z' opacity='${o3}'/>`
        + `<path d='M138 40l1.5 3 3 1.5-3 1.5-1.5 3-1.5-3-3-1.5 3-1.5z' opacity='${o3}'/>`
        + `<path d='M192 132l2 4 4 2-4 2-2 4-2-4-4-2 4-2z' opacity='${o3}'/>`
        + `<circle cx='100' cy='82' r='2.5' opacity='${o3}'/>`
        + `<circle cx='48' cy='90' r='2' opacity='${o3}'/>`
        + `<circle cx='158' cy='136' r='2.5' opacity='${o3}'/>`
        + `</g>`
        // Small decorative outlined accents
        + `<g fill='none' stroke='${pc}' stroke-width='1.2'>`
        + `<polygon points='108,35 113,26 118,35' opacity='${o3}'/>`
        + `<polygon points='55,142 60,133 65,142' opacity='${o3}'/>`
        + `<rect x='186' y='38' width='7' height='7' rx='1.5' transform='rotate(45 189.5 41.5)' opacity='${o3}'/>`
        + `<rect x='102' y='148' width='6' height='6' rx='1' opacity='${o3}'/>`
        + `</g>`
        + `</svg>`;
    const encodedSvg = encodeURIComponent(svgRaw);
    // Combine SVG pattern + gradient background so Tailwind classes don't override
    const chatGradient = c.isDark
        ? `linear-gradient(to bottom, ${c.surfaceBg}, ${c.surfaceCard})`
        : 'linear-gradient(to bottom, rgba(249,250,251,0.8), #ffffff)';

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
@keyframes pulse-ring {
    0% { transform: scale(1); opacity: 0.5; }
    70% { transform: scale(1.45); opacity: 0; }
    100% { transform: scale(1.45); opacity: 0; }
}
@keyframes breathe {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.04); }
}
.animate-pulse-ring { animation: pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
.animate-breathe { animation: breathe 3s ease-in-out infinite; }
.safe-area-bottom { margin-bottom: env(safe-area-inset-bottom, 0); }

/* Skeleton shimmer loading */
@keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
}
.shimmer-line {
    background: linear-gradient(90deg, ${c.isDark ? `rgba(${c.focusRgb}, 0.06)` : `rgba(${c.focusRgb}, 0.06)`} 25%, ${c.isDark ? `rgba(${c.focusRgb}, 0.15)` : `rgba(${c.focusRgb}, 0.12)`} 50%, ${c.isDark ? `rgba(${c.focusRgb}, 0.06)` : `rgba(${c.focusRgb}, 0.06)`} 75%);
    background-size: 200% 100%;
    animation: shimmer 1.8s ease-in-out infinite;
    border-radius: 9999px;
}

/* Chat background pattern — branded SVG icons + gradient */
.chat-pattern {
    background-image: url("data:image/svg+xml,${encodedSvg}"), ${chatGradient};
    background-repeat: repeat, no-repeat;
    background-size: 200px 200px, 100% 100%;
}

/* New messages pill */
@keyframes pill-in {
    from { transform: translateY(8px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
}
.new-msg-pill { animation: pill-in 0.25s ease-out; }

/* Font size overrides */
.font-sm .msg-text { font-size: 12px !important; line-height: 1.55 !important; }
.font-lg .msg-text { font-size: 15px !important; line-height: 1.65 !important; }

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

const _aw_tag = 'ai-chat-' + (window.__WIDGET_CONFIG__?.clientId || 'widget').replace(/[^a-z0-9]/gi, '-').toLowerCase();
if (!customElements.get(_aw_tag)) {
    customElements.define(_aw_tag, AIChatWidget);
}

function mountWidget() {
    // Remove any previous widget instances from other clients
    document.querySelectorAll('[data-aw]').forEach(el => el.remove());
    const el = document.createElement(_aw_tag);
    el.setAttribute('data-aw', '1');
    document.body.appendChild(el);
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
    const nudgeBg = c.isDark ? `bg-[${c.surfaceCard}] border-[${c.surfaceBorder}] text-[${c.textPrimary}]` : 'bg-white border-gray-100 text-gray-700';
    const nudgeShadow = c.isDark ? 'shadow-black/30' : 'shadow-black/10';
    const suggestionClasses = c.isDark
        ? `border-[${c.surfaceBorder}] bg-[${c.surfaceCard}] text-[${c.textPrimary}] hover:bg-[${c.surfaceInput}] hover:border-[${c.chipHoverBorder}]`
        : `border-[${c.chipBorder}] bg-[${c.chipFrom}] text-[${c.chipText}] hover:bg-[${c.chipHoverFrom}] hover:border-[${c.chipHoverBorder}]`;
    const menuBg = c.isDark ? `bg-[${c.surfaceCard}]/95 border-[${c.surfaceBorder}]` : 'bg-white/95 border-gray-200/80';
    const menuItemClasses = c.isDark
        ? `text-[${c.textPrimary}] hover:bg-[${c.surfaceInput}]`
        : 'text-gray-700 hover:bg-gray-50';
    const contactBarClasses = c.isDark
        ? `bg-[${c.surfaceCard}]/80 border-[${c.surfaceBorder}]`
        : 'bg-gray-50/60 border-gray-100';
    const contactBtnClasses = c.isDark
        ? `text-[${c.textSecondary}] hover:text-[${c.textPrimary}] hover:bg-[${c.surfaceInput}]`
        : `text-gray-500 hover:text-[${c.cssPrimary}] hover:bg-white`;
    const shimmerBg = c.isDark ? `bg-[${c.surfaceBorder}]/60` : 'bg-gray-100/80';
    const pillClasses = c.isDark
        ? `bg-[${c.surfaceCard}] text-[${c.textPrimary}] border border-[${c.surfaceBorder}] shadow-black/30`
        : 'bg-white text-gray-700 border border-gray-200 shadow-black/10';

    return `import { useState, useRef, useEffect, useCallback } from 'react';
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
    const welcomeMsg = config.welcomeMessage || config.bot?.greeting || '';
    const [typewriterText, setTypewriterText] = useState('');
    const [typewriterDone, setTypewriterDone] = useState(false);

    // New messages pill
    const chatContainerRef = useRef(null);
    const isAtBottomRef = useRef(true);
    const [isAtBottom, setIsAtBottom] = useState(true);
    const [hasNewMessages, setHasNewMessages] = useState(false);

    // Header quick actions menu
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
    const handleSwipeStart = useCallback((e) => {
        swipeStartRef.current = e.touches[0].clientY;
    }, []);
    const handleSwipeMove = useCallback((e) => {
        const diff = e.touches[0].clientY - swipeStartRef.current;
        if (diff > 0) setSwipeY(diff);
    }, []);
    const handleSwipeEnd = useCallback(() => {
        if (swipeY > 80) setIsOpen(false);
        setSwipeY(0);
        swipeStartRef.current = 0;
    }, [swipeY]);

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
        const blob = new Blob([lines.join('\\n\\n')], { type: 'text/plain' });
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

    // Chat panel content (shared between mobile & desktop)
    const chatContent = (
        <>
            {/* Mobile swipe handle */}
            {isMobile && (
                <div className="flex justify-center pt-2 pb-0.5 cursor-grab active:cursor-grabbing ${containerBg}"
                    onTouchStart={handleSwipeStart} onTouchMove={handleSwipeMove} onTouchEnd={handleSwipeEnd}>
                    <div className="w-10 h-1 rounded-full ${c.isDark ? `bg-[${c.surfaceBorder}]` : 'bg-gray-300'}" />
                </div>
            )}

            {/* HEADER */}
            <div className="relative ${c.headerPad} flex items-center justify-between ${c.headerAccent}">
                <div className="absolute inset-0 bg-gradient-to-br from-[${c.headerFrom}] via-[${c.headerVia}] to-[${c.headerTo}]" />${shine}

                <div className="relative flex items-center gap-3">
                    <div className="relative">
                        <div className="w-10 h-10 ${c.avatarHeaderRound} bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-inner shadow-white/10">
                            <Sparkles size={18} className="text-white" />
                        </div>
                        {!isOffline && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[${c.onlineDotBg}] border-[2.5px] border-[${c.onlineDotBorder}] shadow-sm" />
                        )}
                    </div>
                    <div>
                        <h3 className="font-semibold ${c.nameSize} text-white tracking-tight leading-tight">{config.botName || config.bot?.name}</h3>
                        <p className="text-[11px] text-white/65 font-medium">{isOffline ? uiStrings.offline : uiStrings.online}</p>
                    </div>
                </div>
                <div className="relative flex items-center gap-1">
                    <div className="relative" ref={menuRef}>
                        <button onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                            className="p-2 hover:bg-white/15 rounded-xl text-white/50 hover:text-white transition-all duration-200" aria-label="Menu">
                            <MoreVertical size={15} />
                        </button>
                        {showMenu && (
                            <div className="absolute right-0 top-full mt-1.5 w-[168px] rounded-2xl shadow-xl border overflow-hidden z-50 ${menuBg}" style={{ backdropFilter: 'blur(16px)' }}>
                                <button onClick={() => { clearMessages(); setShowMenu(false); }}
                                    className="w-full px-3.5 py-2.5 text-left text-[12px] font-medium flex items-center gap-2.5 transition-colors ${menuItemClasses}">
                                    <Trash2 size={13} /> {uiStrings.newChat}
                                </button>
                                <button onClick={() => { toggleMute(); setShowMenu(false); }}
                                    className="w-full px-3.5 py-2.5 text-left text-[12px] font-medium flex items-center gap-2.5 transition-colors ${menuItemClasses}">
                                    {isMuted ? <Volume2 size={13} /> : <VolumeX size={13} />} {isMuted ? uiStrings.unmute : uiStrings.mute}
                                </button>
                                <button onClick={() => { cycleFontSize(); }}
                                    className="w-full px-3.5 py-2.5 text-left text-[12px] font-medium flex items-center justify-between transition-colors ${menuItemClasses}">
                                    <span className="flex items-center gap-2.5"><Type size={13} /> {uiStrings.fontSize}</span>
                                    <span className="text-[10px] opacity-60 font-bold tracking-wider">{chatFontSize.toUpperCase()}</span>
                                </button>
                                {messages.length > 0 && (
                                    <button onClick={exportChat}
                                        className="w-full px-3.5 py-2.5 text-left text-[12px] font-medium flex items-center gap-2.5 transition-colors ${menuItemClasses}">
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
                <div className="flex items-center gap-1.5 px-4 py-1.5 border-b ${contactBarClasses}">
                    {contacts.phone && (
                        <a href={'tel:' + contacts.phone} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${contactBtnClasses}" target="_blank" rel="noopener">
                            <Phone size={11} /> {uiStrings.call}
                        </a>
                    )}
                    {contacts.email && (
                        <a href={'mailto:' + contacts.email} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${contactBtnClasses}">
                            <Mail size={11} /> Email
                        </a>
                    )}
                    {contacts.website && (
                        <a href={contacts.website} target="_blank" rel="noopener" className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${contactBtnClasses}">
                            <Globe size={11} /> {uiStrings.website}
                        </a>
                    )}
                </div>
            )}

            {/* MESSAGES */}
            <div ref={chatContainerRef} onScroll={handleChatScroll}
                className={\`flex-1 overflow-y-auto px-4 py-4 space-y-1 scrollbar-hide chat-pattern font-\${chatFontSize}\`} aria-live="polite">
                <ChatMessage role="assistant" content={typewriterDone ? welcomeMsg : typewriterText} onImageClick={setExpandedImage}
                    onSpeak={ttsSupported && typewriterDone ? () => speak(welcomeMsg, lang, -1) : null} isSpeaking={speakingIdx === -1} />
                {messages.map((msg, idx) => (
                    <div key={idx}>
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
                                className="flex flex-wrap gap-1.5 ml-9 mt-2 mb-1">
                                {msg.suggestions.map((s, si) => (
                                    <button key={si} onClick={() => { detectLang(s); sendMessage(s); }}
                                        className="px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-all duration-200 cursor-pointer ${suggestionClasses}">
                                        {s}
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </div>
                ))}
                {isTyping && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start gap-2 py-2">
                        <div className="w-7 h-7 ${c.chatAvatarRound} bg-gradient-to-br from-[${c.avatarFrom}] to-[${c.avatarTo}] flex items-center justify-center flex-shrink-0 shadow-sm border border-[${c.avatarBorder}]/50">
                            <Sparkles size={13} className="text-[${c.avatarIcon}]" />
                        </div>
                        <div className="flex-1 max-w-[70%] space-y-2 pt-1">
                            <div className="h-3 shimmer-line ${shimmerBg}" style={{ width: '82%' }} />
                            <div className="h-3 shimmer-line ${shimmerBg}" style={{ width: '61%', animationDelay: '0.15s' }} />
                            <div className="h-3 shimmer-line ${shimmerBg}" style={{ width: '40%', animationDelay: '0.3s' }} />
                        </div>
                    </motion.div>
                )}
                {/* New messages pill */}
                {hasNewMessages && !isAtBottom && (
                    <div className="sticky bottom-2 left-0 right-0 flex justify-center z-10">
                        <button onClick={scrollToBottom}
                            className="new-msg-pill px-3.5 py-1.5 rounded-full text-[11px] font-semibold shadow-lg flex items-center gap-1.5 cursor-pointer transition-all hover:shadow-xl ${pillClasses}">
                            <ArrowDown size={12} /> {uiStrings.newMessages}
                        </button>
                    </div>
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
            <div className="px-4 pt-2 pb-3 border-t ${inputAreaBorder} ${inputAreaBg} space-y-1.5 safe-area-bottom">
                {showQuickReplies && <QuickReplies options={config.quickReplies || config.features?.quickReplies?.starters} onSelect={(t) => sendMessage(t)} />}
                <form onSubmit={handleSubmit} className="flex items-end gap-2">
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                    <button type="button" onClick={() => fileInputRef.current?.click()}
                        className={\`flex-shrink-0 p-2.5 rounded-xl border transition-all duration-200 \${selectedImage ? 'border-[${c.imgActiveBorder}] bg-[${c.imgActiveBg}] text-[${c.imgActiveText}] shadow-sm' : '${c.isDark ? `border-[${c.surfaceBorder}] text-[${c.textSecondary}]` : 'border-gray-200 text-gray-400'} hover:text-[${c.imgHoverText}] hover:border-[${c.imgHoverBorder}] hover:bg-[${c.imgHoverBg}]'}\`}
                        aria-label="Upload photo">
                        <ImagePlus size={16} />
                    </button>
                    {voiceSupported && config.features?.voiceInput !== false && (
                        <button type="button" onClick={handleVoiceToggle}
                            className={\`flex-shrink-0 p-2.5 rounded-xl border transition-all duration-200 \${isListening ? 'border-[${c.imgActiveBorder}] bg-[${c.imgActiveBg}] text-[${c.imgActiveText}] shadow-sm animate-pulse' : '${c.isDark ? `border-[${c.surfaceBorder}] text-[${c.textSecondary}]` : 'border-gray-200 text-gray-400'} hover:text-[${c.imgHoverText}] hover:border-[${c.imgHoverBorder}] hover:bg-[${c.imgHoverBg}]'}\`}
                            aria-label={isListening ? 'Stop recording' : 'Voice input'}>
                            {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                        </button>
                    )}
                    <textarea ref={inputRef} value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={handleKeyDown}
                        placeholder={uiStrings.placeholder}
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

            <div className={\`fixed z-[9999] flex flex-col gap-3 antialiased \${positionClasses}\`} style={{ fontFamily: "${c.font.replace(/'/g, "\\'")}", ...(isMobile && isOpen ? {} : dragStyle) }}>
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
                                ? 'fixed inset-x-0 bottom-0 flex flex-col ${containerBg} shadow-2xl ${containerShadow} rounded-t-3xl overflow-hidden'
                                : 'relative w-[85vw] ${c.widgetMaxW ? `max-w-[${c.widgetMaxW}]` : 'max-w-[360px]'} h-[60vh] ${c.widgetMaxH ? `max-h-[${c.widgetMaxH}]` : 'max-h-[520px]'} ${c.widgetW ? `sm:w-[${c.widgetW}]` : 'sm:w-[360px]'} ${c.widgetH ? `sm:h-[${c.widgetH}]` : 'sm:h-[520px]'} rounded-3xl overflow-hidden flex flex-col ${containerBg} shadow-2xl ${containerShadow} border ${containerBorder}'}
                            style={isMobile ? { height: '90vh', maxHeight: '90vh' } : {}}
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
                            className="max-w-[220px] px-3.5 py-2.5 rounded-2xl shadow-xl ${nudgeShadow} border cursor-pointer relative ${nudgeBg}"
                            onClick={() => { dismissNudge(); setIsOpen(true); }}
                        >
                            <button onClick={(e) => { e.stopPropagation(); dismissNudge(); }}
                                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center transition-colors ${c.isDark ? `bg-[${c.surfaceBorder}] text-[${c.textSecondary}] hover:bg-[${c.surfaceInput}]` : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600'}">
                                <X size={10} />
                            </button>
                            <p className="text-[12.5px] leading-relaxed pr-2">{nudgeMessage}</p>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Feature 5: Toggle button with breathing animation + pulse ring + unread badge */}
                {(!isMobile || !isOpen) && (
                    <div className="relative self-end">
                        {!isOpen && unreadCount > 0 && (
                            <span className="absolute inset-0 ${c.toggleRadius} bg-gradient-to-br from-[${c.toggleFrom}] to-[${c.toggleTo}] animate-pulse-ring" />
                        )}
                        <motion.button
                            whileHover={isDragging ? {} : { scale: 1.08, boxShadow: '0 8px 30px rgba(${c.toggleHoverRgb}, 0.35)' }}
                            whileTap={isDragging ? {} : { scale: 0.92 }}
                            onClick={() => { if (!isDragging) setIsOpen(!isOpen); }}
                            onDoubleClick={resetPosition}
                            onPointerDown={onPointerDown}
                            onPointerMove={onPointerMove}
                            onPointerUp={onPointerUp}
                            className={\`${c.toggleSize} ${c.toggleRadius} flex items-center justify-center text-white shadow-lg shadow-[${c.toggleShadow}]/30 bg-gradient-to-br from-[${c.toggleFrom}] via-[${c.toggleVia}] to-[${c.toggleTo}] border border-white/10 \${!isOpen ? 'animate-breathe' : ''}\`}
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
                            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border-2 ${c.isDark ? `border-[${c.surfaceBg}]` : 'border-white'} shadow-sm pointer-events-none">
                                {unreadCount}
                            </span>
                        )}
                    </div>
                )}
            </div>
        </>
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

    return `import { memo, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { User, Copy, Check, RotateCcw, ZoomIn, Sparkles, Volume2, VolumeX } from 'lucide-preact';

function formatRelativeTime(timestamp) {
    if (!timestamp) return '';
    const diff = Date.now() - timestamp;
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return \`\${minutes}m\`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return \`\${hours}h\`;
    return \`\${Math.floor(hours / 24)}d\`;
}

function ChatMessage({ role, content, timestamp, isError, onRetry, imageUrl, onImageClick, onSpeak, isSpeaking }) {
    const isBot = role === 'assistant';
    const [copied, setCopied] = useState(false);

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
                <div className="w-7 h-7 ${c.chatAvatarRound} bg-gradient-to-br from-[${c.avatarFrom}] to-[${c.avatarTo}] flex items-center justify-center flex-shrink-0 shadow-sm border border-[${c.avatarBorder}]/50">
                    <Sparkles size={13} className="text-[${c.avatarIcon}]" />
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
                        <div className="max-w-none msg-text [&>p]:my-0 [&>p+p]:mt-2 [&>ul]:my-1.5 [&>ol]:my-1.5 [&>ul]:pl-4 [&>ol]:pl-4 [&>ul]:list-disc [&>ol]:list-decimal">
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
                    {isBot && !isError && content && onSpeak && (
                        <button onClick={() => onSpeak(content)}
                            className={\`p-0.5 transition-all duration-200 \${isSpeaking ? 'text-[${c.feedbackActive}] opacity-100' : 'opacity-0 group-hover:opacity-100 ${copyDefault} hover:text-[${c.copyHover}]'}\`}
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
    const cardBg = c.isDark
        ? `bg-[${c.surfaceCard}]/80 border-[${c.surfaceBorder}]/80 hover:border-[${c.chipHoverBorder}] hover:bg-[${c.surfaceInput}]`
        : `bg-white/80 border-[${c.chipBorder}] hover:border-[${c.chipHoverBorder}] hover:bg-[${c.chipHoverFrom}]/40`;
    const cardText = c.isDark ? `text-[${c.textPrimary}]` : `text-[${c.chipText}]`;
    const iconBg = c.isDark
        ? `bg-gradient-to-br from-[${c.cssPrimary}]/20 to-[${c.cssPrimary}]/10`
        : `bg-gradient-to-br from-[${c.cssPrimary}]/[0.12] to-[${c.cssPrimary}]/[0.05]`;
    const iconColor = `text-[${c.cssPrimary}]`;
    const glowHover = c.isDark
        ? `group-hover:shadow-[0_0_20px_rgba(${c.focusRgb.replace(/ /g, '')},0.08)]`
        : `group-hover:shadow-[0_2px_16px_rgba(${c.focusRgb.replace(/ /g, '')},0.10)]`;

    return `import { motion } from 'framer-motion';
import { MessageCircle } from 'lucide-preact';

export default function QuickReplies({ options, onSelect }) {
    if (!options || options.length === 0) return null;

    return (
        <div className="flex flex-col gap-2">
            {options.map((option, idx) => (
                <motion.button
                    key={idx}
                    initial={{ opacity: 0, y: 10, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 0.1 + idx * 0.07, type: 'spring', stiffness: 380, damping: 26 }}
                    whileHover={{ scale: 1.015, y: -1 }}
                    whileTap={{ scale: 0.985 }}
                    onClick={() => onSelect(option)}
                    className="group relative w-full rounded-2xl border overflow-hidden transition-all duration-300 cursor-pointer text-left shadow-sm hover:shadow-md ${cardBg} ${glowHover}"
                    style={{ backdropFilter: 'blur(8px)' }}
                >
                    <div className="relative flex items-center gap-3 px-3.5 py-2.5">
                        <span className="flex-shrink-0 w-7 h-7 rounded-xl ${iconBg} flex items-center justify-center shadow-sm">
                            <MessageCircle size={13} className="${iconColor}" />
                        </span>
                        <span className="text-[12px] font-medium leading-snug ${cardText}">{option}</span>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-r from-[${c.cssPrimary}]/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
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

function genRichBlocks(c) {
    const cardBg = c.isDark ? `bg-[${c.surfaceCard}] border-[${c.surfaceBorder}]` : 'bg-white border-gray-100';
    const cardTitle = c.isDark ? `text-[${c.textPrimary}]` : 'text-gray-800';
    const cardDesc = c.isDark ? `text-[${c.textSecondary}]` : 'text-gray-500';
    const cardBtnBg = c.isDark ? `bg-[${c.surfaceInput}] text-[${c.textPrimary}] hover:bg-[${c.surfaceInputFocus}]` : `bg-[${c.chipFrom}] text-[${c.chipText}] hover:bg-[${c.chipHoverFrom}]`;
    const btnGroupBg = c.isDark
        ? `border-[${c.surfaceBorder}] bg-[${c.surfaceCard}] text-[${c.textPrimary}] hover:bg-[${c.surfaceInput}]`
        : `border-[${c.chipBorder}] bg-[${c.chipFrom}] text-[${c.chipText}] hover:bg-[${c.chipHoverFrom}] hover:border-[${c.chipHoverBorder}]`;
    const formBg = c.isDark ? `bg-[${c.surfaceCard}] border-[${c.surfaceBorder}]` : 'bg-gray-50 border-gray-100';
    const formInputBg = c.isDark ? `bg-[${c.surfaceInput}] border-[${c.surfaceBorder}] text-[${c.textPrimary}] placeholder-[${c.textMuted}] focus:border-[${c.focusBorder}]` : `bg-white border-gray-200 text-gray-800 placeholder-gray-400 focus:border-[${c.focusBorder}]`;

    return `import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, ChevronLeft, ChevronRight } from 'lucide-preact';

function Card({ card, onAction }) {
    return (
        <div className="flex-shrink-0 w-[200px] rounded-2xl border overflow-hidden ${cardBg} shadow-sm">
            {card.image && (
                <img src={card.image} alt={card.title || ''} className="w-full h-[100px] object-cover" loading="lazy" />
            )}
            <div className="p-3 space-y-1.5">
                <h4 className="font-semibold text-[12.5px] leading-tight ${cardTitle}">{card.title}</h4>
                {card.description && <p className="text-[11px] leading-relaxed ${cardDesc}">{card.description}</p>}
                {card.button && (
                    <button onClick={() => onAction?.(card.button.url, card.button.label)}
                        className="w-full mt-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${cardBtnBg} flex items-center justify-center gap-1">
                        {card.button.label} <ExternalLink size={10} />
                    </button>
                )}
            </div>
        </div>
    );
}

function ButtonGroup({ buttons, onAction }) {
    return (
        <div className="flex flex-wrap gap-1.5">
            {buttons.map((btn, i) => (
                <button key={i} onClick={() => onAction?.(btn.url, btn.label)}
                    className="px-2.5 py-1.5 rounded-xl border text-[11px] font-medium transition-all cursor-pointer ${btnGroupBg}">
                    {btn.label}
                </button>
            ))}
        </div>
    );
}

function LeadForm({ fields, submitLabel, onSubmit }) {
    const [values, setValues] = useState({});
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = useCallback((e) => {
        e.preventDefault();
        const filled = Object.values(values).filter(v => v?.trim()).length;
        if (filled === 0) return;
        setSubmitted(true);
        const formText = fields.map(f => f.label + ': ' + (values[f.key] || '—')).join('\\n');
        onSubmit?.('form_submit', formText);
    }, [values, fields, onSubmit]);

    if (submitted) {
        return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="rounded-2xl border p-3 text-center ${formBg}">
                <p className="text-[12px] font-medium ${c.isDark ? `text-[${c.textPrimary}]` : 'text-gray-700'}">✓ Submitted</p>
            </motion.div>
        );
    }

    return (
        <motion.form initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
            onSubmit={handleSubmit} className="rounded-2xl border p-3 space-y-2 ${formBg}">
            {fields.map((f) => (
                <input key={f.key} type={f.key === 'email' ? 'email' : f.key === 'phone' ? 'tel' : 'text'}
                    placeholder={f.label}
                    value={values[f.key] || ''}
                    onChange={(e) => setValues(prev => ({ ...prev, [f.key]: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border text-[12px] focus:outline-none focus:ring-1 focus:ring-[${c.focusRing}] transition-all ${formInputBg}"
                />
            ))}
            <button type="submit"
                className="w-full py-2 rounded-xl text-[12px] font-semibold text-white bg-[${c.sendFrom}] hover:bg-[${c.sendHoverFrom}] transition-all shadow-sm">
                {submitLabel}
            </button>
        </motion.form>
    );
}

export default function RichBlocks({ blocks, onAction }) {
    if (!blocks || blocks.length === 0) return null;

    return (
        <div className="ml-9 mt-1.5 mb-1 space-y-2">
            {blocks.map((block, idx) => {
                if (block.type === 'card') {
                    return <div key={idx} className="flex"><Card card={block} onAction={onAction} /></div>;
                }
                if (block.type === 'carousel') {
                    return (
                        <div key={idx} className="overflow-x-auto scrollbar-hide -mr-4 pr-4">
                            <div className="flex gap-2" style={{ minWidth: 'max-content' }}>
                                {block.items.map((card, ci) => <Card key={ci} card={card} onAction={onAction} />)}
                            </div>
                        </div>
                    );
                }
                if (block.type === 'button_group') {
                    return <ButtonGroup key={idx} buttons={block.buttons} onAction={onAction} />;
                }
                if (block.type === 'form') {
                    return <LeadForm key={idx} fields={block.fields} submitLabel={block.submitLabel} onSubmit={onAction} />;
                }
                return null;
            })}
        </div>
    );
}
`;
}

// ── Write Files ─────────────────────────────────────────────────────────
const srcDir = path.join(CLIENTS_DIR, clientId, 'src');
const compDir = path.join(srcDir, 'components');
fs.mkdirSync(compDir, { recursive: true });

fs.writeFileSync(path.join(srcDir, 'index.css'), genCSS(c));
fs.writeFileSync(path.join(srcDir, 'main.jsx'), genMainJSX(c));
fs.writeFileSync(path.join(compDir, 'Widget.jsx'), genWidget(c));
fs.writeFileSync(path.join(compDir, 'ChatMessage.jsx'), genChatMessage(c));
fs.writeFileSync(path.join(compDir, 'QuickReplies.jsx'), genQuickReplies(c));
fs.writeFileSync(path.join(compDir, 'MessageFeedback.jsx'), genFeedback(c));
fs.writeFileSync(path.join(compDir, 'RichBlocks.jsx'), genRichBlocks(c));

console.log(`✅ ${clientId}: 7 themed source files generated from theme.json`);
console.log(`   → ${srcDir}/index.css`);
console.log(`   → ${srcDir}/main.jsx`);
console.log(`   → ${compDir}/Widget.jsx`);
console.log(`   → ${compDir}/ChatMessage.jsx`);
console.log(`   → ${compDir}/QuickReplies.jsx`);
console.log(`   → ${compDir}/MessageFeedback.jsx`);
console.log(`   → ${compDir}/RichBlocks.jsx`);
console.log(`\nNext: node .agent/widget-builder/scripts/build.js ${clientId}`);
