import { useState, useEffect, useCallback, useRef } from 'preact/hooks';

export function useChat(widgetConfig) {
    // Use passed config or fallback to window
    const config = widgetConfig || window.__WIDGET_CONFIG__ || {};

    const [messages, setMessages] = useState(() => {
        if (config.features?.persistHistory) {
            try {
                const saved = localStorage.getItem(`chat_${config.clientId}`);
                return saved ? JSON.parse(saved) : [];
            } catch { return []; }
        }
        return [];
    });

    const [isLoading, setIsLoading] = useState(false);
    const [typing, setTyping] = useState(false);
    const [sessionId] = useState(() => {
        let id = localStorage.getItem(`session_${config.clientId}`);
        if (!id) {
            id = `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
            localStorage.setItem(`session_${config.clientId}`, id);
        }
        return id;
    });

    // Lead collection state
    const [leadCollected, setLeadCollected] = useState(() => {
        return localStorage.getItem(`lead_${config.clientId}`) === 'true';
    });
    const [showLeadForm, setShowLeadForm] = useState(false);

    // Persist messages
    useEffect(() => {
        if (config.features?.persistHistory && messages.length > 0) {
            localStorage.setItem(`chat_${config.clientId}`, JSON.stringify(messages));
        }
    }, [messages]);

    // Lead collection trigger
    useEffect(() => {
        if (!config.features?.leadCollection || leadCollected) return;

        const trigger = config.features.leadCollectionTrigger;
        if (trigger === 'before-chat' && messages.length === 0) {
            setShowLeadForm(true);
        } else if (trigger === 'after-n-messages') {
            const userMsgCount = messages.filter(m => m.role === 'user').length;
            if (userMsgCount >= (config.features.leadCollectionMessages || 3)) {
                setShowLeadForm(true);
            }
        }
    }, [messages, leadCollected]);

    // Streaming message sender
    const sendMessageStreaming = useCallback(async (text) => {
        if (!text.trim()) return;

        const userMsg = { role: 'user', content: text, timestamp: Date.now() };
        setMessages(prev => [...prev, userMsg]);
        setIsLoading(true);
        setTyping(true);

        const botMsgId = Date.now();
        setMessages(prev => [...prev, { id: botMsgId, role: 'assistant', content: '', streaming: true, timestamp: botMsgId }]);

        try {
            const endpoint = config.streamEndpoint || config.apiEndpoint;
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clientId: config.clientId,
                    message: text,
                    conversationHistory: messages.slice(-10),
                    sessionId,
                    metadata: { page: window.location.href, userAgent: navigator.userAgent }
                })
            });

            if (!response.ok) throw new Error('Stream failed');

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullText = '';

            setTyping(false);

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') break;
                        try {
                            const parsed = JSON.parse(data);
                            if (parsed.token) {
                                fullText += parsed.token;
                                setMessages(prev => prev.map(m =>
                                    m.id === botMsgId ? { ...m, content: fullText } : m
                                ));
                            }
                        } catch { }
                    }
                }
            }

            setMessages(prev => prev.map(m =>
                m.id === botMsgId ? { ...m, streaming: false } : m
            ));

        } catch (err) {
            console.error('Streaming error:', err);
            setMessages(prev => prev.map(m =>
                m.id === botMsgId ? { ...m, content: 'Sorry, an error occurred. Please try again.', streaming: false } : m
            ));
        } finally {
            setIsLoading(false);
            setTyping(false);
        }
    }, [messages, sessionId]);

    // Standard (non-streaming) message sender
    const sendMessageStandard = useCallback(async (text) => {
        if (!text.trim()) return;

        const userMsg = { role: 'user', content: text, timestamp: Date.now() };
        setMessages(prev => [...prev, userMsg]);
        setIsLoading(true);
        setTyping(true);

        try {
            const response = await fetch(config.apiEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clientId: config.clientId,
                    message: text,
                    conversationHistory: messages.slice(-10),
                    sessionId,
                    metadata: { page: window.location.href }
                })
            });

            const data = await response.json();

            if (data.text) {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: data.text,
                    timestamp: Date.now()
                }]);
            }
        } catch (err) {
            console.error('Chat error:', err);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Sorry, an error occurred. Please try again.',
                timestamp: Date.now()
            }]);
        } finally {
            setIsLoading(false);
            setTyping(false);
        }
    }, [messages, sessionId]);

    // Feedback sender
    const sendFeedback = useCallback(async (messageIndex, rating) => {
        try {
            const feedbackUrl = config.feedbackEndpoint || '/api/feedback';
            await fetch(feedbackUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clientId: config.clientId,
                    sessionId,
                    messageIndex,
                    rating,
                    messageContent: messages[messageIndex]?.content || ''
                })
            });

            setMessages(prev => prev.map((m, i) =>
                i === messageIndex ? { ...m, feedback: rating } : m
            ));
        } catch (err) {
            console.error('Feedback failed:', err);
        }
    }, [sessionId, messages]);

    // Lead submission
    const submitLead = useCallback(async (leadData) => {
        try {
            const leadsUrl = config.leadsEndpoint || '/api/leads';
            await fetch(leadsUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clientId: config.clientId,
                    sessionId,
                    ...leadData,
                    page: window.location.href,
                    timestamp: new Date().toISOString()
                })
            });

            setLeadCollected(true);
            setShowLeadForm(false);
            localStorage.setItem(`lead_${config.clientId}`, 'true');
        } catch (err) {
            console.error('Lead submission failed:', err);
            throw err;
        }
    }, [sessionId]);

    // Clear history
    const clearHistory = useCallback(() => {
        setMessages([]);
        localStorage.removeItem(`chat_${config.clientId}`);
    }, []);

    // Manual message addition (for greetings, etc.)
    const addMessage = useCallback((msg) => {
        setMessages(prev => [...prev, { ...msg, timestamp: Date.now() }]);
    }, []);

    return {
        messages,
        sendMessage: config.features?.streaming ? sendMessageStreaming : sendMessageStandard,
        addMessage,
        sendFeedback,
        submitLead,
        isLoading,
        typing,
        starters: config.quickRepliesData || [],
        showLeadForm,
        setShowLeadForm,
        leadCollected,
        clearHistory
    };
}
