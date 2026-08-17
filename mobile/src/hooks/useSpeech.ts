import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

/**
 * Dictation for the composer's "Speak" control.
 *
 * Backed by the browser Web Speech API, which exists on the web build (Chrome,
 * Edge, Safari). On native it reports `supported: false` and the control renders
 * disabled — rather than pretending to listen and silently doing nothing.
 * Wiring real on-device speech would mean an expo-speech-recognition dev build.
 */
export function useSpeech(locale: string, onResult: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  const SpeechRecognition =
    Platform.OS === 'web' && typeof window !== 'undefined'
      ? (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition
      : undefined;

  const supported = Boolean(SpeechRecognition);

  const stop = useCallback(() => {
    recognitionRef.current?.stop?.();
    setListening(false);
  }, []);

  const start = useCallback(() => {
    if (!SpeechRecognition) return;
    if (recognitionRef.current) stop();

    const recognition = new SpeechRecognition();
    recognition.lang = locale === 'es' ? 'es-ES' : 'en-US';
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((r: any) => r[0]?.transcript ?? '')
        .join('');
      onResultRef.current(transcript);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }, [SpeechRecognition, locale, stop]);

  const toggle = useCallback(() => {
    if (listening) stop();
    else start();
  }, [listening, start, stop]);

  useEffect(() => () => recognitionRef.current?.abort?.(), []);

  return { supported, listening, toggle };
}
