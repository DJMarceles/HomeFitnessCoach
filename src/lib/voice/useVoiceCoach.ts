import { useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { ELEVENLABS_VOICE_URI } from "./useVoiceOptions";

const CUE_COOLDOWN_MS = 5200;

interface VoiceCoach {
  lastError: string | null;
  speakCue: (key: string, text: string, force?: boolean) => void;
  stop: () => void;
  supported: boolean;
}

/** Provides throttled spoken feedback through cloud TTS or the browser speech engine. */
export function useVoiceCoach(enabled: boolean, voiceURI: string): VoiceCoach {
  const [lastError, setLastError] = useState<string | null>(null);
  const lastSpokenRef = useRef<Record<string, number>>({});
  const abortRef = useRef<AbortController | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const lastErrorRef = useRef<string | null>(null);
  const browserSupported = typeof window !== "undefined" && "speechSynthesis" in window;
  const useCloudVoice = voiceURI === ELEVENLABS_VOICE_URI;
  const supported = useCloudVoice || browserSupported;

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    audioRef.current?.pause();
    audioRef.current = null;

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    if (browserSupported) {
      window.speechSynthesis.cancel();
    }
  }, [browserSupported]);

  const speakCue = useCallback(
    (key: string, text: string, force = false) => {
      if (!enabled || !supported || !text.trim() || !canSpeakNow(key, force, lastSpokenRef.current)) {
        return;
      }

      lastSpokenRef.current[key] = performance.now();
      lastErrorRef.current = null;
      setLastError(null);
      stop();

      if (useCloudVoice) {
        void speakCloudCue(text, abortRef, audioRef, objectUrlRef, lastErrorRef, setLastError);
        return;
      }

      window.speechSynthesis.speak(createUtterance(text, voiceURI));
    },
    [enabled, stop, supported, useCloudVoice, voiceURI],
  );

  useEffect(() => stop, [stop]);

  return { lastError, speakCue, stop, supported };
}

function canSpeakNow(key: string, force: boolean, spokenAt: Record<string, number>): boolean {
  const lastSpokenAt = spokenAt[key] ?? 0;
  return force || performance.now() - lastSpokenAt >= CUE_COOLDOWN_MS;
}

async function speakCloudCue(
  text: string,
  abortRef: MutableRefObject<AbortController | null>,
  audioRef: MutableRefObject<HTMLAudioElement | null>,
  objectUrlRef: MutableRefObject<string | null>,
  lastErrorRef: MutableRefObject<string | null>,
  setLastError: Dispatch<SetStateAction<string | null>>,
): Promise<void> {
  const controller = new AbortController();
  abortRef.current = controller;

  try {
    const response = await fetch("/api/tts/elevenlabs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    const objectUrl = URL.createObjectURL(await response.blob());
    const audio = new Audio(objectUrl);
    objectUrlRef.current = objectUrl;
    audioRef.current = audio;
    audio.onended = () => URL.revokeObjectURL(objectUrl);
    await audio.play();
  } catch (error) {
    if (!controller.signal.aborted) {
      lastErrorRef.current = error instanceof Error ? error.message : "Cloudstem afspelen mislukt.";
      setLastError(lastErrorRef.current);
    }
  }
}

function createUtterance(text: string, voiceURI: string): SpeechSynthesisUtterance {
  const utterance = new SpeechSynthesisUtterance(text);
  const voice = getSelectedVoice(voiceURI);

  utterance.lang = "nl-NL";
  utterance.voice = voice;
  utterance.lang = voice?.lang ?? "nl-NL";
  utterance.rate = 0.92;
  utterance.pitch = 1;
  utterance.volume = 0.9;
  return utterance;
}

function getSelectedVoice(voiceURI: string): SpeechSynthesisVoice | null {
  if (!voiceURI || !("speechSynthesis" in window)) {
    return null;
  }

  return window.speechSynthesis.getVoices().find((voice) => voice.voiceURI === voiceURI) ?? null;
}
