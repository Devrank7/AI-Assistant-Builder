import { useState, useCallback, useRef, useEffect } from 'react';

function playNotificationSound() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        osc.type = 'sine';
        gain.gain.value = 0.08;
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.25);
    } catch (e) {}
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = reader.result;
            const base64 = dataUrl.split(',')[1];
            resolve({ data: base64, mimeType: file.type, dataUrl });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
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

    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    // Persist messages (strip imageUrl to save space)
    useEffect(() => {
        try {
            const messagesToSave = messages.slice(-50).map((m) => {
                const { imageUrl, ...rest } = m;
                return rest;
            });
            localStorage.setItem(storageKey, JSON.stringify(messagesToSave));
        } catch {}
    }, [messages, storageKey]);

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
        async (content, historyOverride, imageFile) => {
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

            // Process image if provided
            let imageData = null;
            let imageUrl = null;

            if (imageFile) {
                try {
                    const result = await fileToBase64(imageFile);
                    imageData = { data: result.data, mimeType: result.mimeType };
                    imageUrl = result.dataUrl;
                } catch (e) {
                    console.error('Failed to process image:', e);
                }
            }

            const userMsg = {
                role: 'user',
                content,
                timestamp: Date.now(),
                ...(imageUrl && { imageUrl }),
            };
            setMessages((prev) => [...prev, userMsg]);
            setIsLoading(true);
            setIsTyping(true);

            try {
                const history = historyOverride !== undefined ? historyOverride : messagesRef.current;

                const body = {
                    clientId: config.clientId,
                    message: content,
                    conversationHistory: history
                        .filter((m) => !m.isError)
                        .map((m) => ({ role: m.role, content: m.content })),
                    sessionId: sessionIdRef.current,
                };

                // Add image data if present
                if (imageData) {
                    body.image = imageData;
                }

                const response = await fetch('/api/chat/stream', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
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
                            } catch (e) {}
                        }
                    }
                }

                if (document.hidden && config.features?.sound !== false) {
                    playNotificationSound();
                }
            } catch (error) {
                console.error('Chat Error:', error);
                setMessages((prev) => {
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
