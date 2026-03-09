import { useState, useCallback, useRef } from 'react';

const UI_STRINGS = {
    en: {
        placeholder: 'Ask a question...', online: 'Online', offline: 'Offline', typing: 'Typing...',
        newChat: 'New conversation', mute: 'Mute sounds', unmute: 'Unmute sounds',
        fontSize: 'Font size', exportChat: 'Export chat', newMessages: 'New messages',
        call: 'Call', website: 'Website',
        respondsInstantly: 'Responds instantly', isTyping: 'is typing',
        today: 'Today', yesterday: 'Yesterday',
        contextBanner: "I see you're browsing",
    },
    ru: {
        placeholder: 'Задайте вопрос...', online: 'Онлайн', offline: 'Офлайн', typing: 'Печатает...',
        newChat: 'Новый диалог', mute: 'Выкл. звук', unmute: 'Вкл. звук',
        fontSize: 'Размер шрифта', exportChat: 'Экспорт чата', newMessages: 'Новые сообщения',
        call: 'Позвонить', website: 'Сайт',
        respondsInstantly: 'Отвечает мгновенно', isTyping: 'печатает',
        today: 'Сегодня', yesterday: 'Вчера',
        contextBanner: 'Вижу, вы смотрите',
    },
    uk: {
        placeholder: 'Задайте питання...', online: 'Онлайн', offline: 'Офлайн', typing: 'Друкує...',
        newChat: 'Новий діалог', mute: 'Вимк. звук', unmute: 'Увімк. звук',
        fontSize: 'Розмір шрифту', exportChat: 'Експорт чату', newMessages: 'Нові повідомлення',
        call: 'Зателефонувати', website: 'Сайт',
        respondsInstantly: 'Відповідає миттєво', isTyping: 'друкує',
        today: 'Сьогодні', yesterday: 'Вчора',
        contextBanner: 'Бачу, ви переглядаєте',
    },
    ar: {
        placeholder: '...اطرح سؤالاً', online: 'متصل', offline: 'غير متصل', typing: '...يكتب',
        newChat: 'محادثة جديدة', mute: 'كتم الصوت', unmute: 'تشغيل الصوت',
        fontSize: 'حجم الخط', exportChat: 'تصدير المحادثة', newMessages: 'رسائل جديدة',
        call: 'اتصل', website: 'الموقع',
        respondsInstantly: 'يرد فوراً', isTyping: 'يكتب',
        today: 'اليوم', yesterday: 'أمس',
        contextBanner: 'أرى أنك تتصفح',
    },
};

const VOICE_LOCALES = {
    en: 'en-US',
    ru: 'ru-RU',
    uk: 'uk-UA',
    ar: 'ar-SA',
};

function detectLang(text) {
    if (/[\u0600-\u06FF]/.test(text)) return 'ar';
    if (/[\u0400-\u04FF]/.test(text)) {
        if (/[іїєґІЇЄҐ]/.test(text)) return 'uk';
        return 'ru';
    }
    return 'en';
}

export default function useLanguage(clientId) {
    const storageKey = `aw-lang-${clientId}`;
    const [lang, setLang] = useState(() => {
        try { return localStorage.getItem(storageKey) || null; } catch { return null; }
    });
    const detectedRef = useRef(!!lang);

    const detect = useCallback((text) => {
        if (detectedRef.current) return;
        detectedRef.current = true;
        const detected = detectLang(text);
        setLang(detected);
        try { localStorage.setItem(storageKey, detected); } catch {}
    }, [storageKey]);

    const resolvedLang = lang || 'en';
    const ui = UI_STRINGS[resolvedLang] || UI_STRINGS['en'];
    const voiceLocale = VOICE_LOCALES[resolvedLang] || 'en-US';

    return { lang: resolvedLang, detect, ui, voiceLocale };
}
