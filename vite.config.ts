import { defineConfig, loadEnv, type Plugin, type PreviewServer, type ViteDevServer } from "vite";
import react from "@vitejs/plugin-react";

const DEFAULT_ELEVENLABS_MODEL = "eleven_flash_v2_5";
const DEFAULT_ELEVENLABS_OUTPUT = "mp3_44100_128";
const MAX_TTS_CHARACTERS = 1200;

export default defineConfig(({ mode }) => ({
  plugins: [react(), ttsProxyPlugin(loadEnv(mode, process.cwd(), ""))],
  server: {
    port: 5173,
    fs: { deny: [".env", ".env.*", "*.{crt,pem}", "**/.git/**", "**/private-pilot/**"] },
  },
}));

function ttsProxyPlugin(env: Record<string, string>): Plugin {
  return {
    name: "vormcoach-tts-proxy",
    configureServer(server) {
      registerTtsMiddleware(server);
    },
    configurePreviewServer(server) {
      registerTtsMiddleware(server);
    },
  };

  function registerTtsMiddleware(server: ViteDevServer | PreviewServer): void {
    server.middlewares.use("/api/tts/status", (request, response) => {
      if (request.method !== "GET") {
        sendJson(response, 405, { error: "Method not allowed" });
        return;
      }

      sendJson(response, 200, getTtsStatus(env));
    });

    server.middlewares.use("/api/tts/elevenlabs", async (request, response) => {
      if (request.method !== "POST") {
        sendJson(response, 405, { error: "Method not allowed" });
        return;
      }

      const status = getTtsStatus(env);
      if (!status.configured) {
        sendJson(response, 503, { error: "ElevenLabs is nog niet geconfigureerd." });
        return;
      }

      try {
        const payload = await readJsonBody(request);
        const text = typeof payload.text === "string" ? payload.text.trim() : "";

        if (!text) {
          sendJson(response, 400, { error: "Tekst ontbreekt." });
          return;
        }

        if (text.length > MAX_TTS_CHARACTERS) {
          sendJson(response, 413, { error: `Tekst is langer dan ${MAX_TTS_CHARACTERS} tekens.` });
          return;
        }

        await streamElevenLabsAudio(env, text, response);
      } catch (error) {
        sendJson(response, 500, { error: error instanceof Error ? error.message : "TTS-aanroep mislukt." });
      }
    });
  }
}

function getTtsStatus(env: Record<string, string>) {
  const apiKey = env.ELEVENLABS_API_KEY?.trim() ?? "";
  const voiceId = env.ELEVENLABS_VOICE_ID?.trim() ?? "";

  return {
    provider: "elevenlabs",
    configured: Boolean(apiKey && voiceId),
    voiceLabel: env.ELEVENLABS_VOICE_LABEL?.trim() || "ElevenLabs Nederlandse stem",
    model: env.ELEVENLABS_MODEL_ID?.trim() || DEFAULT_ELEVENLABS_MODEL,
  };
}

async function streamElevenLabsAudio(env: Record<string, string>, text: string, response: ServerResponseLike): Promise<void> {
  const voiceId = env.ELEVENLABS_VOICE_ID.trim();
  const modelId = env.ELEVENLABS_MODEL_ID?.trim() || DEFAULT_ELEVENLABS_MODEL;
  const url = new URL(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`);
  url.searchParams.set("output_format", env.ELEVENLABS_OUTPUT_FORMAT?.trim() || DEFAULT_ELEVENLABS_OUTPUT);

  const ttsResponse = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": env.ELEVENLABS_API_KEY.trim(),
    },
    body: JSON.stringify({
      text,
      model_id: modelId,
      language_code: "nl",
      voice_settings: {
        stability: 0.58,
        similarity_boost: 0.78,
        style: 0.12,
        use_speaker_boost: true,
      },
    }),
  });

  if (!ttsResponse.ok) {
    const message = await ttsResponse.text();
    sendJson(response, ttsResponse.status, { error: message || "ElevenLabs gaf geen audio terug." });
    return;
  }

  const audio = new Uint8Array(await ttsResponse.arrayBuffer());
  response.statusCode = 200;
  response.setHeader("Content-Type", ttsResponse.headers.get("content-type") || "audio/mpeg");
  response.setHeader("Cache-Control", "no-store");
  response.end(audio);
}

function readJsonBody(request: IncomingMessageLike): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk: Buffer) => {
      body += chunk.toString("utf8");
      if (body.length > 8192) {
        reject(new Error("Request body is te groot."));
      }
    });

    request.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"));
      } catch {
        reject(new Error("Ongeldige JSON."));
      }
    });

    request.on("error", reject);
  });
}

function sendJson(response: ServerResponseLike, statusCode: number, payload: Record<string, unknown>): void {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
}

interface IncomingMessageLike {
  on(event: "data", listener: (chunk: Buffer) => void): void;
  on(event: "end", listener: () => void): void;
  on(event: "error", listener: (error: Error) => void): void;
  method?: string;
}

interface ServerResponseLike {
  statusCode: number;
  setHeader(name: string, value: string): void;
  end(body?: string | Uint8Array): void;
}
