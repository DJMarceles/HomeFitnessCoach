# VormCoach

VormCoach is een browser-first fitnessprototype voor thuis trainen met camera-analyse. De app gebruikt lokale pose-detectie in de browser om houding en herhalingen te monitoren en geeft na minimaal 8 herhalingen setfeedback in tekst en optioneel via stem.

## Features

- Lokale camera-analyse met MediaPipe Pose Landmarker.
- 25 thuisfitness-oefeningen met camera-opstelling per oefening.
- Automatische rep-telling en setanalyse vanaf 8 herhalingen.
- Camera-preview met volledig-beeld modus en optionele camera-zoom als het device dat ondersteunt.
- Browserstem fallback en optionele ElevenLabs TTS via lokale proxy.
- Demo-modus voor testen zonder camera.

## Installatie

```bash
npm install
npm run dev
```

Open daarna `http://localhost:5173/`.

Op macOS kan ook `start.command` worden gebruikt.

## ElevenLabs Stemmen

Kopieer `.env.example` naar `.env` en vul eigen waarden in:

```bash
cp .env.example .env
```

```bash
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=
ELEVENLABS_VOICE_LABEL=ElevenLabs Nederlandse stem
ELEVENLABS_MODEL_ID=eleven_flash_v2_5
ELEVENLABS_OUTPUT_FORMAT=mp3_44100_128
```

De echte `.env` wordt niet naar GitHub gepusht. De ElevenLabs API-key blijft server-side in de lokale Vite proxy.

## Build

```bash
npm run build
```
