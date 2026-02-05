import { useState, useCallback, useEffect } from 'preact/hooks';

export function useChat(config) {
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [typing, setTyping] = useState(false);

    // Generate unique session ID (persists for this browser session)
    const [sessionId] = useState(() => {
        const storageKey = `session_${config.clientId}`;
        let id = sessionStorage.getItem(storageKey);
        if (!id) {
            id = `${config.clientId}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
            sessionStorage.setItem(storageKey, id);
        }
        return id;
    });

    // Load history from local storage
    useEffect(() => {
        if (config.features?.persistHistory) {
            const saved = localStorage.getItem(`chat_${config.clientId}`);
            if (saved) {
                setMessages(JSON.parse(saved));
            } else if (config.bot?.greeting) {
                setMessages([{ role: 'assistant', content: config.bot.greeting }]);
            }
        } else if (config.bot?.greeting) {
            setMessages([{ role: 'assistant', content: config.bot.greeting }]);
        }
    }, [config.clientId]);

    // Save history
    useEffect(() => {
        if (config.features?.persistHistory && messages.length > 0) {
            localStorage.setItem(`chat_${config.clientId}`, JSON.stringify(messages));
        }
    }, [messages, config.clientId]);

    const sendMessage = useCallback(async (text) => {
        const userMsg = { role: 'user', content: text };
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
                    sessionId: sessionId,
                    metadata: {
                        page: typeof window !== 'undefined' ? window.location.href : '',
                        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : ''
                    }
                })
            });

            const data = await response.json();

            setTyping(false);

            if (data.success) {
                const botMsg = { role: 'assistant', content: data.response };
                setMessages(prev => [...prev, botMsg]);
            } else {
                throw new Error(data.error);
            }
        } catch (err) {
            console.error(err);
            setTyping(false);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Sorry, I encountered an error. Please try again.'
            }]);
        } finally {
            setIsLoading(false);
        }
    }, [config, messages]);

    return {
        messages,
        sendMessage,
        isLoading,
        typing,
        starters: config.starterQuestions || []
    };
}
