import { useState, useCallback, useRef, useEffect } from 'react';

/** Play a subtle notification beep via Web Audio API */
function playNotificationSound() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 800;
        osc.type = 'sine';
        gain.gain.value = 0.1;
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
    } catch (e) {
        // Audio not supported
    }
}

export default function useChat(config) {
    const storageKey = `aiwidget_${config.clientId}_messages`;

    const [messages, setMessages] = useState(() => {
        try {
            const saved = localStorage.getItem(storageKey);
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });
    const [isLoading, setIsLoading] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [isOffline, setIsOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false);
    const sessionIdRef = useRef(`session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
    const messagesRef = useRef(messages);

    // Keep ref in sync with state
    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    // Persist messages to localStorage (keep last 50)
    useEffect(() => {
        try {
            localStorage.setItem(storageKey, JSON.stringify(messages.slice(-50)));
        } catch {
            /* quota exceeded */
        }
    }, [messages, storageKey]);

    // Online/offline detection
    useEffect(() => {
        const goOnline = () => setIsOffline(false);
        const goOffline = () => setIsOffline(true);
        window.addEventListener('online', goOnline);
        window.addEventListener('offline', goOffline);
        return () => {
            window.removeEventListener('online', goOnline);
            window.removeEventListener('offline', goOffline);
        };
    }, []);

    const sendMessage = useCallback(
        async (content, historyOverride) => {
            if (isOffline) {
                setMessages((prev) => [
                    ...prev,
                    { role: 'user', content, timestamp: Date.now() },
                    {
                        role: 'assistant',
                        content: 'You are offline. Please check your connection and try again.',
                        timestamp: Date.now(),
                        isError: true,
                    },
                ]);
                return;
            }

            const userMsg = { role: 'user', content, timestamp: Date.now() };
            setMessages((prev) => [...prev, userMsg]);
            setIsLoading(true);
            setIsTyping(true);

            try {
                const history = historyOverride !== undefined ? historyOverride : messagesRef.current;
                const response = await fetch('/api/chat/stream', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        clientId: config.clientId,
                        message: content,
                        conversationHistory: history
                            .filter((m) => !m.isError)
                            .map((m) => ({ role: m.role, content: m.content })),
                        sessionId: sessionIdRef.current,
                    }),
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error || 'Stream failed');
                }

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let botContent = '';

                // Add bot message placeholder
                setMessages((prev) => [...prev, { role: 'assistant', content: '', timestamp: Date.now() }]);
                setIsTyping(false);

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value, { stream: true });
                    const lines = chunk.split('\n\n');

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const payload = line.slice(6);
                            if (payload === '[DONE]') break;
                            try {
                                const data = JSON.parse(payload);
                                if (data.token) {
                                    botContent += data.token;
                                    setMessages((prev) => {
                                        const newMsgs = [...prev];
                                        newMsgs[newMsgs.length - 1] = {
                                            ...newMsgs[newMsgs.length - 1],
                                            content: botContent,
                                        };
                                        return newMsgs;
                                    });
                                }
                            } catch (e) {
                                // Skip unparseable chunks
                            }
                        }
                    }
                }

                // Play notification sound if tab is not focused
                if (document.hidden && config.features?.sound !== false) {
                    playNotificationSound();
                }
            } catch (error) {
                console.error('Chat Error:', error);
                setMessages((prev) => {
                    // Remove empty bot placeholder if it exists
                    const cleaned = prev.filter((m) => !(m.role === 'assistant' && m.content === ''));
                    return [
                        ...cleaned,
                        {
                            role: 'assistant',
                            content: 'Connection error. Please try again.',
                            timestamp: Date.now(),
                            isError: true,
                        },
                    ];
                });
            } finally {
                setIsLoading(false);
                setIsTyping(false);
            }
        },
        [config.clientId, config.features?.sound, isOffline]
    );

    const retryLastMessage = useCallback(() => {
        const msgs = messagesRef.current;
        for (let i = msgs.length - 1; i >= 0; i--) {
            if (msgs[i].role === 'user') {
                const content = msgs[i].content;
                const history = msgs.slice(0, i);
                setMessages(history);
                sendMessage(content, history);
                return;
            }
        }
    }, [sendMessage]);

    const clearMessages = useCallback(() => {
        setMessages([]);
        try {
            localStorage.removeItem(storageKey);
        } catch {}
        sessionIdRef.current = `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    }, [storageKey]);

    return {
        messages,
        sendMessage,
        isLoading,
        isTyping,
        isOffline,
        retryLastMessage,
        clearMessages,
        sessionId: sessionIdRef.current,
    };
}
