import { useState } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-preact';

export default function MessageFeedback({ messageIndex, sessionId, clientId }) {
    const storageKey = `aiwidget_feedback_${clientId}_${sessionId}_${messageIndex}`;

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
                className={`p-0.5 rounded transition-colors ${rating === 'up' ? 'text-[#1b5968]' : 'text-gray-300 hover:text-[#769ba4]'}`}
                aria-label="Helpful">
                <ThumbsUp size={11} />
            </button>
            <button onClick={() => handleRate('down')}
                className={`p-0.5 rounded transition-colors ${rating === 'down' ? 'text-red-400' : 'text-gray-300 hover:text-red-300'}`}
                aria-label="Not helpful">
                <ThumbsDown size={11} />
            </button>
        </div>
    );
}
