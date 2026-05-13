import { useEffect, useState } from "react";

export interface CloudVoiceStatus {
  configured: boolean;
  error: string | null;
  loaded: boolean;
  model: string;
  provider: "elevenlabs";
  voiceLabel: string;
}

const DEFAULT_STATUS: CloudVoiceStatus = {
  configured: false,
  error: null,
  loaded: false,
  model: "eleven_flash_v2_5",
  provider: "elevenlabs",
  voiceLabel: "ElevenLabs Nederlandse stem",
};

/** Reads non-secret cloud voice status from the local TTS proxy. */
export function useCloudVoiceStatus(): CloudVoiceStatus {
  const [status, setStatus] = useState<CloudVoiceStatus>(DEFAULT_STATUS);

  useEffect(() => {
    let cancelled = false;

    async function loadStatus(): Promise<void> {
      try {
        const response = await fetch("/api/tts/status");
        if (!response.ok) {
          throw new Error(`TTS-status gaf HTTP ${response.status}.`);
        }

        const nextStatus = (await response.json()) as CloudVoiceStatus;
        if (!cancelled) {
          setStatus({ ...DEFAULT_STATUS, ...nextStatus, error: null, loaded: true });
        }
      } catch (error) {
        if (!cancelled) {
          setStatus({
            ...DEFAULT_STATUS,
            error: error instanceof Error ? error.message : "TTS-status kon niet worden geladen.",
            loaded: true,
          });
        }
      }
    }

    void loadStatus();
    return () => {
      cancelled = true;
    };
  }, []);

  return status;
}
