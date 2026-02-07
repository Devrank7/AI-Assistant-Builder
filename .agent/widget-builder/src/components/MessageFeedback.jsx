import { useState } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-preact';

export default function MessageFeedback({ messageIndex, sessionId, clientId }) {
    const storageKey = `aiwidget_feedback_${clientId}_${sessionId}_${messageIndex}`;

    const [rating, setRating] = useState(() => {
        try {
            return localStorage.getItem(storageKey) || null;
        } catch {
            return null;
        }
    });

    const handleRate = (value) => {
        const newRating = rating === value ? null : value;
        setRating(newRating);
        try {
            if (newRating) {
                localStorage.setItem(storageKey, newRating);
            } else {
                localStorage.removeItem(storageKey);
            }
        } catch {}

        // Try posting to API (fire-and-forget)
        fetch('/api/feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clientId, sessionId, messageIndex, rating: newRating }),
        }).catch(() => {});
    };

    return (
        <div className="flex items-center gap-1 mt-0.5 ml-10">
            <button
                onClick={() => handleRate('up')}
                className={`p-1 rounded transition-colors ${
                    rating === 'up' ? 'text-emerald-400' : 'text-white/20 hover:text-white/40'
                }`}
                aria-label="Helpful"
            >
                <ThumbsUp size={12} />
            </button>
            <button
                onClick={() => handleRate('down')}
                className={`p-1 rounded transition-colors ${
                    rating === 'down' ? 'text-red-400' : 'text-white/20 hover:text-white/40'
                }`}
                aria-label="Not helpful"
            >
                <ThumbsDown size={12} />
            </button>
        </div>
    );
}
