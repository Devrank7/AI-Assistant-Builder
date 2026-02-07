import { useState, useCallback, useRef } from 'react';

export default function useChat(config) {
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const sessionIdRef = useRef(`session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);

    const sendMessage = useCallback(async (content) => {
        // Add User Message
        const userMsg = { role: 'user', content };
        setMessages((prev) => [...prev, userMsg]);
        setIsLoading(true);
        setIsTyping(true);

        try {
            // Stream Response - send format matching /api/chat/stream expectations
            const response = await fetch('/api/chat/stream', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    clientId: config.clientId,
                    message: content,
                    conversationHistory: messages,
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

            // Add Bot Message Placeholder
            setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);
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
                                    newMsgs[newMsgs.length - 1] = { ...newMsgs[newMsgs.length - 1], content: botContent };
                                    return newMsgs;
                                });
                            }
                        } catch (e) {
                            // Skip unparseable chunks
                        }
                    }
                }
            }

        } catch (error) {
            console.error('Chat Error:', error);
            setMessages((prev) => [
                ...prev,
                { role: 'assistant', content: 'Connection error. Please try again.' }
            ]);
        } finally {
            setIsLoading(false);
            setIsTyping(false);
        }
    }, [messages, config.clientId]);

    return {
        messages,
        sendMessage,
        isLoading,
        isTyping
    };
}
