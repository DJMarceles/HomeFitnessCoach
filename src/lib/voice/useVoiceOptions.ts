import { useEffect, useMemo, useState } from "react";
import type { CloudVoiceStatus } from "./useCloudVoiceStatus";

export const ELEVENLABS_VOICE_URI = "cloud:elevenlabs";

export interface VoiceOption {
  disabled?: boolean;
  uri: string;
  label: string;
  name: string;
  lang: string;
  localService: boolean;
  default: boolean;
}

/** Reads available browser/system voices and ranks Dutch voices first. */
export function useVoiceOptions(cloudStatus: CloudVoiceStatus) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (!("speechSynthesis" in window)) {
      return;
    }

    const updateVoices = () => setVoices(window.speechSynthesis.getVoices());
    updateVoices();
    window.speechSynthesis.addEventListener("voiceschanged", updateVoices);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", updateVoices);
  }, []);

  const browserOptions = useMemo(() => voices.map(toVoiceOption).sort(sortVoiceOptions), [voices]);
  const cloudOption = useMemo(() => toCloudVoiceOption(cloudStatus), [cloudStatus]);
  const options = useMemo(() => [cloudOption, ...browserOptions], [browserOptions, cloudOption]);
  const preferredVoiceURI = getPreferredVoiceURI(cloudStatus, browserOptions);

  return { options, preferredVoiceURI };
}

function getPreferredVoiceURI(status: CloudVoiceStatus, browserOptions: VoiceOption[]): string {
  if (!status.loaded) {
    return "";
  }

  return status.configured ? ELEVENLABS_VOICE_URI : browserOptions[0]?.uri ?? "";
}

function toCloudVoiceOption(status: CloudVoiceStatus): VoiceOption {
  return {
    uri: ELEVENLABS_VOICE_URI,
    name: status.voiceLabel,
    lang: "nl-NL",
    localService: false,
    default: false,
    disabled: !status.configured,
    label: status.configured
      ? `${status.voiceLabel} (${status.model})`
      : "ElevenLabs instellen via .env",
  };
}

function toVoiceOption(voice: SpeechSynthesisVoice): VoiceOption {
  return {
    uri: voice.voiceURI,
    name: voice.name,
    lang: voice.lang,
    localService: voice.localService,
    default: voice.default,
    label: `${voice.name} (${voice.lang})${voice.localService ? "" : " online"}`,
  };
}

function sortVoiceOptions(a: VoiceOption, b: VoiceOption): number {
  return getVoiceScore(b) - getVoiceScore(a) || a.label.localeCompare(b.label);
}

function getVoiceScore(voice: VoiceOption): number {
  const name = voice.name.toLowerCase();
  const languageScore = voice.lang.toLowerCase().startsWith("nl") ? 80 : 0;
  const defaultScore = voice.default ? 18 : 0;
  const qualityScore = ["neural", "premium", "enhanced", "google", "microsoft", "xander", "claire"].some((word) =>
    name.includes(word),
  )
    ? 20
    : 0;
  const noveltyPenalty = ["cello", "bells", "bubbles", "organ", "trinoids", "whisper"].some((word) => name.includes(word))
    ? -30
    : 0;
  const localScore = voice.localService ? 8 : 4;

  return languageScore + qualityScore + defaultScore + localScore + noveltyPenalty;
}
