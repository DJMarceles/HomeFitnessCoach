# VormCoach

VormCoach is een browser-first fitnessprototype voor thuis trainen met camera-analyse. De app gebruikt lokale pose-detectie in de browser om houding en herhalingen te monitoren en geeft na minimaal 8 herhalingen setfeedback in tekst en optioneel via stem.

## Features

- Lokale camera-analyse met MediaPipe Pose Landmarker.
- 25 thuisfitness-oefeningen met camera-opstelling per oefening.
- Pilot voor squat, reverse lunge, push-up, glute bridge en plank. De overige oefeningen hebben een eigen of experimentele telling; de praktijkvalidatie staat nog open.
- Bij dynamische sets: automatisch tellen vanuit de startpositie, één vaste tekstanalyse na de achtste herhaling en hoogstens twee tips. De stem leest alleen op verzoek voor.
- Plank, side plank en wall sit: kies een houdtijd. Alleen de tijd in de herkenbare houding telt.
- Camera-preview met volledig-beeld modus en optionele camera-zoom als het device dat ondersteunt.
- Browserstem fallback en optionele ElevenLabs TTS via lokale proxy.
- Squatdemo voor testen zonder camera. Wissel op een telefoon na cameratoestemming tussen de lenzen die de browser beschikbaar stelt.

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
npm test
npm run build
```

De trainingsapp gebruikt standaard het lokaal meegeleverde [MediaPipe Pose Landmarker Full-model](https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task) met SDK 0.10.35. Lite blijft beschikbaar op de [lokale meetpagina](validation/README.md) om beide modellen op dezelfde opname te vergelijken. Of Full bij echte sporters betere tips geeft, moet nog in de praktijktest blijken.
