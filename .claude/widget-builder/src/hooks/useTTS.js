import { useState, useCallback, useRef, useEffect } from 'react';

const LANG_MAP = { uk: 'uk-UA', ru: 'ru-RU', ar: 'ar-SA', en: 'en-US' };

// Preferred female/assistant voices by priority (case-insensitive substring match)
const PREFERRED_VOICES = {
    'en-US': ['samantha', 'google us english', 'microsoft zira', 'karen', 'tessa', 'fiona', 'victoria', 'female'],
    'en-GB': ['google uk english female', 'kate', 'serena', 'female'],
    'ru-RU': ['milena', 'google русский', 'microsoft irina', 'yandex', 'female', 'женский'],
    'uk-UA': ['lesya', 'google українська', 'female', 'жіночий'],
    'ar-SA': ['maged', 'google العربية', 'laila', 'female'],
};

function pickVoice(voices, langCode) {
    const langVoices = voices.filter(v => v.lang.startsWith(langCode.split('-')[0]));
    if (langVoices.length === 0) return null;

    const prefs = PREFERRED_VOICES[langCode] || PREFERRED_VOICES['en-US'];
    for (const pref of prefs) {
        const match = langVoices.find(v => v.name.toLowerCase().includes(pref));
        if (match) return match;
    }
    const female = langVoices.find(v => v.name.toLowerCase().includes('female'));
    return female || langVoices[0];
}

function cleanText(text) {
    return text
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/[#_~`\[\]]/g, '')
        .replace(/\(http[^)]*\)/g, '')
        .replace(/https?:\/\/\S+/g, '');
}

export default function useTTS() {
    const [speakingIdx, setSpeakingIdx] = useState(null);
    const browserSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
    const voicesRef = useRef([]);
    const speakingIdxRef = useRef(null);
    const audioRef = useRef(null);
    const abortRef = useRef(null);

    useEffect(() => {
        if (!browserSupported) return;
        const load = () => { voicesRef.current = window.speechSynthesis.getVoices(); };
        load();
        window.speechSynthesis.addEventListener('voiceschanged', load);
        return () => window.speechSynthesis.removeEventListener('voiceschanged', load);
    }, [browserSupported]);

    const stopAll = useCallback(() => {
        // Stop server-side audio
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            audioRef.current = null;
        }
        if (abortRef.current) {
            abortRef.current.abort();
            abortRef.current = null;
        }
        // Stop browser TTS
        if (browserSupported) window.speechSynthesis.cancel();
        setSpeakingIdx(null);
        speakingIdxRef.current = null;
    }, [browserSupported]);

    // Try server-side Google Cloud TTS
    const speakServer = useCallback(async (text, lang, idx) => {
        const controller = new AbortController();
        abortRef.current = controller;

        const resp = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, lang }),
            signal: controller.signal,
        });

        if (!resp.ok) throw new Error('Server TTS failed');

        const data = await resp.json();
        if (!data.audio) throw new Error('No audio returned');

        // Play base64 MP3 via data URI (CSP-safe — no blob: needed)
        const audio = new Audio('data:audio/mp3;base64,' + data.audio);
        audioRef.current = audio;

        audio.onplay = () => { setSpeakingIdx(idx); speakingIdxRef.current = idx; };
        audio.onended = () => { setSpeakingIdx(null); speakingIdxRef.current = null; audioRef.current = null; };
        audio.onerror = () => { setSpeakingIdx(null); speakingIdxRef.current = null; audioRef.current = null; };

        await audio.play();
    }, []);

    // Fallback: browser SpeechSynthesis
    const speakBrowser = useCallback((text, lang, idx) => {
        if (!browserSupported) return;
        const clean = cleanText(text);
        const utterance = new SpeechSynthesisUtterance(clean);
        const langCode = LANG_MAP[lang] || 'en-US';
        utterance.lang = langCode;
        utterance.rate = 0.95;
        utterance.pitch = 1.05;
        const voice = pickVoice(voicesRef.current, langCode);
        if (voice) utterance.voice = voice;
        utterance.onstart = () => { setSpeakingIdx(idx); speakingIdxRef.current = idx; };
        utterance.onend = () => { setSpeakingIdx(null); speakingIdxRef.current = null; };
        utterance.onerror = () => { setSpeakingIdx(null); speakingIdxRef.current = null; };
        window.speechSynthesis.speak(utterance);
    }, [browserSupported]);

    const speak = useCallback(async (text, lang, idx) => {
        // Toggle: if already speaking this message, stop
        if (speakingIdxRef.current === idx) {
            stopAll();
            return;
        }
        stopAll();

        // Try server-side TTS first (works well for all languages)
        try {
            await speakServer(text, lang, idx);
        } catch (e) {
            // Server TTS failed — fall back to browser
            if (e.name !== 'AbortError') {
                speakBrowser(text, lang, idx);
            }
        }
    }, [stopAll, speakServer, speakBrowser]);

    const stop = useCallback(() => {
        stopAll();
    }, [stopAll]);

    // isSupported: true if either server or browser TTS is available
    const isSupported = true;

    return { speak, stop, speakingIdx, isSupported };
}
