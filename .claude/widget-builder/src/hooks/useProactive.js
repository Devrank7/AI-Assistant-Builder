import { useState, useEffect, useCallback, useRef } from 'react';

export default function useProactive(config, isOpen) {
    const [showNudge, setShowNudge] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const timerRef = useRef(null);
    const hasShownRef = useRef(false);

    const proactive = config.features?.proactive;
    const enabled = proactive !== false;
    const delay = (typeof proactive === 'object' ? proactive?.delay : null) || 3;

    // Compute nudge message once (stable — derived from config, not state)
    const nudgeMessage = (() => {
        if (!enabled) return null;
        if (typeof proactive === 'object' && proactive?.message) {
            return proactive.message;
        }
        const welcome = config.welcomeMessage || config.botName || config.bot?.greeting || '';
        if (welcome.length > 60) {
            const short = welcome.replace(/\*\*/g, '').slice(0, 57);
            return short.slice(0, short.lastIndexOf(' ')) + '...';
        }
        return welcome.replace(/\*\*/g, '') || 'Need help? Ask me anything!';
    })();

    // Show nudge when widget is closed (persistent — always comes back)
    useEffect(() => {
        if (!enabled || !nudgeMessage) return;

        if (isOpen) {
            // Hide while chat is open
            setShowNudge(false);
            setUnreadCount(0);
            clearTimeout(timerRef.current);
        } else {
            // First appearance: fast (1.5s) so user sees it before clicking toggle
            // Subsequent appearances (after closing widget): use configured delay
            const showDelay = !hasShownRef.current ? 1500 : delay * 1000;
            timerRef.current = setTimeout(() => {
                hasShownRef.current = true;
                setShowNudge(true);
                setUnreadCount(1);
            }, showDelay);
        }
        return () => clearTimeout(timerRef.current);
    }, [isOpen, enabled, delay, nudgeMessage]);

    // Temporary dismiss — hides for 30 seconds, then comes back
    const dismissNudge = useCallback(() => {
        setShowNudge(false);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            if (!enabled) return;
            setShowNudge(true);
            setUnreadCount(1);
        }, 30000);
    }, [enabled]);

    return { showNudge, nudgeMessage, unreadCount, dismissNudge };
}
