import { useState, useCallback, useRef, useEffect } from 'react';

const SpeechRecognition = typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

export default function useVoice(lang = 'uk-UA') {
    const isSupported = Boolean(SpeechRecognition);
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const recognitionRef = useRef(null);
    const onResultRef = useRef(null);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (recognitionRef.current) {
                try { recognitionRef.current.abort(); } catch (e) {}
                recognitionRef.current = null;
            }
        };
    }, []);

    const startListening = useCallback((onResult) => {
        if (!isSupported) return;

        // Store callback
        onResultRef.current = onResult;

        // Stop any existing session
        if (recognitionRef.current) {
            try { recognitionRef.current.abort(); } catch (e) {}
        }

        const recognition = new SpeechRecognition();
        recognition.lang = lang;
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        recognition.onresult = (event) => {
            let interim = '';
            let final = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const t = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    final += t;
                } else {
                    interim += t;
                }
            }
            const text = final || interim;
            setTranscript(text);
            if (final && onResultRef.current) {
                onResultRef.current(final);
            }
        };

        recognition.onend = () => {
            setIsListening(false);
            recognitionRef.current = null;
        };

        recognition.onerror = (event) => {
            // 'no-speech' and 'aborted' are not real errors
            if (event.error !== 'no-speech' && event.error !== 'aborted') {
                console.warn('Speech recognition error:', event.error);
            }
            setIsListening(false);
            recognitionRef.current = null;
        };

        recognitionRef.current = recognition;
        setTranscript('');
        setIsListening(true);

        try {
            recognition.start();
        } catch (e) {
            setIsListening(false);
            recognitionRef.current = null;
        }
    }, [isSupported, lang]);

    const stopListening = useCallback(() => {
        if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch (e) {}
        }
        setIsListening(false);
    }, []);

    return { isListening, isSupported, transcript, startListening, stopListening };
}
