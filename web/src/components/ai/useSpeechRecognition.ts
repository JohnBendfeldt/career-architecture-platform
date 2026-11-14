import { useEffect, useRef, useState } from 'react';

interface UseSpeechRecognitionOptions {
  onBioTranscript: (text: string) => void;
  onSkillTranscript: (skill: string) => void;
}

export function useSpeechRecognition({
  onBioTranscript,
  onSkillTranscript
}: UseSpeechRecognitionOptions) {
  const [isListeningBio, setIsListeningBio] = useState(false);
  const [isListeningSkill, setIsListeningSkill] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const stopActiveRecognition = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
  };

  useEffect(() => {
    return () => {
      stopActiveRecognition();
    };
  }, []);

  const getRecognitionConstructor = () => {
    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      setVoiceError('Browser Speech Recognition is unavailable in this browser (use Chrome, Edge, or Safari, or press Fn twice on macOS).');
      return null;
    }
    return SpeechRecognitionCtor;
  };

  const toggleVoiceBio = () => {
    setVoiceError(null);
    if (isListeningBio && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListeningBio(false);
      return;
    }

    const SpeechRecognitionCtor = getRecognitionConstructor();
    if (!SpeechRecognitionCtor) return;

    stopActiveRecognition();

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;

    const baseText = '';
    recognition.onstart = () => {
      setIsListeningBio(true);
      setIsListeningSkill(false);
    };

    recognition.onresult = (event: any) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      onBioTranscript(baseText ? `${baseText} ${transcript}`.trim() : transcript.trim());
    };

    recognition.onerror = () => {
      setIsListeningBio(false);
    };

    recognition.onend = () => {
      setIsListeningBio(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const toggleVoiceSkill = () => {
    setVoiceError(null);
    if (isListeningSkill && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListeningSkill(false);
      return;
    }

    const SpeechRecognitionCtor = getRecognitionConstructor();
    if (!SpeechRecognitionCtor) return;

    stopActiveRecognition();

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListeningSkill(true);
      setIsListeningBio(false);
    };

    recognition.onresult = (event: any) => {
      const raw = event.results?.[0]?.[0]?.transcript?.trim() || '';
      const cleaned = raw.replace(/[.?!]+$/, '').trim();
      if (cleaned) {
        onSkillTranscript(cleaned);
      }
    };

    recognition.onerror = () => {
      setIsListeningSkill(false);
    };

    recognition.onend = () => {
      setIsListeningSkill(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  return {
    isListeningBio,
    isListeningSkill,
    voiceError,
    toggleVoiceBio,
    toggleVoiceSkill
  };
}
