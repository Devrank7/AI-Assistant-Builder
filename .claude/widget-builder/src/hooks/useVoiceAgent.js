import { useState, useRef, useCallback, useEffect } from 'preact/hooks';

/**
 * useVoiceAgent - Full voice agent hook for the widget.
 *
 * Uses Web Speech API (SpeechRecognition + SpeechSynthesis) to:
 * 1. Listen to user's voice input
 * 2. Transcribe it
 * 3. Send transcript to /api/voice/stream
 * 4. Speak the AI response
 * 5. Auto-listen again for continuous conversation
 *
 * @param {Object} options
 * @param {string} options.clientId - Widget client ID
 * @param {string} options.apiUrl - Base API URL
 * @param {string} [options.language] - Language code (e.g., 'en-US')
 * @param {boolean} [options.autoListen] - Auto-listen after response (default: true)
 * @param {function} [options.onTranscript] - Callback when transcript is ready
 * @param {function} [options.onResponse] - Callback when AI responds
 * @param {function} [options.onError] - Callback on error
 */
export function useVoiceAgent({
  clientId,
  apiUrl = '',
  language = 'en-US',
  autoListen = true,
  onTranscript,
  onResponse,
  onError,
} = {}) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState(null);

  const recognitionRef = useRef(null);
  const synthRef = useRef(null);
  const sessionIdRef = useRef(`voice-${Date.now()}`);
  const historyRef = useRef([]);
  const autoListenRef = useRef(autoListen);

  // Keep autoListen ref in sync
  useEffect(() => {
    autoListenRef.current = autoListen;
  }, [autoListen]);

  // Initialize SpeechRecognition
  const getRecognition = useCallback(() => {
    if (recognitionRef.current) return recognitionRef.current;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Speech recognition not supported in this browser');
      return null;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = language;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const result = event.results[0];
      if (result && result[0]) {
        const text = result[0].transcript.trim();
        setTranscript(text);
        if (onTranscript) onTranscript(text);
        processTranscript(text);
      }
    };

    recognition.onerror = (event) => {
      // 'no-speech' and 'aborted' are normal
      if (event.error === 'no-speech' || event.error === 'aborted') {
        setIsListening(false);
        return;
      }
      const errMsg = `Speech recognition error: ${event.error}`;
      setError(errMsg);
      setIsListening(false);
      if (onError) onError(errMsg);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    return recognition;
  }, [language, onTranscript, onError]);

  // Process transcript through voice API
  const processTranscript = useCallback(
    async (text) => {
      if (!text || !clientId) return;

      setIsProcessing(true);
      setError(null);

      try {
        const baseUrl = apiUrl || '';
        const res = await fetch(`${baseUrl}/api/voice/stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId,
            transcript: text,
            sessionId: sessionIdRef.current,
            conversationHistory: historyRef.current.slice(-10),
            language,
          }),
        });

        const data = await res.json();

        if (data.success && data.data) {
          const responseText = data.data.text;

          // Update conversation history
          historyRef.current.push({ role: 'user', content: text });
          historyRef.current.push({ role: 'assistant', content: responseText });

          if (onResponse) onResponse(responseText);

          // Speak the response
          await speak(responseText);

          // Auto-listen again if voice mode is active
          if (autoListenRef.current && voiceMode) {
            setTimeout(() => startListening(), 500);
          }
        } else {
          const errMsg = data.error || 'Voice processing failed';
          setError(errMsg);
          if (onError) onError(errMsg);
        }
      } catch (err) {
        const errMsg = err.message || 'Network error';
        setError(errMsg);
        if (onError) onError(errMsg);
      } finally {
        setIsProcessing(false);
      }
    },
    [clientId, apiUrl, language, voiceMode, onResponse, onError]
  );

  // Start listening
  const startListening = useCallback(() => {
    const recognition = getRecognition();
    if (!recognition) return;

    // Stop any ongoing speech
    if (synthRef.current && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    try {
      recognition.start();
      setIsListening(true);
      setError(null);
    } catch (err) {
      // Already started — ignore
      if (err.message && err.message.includes('already started')) return;
      setError(err.message);
    }
  }, [getRecognition]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    setIsListening(false);
  }, []);

  // Speak text using SpeechSynthesis
  const speak = useCallback(
    (text) => {
      return new Promise((resolve) => {
        if (!window.speechSynthesis) {
          resolve();
          return;
        }

        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = language;
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => {
          setIsSpeaking(false);
          resolve();
        };
        utterance.onerror = () => {
          setIsSpeaking(false);
          resolve();
        };

        synthRef.current = utterance;
        window.speechSynthesis.speak(utterance);
      });
    },
    [language]
  );

  // Toggle voice mode on/off
  const toggleVoiceMode = useCallback(() => {
    if (voiceMode) {
      // Turn off voice mode
      stopListening();
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      setVoiceMode(false);
      setIsSpeaking(false);
    } else {
      // Turn on voice mode and start listening
      setVoiceMode(true);
      startListening();
    }
  }, [voiceMode, startListening, stopListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return {
    // State
    isListening,
    isProcessing,
    isSpeaking,
    voiceMode,
    transcript,
    error,

    // Actions
    toggleVoiceMode,
    startListening,
    stopListening,
    speak,
  };
}

export default useVoiceAgent;
