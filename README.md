# Conscious Assistant

**MuleBot: Conscious Assistant** is a React + Vite PWA that listens after you wake it, runs speech-to-text and summarization in the browser, then lets you choose where to save results (copy, save file, or share to apps like Google Drive).

## What it does

- **Wake / stay awake** - Uses the [Screen Wake Lock API](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API) so the screen stays on while the session is active.
- **Voice capture** - Voice activity detection plus `MediaRecorder`; after about **three seconds** of silence, the last utterance is decoded and sent to the brain (`src/hooks/useVAD.js`).
- **Local brain (Transformers.js)** - Whisper-style ASR + summarization via ONNX in the browser, with WebGPU when available and WASM fallback (`src/hooks/useGemmaInference.js`).
- **Local queue + save actions** - Each result is queued locally and can be exported with **Copy all**, **Save as...**, or **Share...** (share sheet can target Google Drive, email, notes, etc.) using `src/hooks/useTranscriptActions.js`.

## Stack

- React 19, Vite 7, `@huggingface/transformers` 3.x

## Prerequisites

- [Node.js](https://nodejs.org/) (current LTS recommended)

## Setup

```bash
npm install
```

No Google Cloud setup is required.

## Scripts

| Command | Description |
| ------- | ----------- |
| `npm run dev` | Start the Vite dev server (default `http://localhost:5173`) |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the production build locally |

## Using the app

1. Run `npm run dev` and open the URL shown in the terminal.
2. Click **WAKE UP**, grant microphone access, and wait for the brain models to finish loading (first run downloads weights; later runs use cache).
3. Speak; pause for ~3 seconds to finalize a segment.
4. Use **Copy all**, **Save as...**, or **Share...** to export transcripts.

## Project layout

| Path | Purpose |
| ---- | ------- |
| `src/main.jsx` | App entry |
| `src/App.jsx` | UI: wake control, brain status, transcript queue, save actions |
| `src/hooks/useVAD.js` | VAD + `MediaRecorder`, silence -> `Blob` callback |
| `src/hooks/useGemmaInference.js` | Load ASR/summarizer on wake; `processAudio(blob)` |
| `src/hooks/useTranscriptActions.js` | Local queue + copy/save/share export actions |
| `src/brain/brainModels.js` | Hugging Face model IDs for ASR and summarization |
| `src/brain/decodeAudioBlob.js` | Decode recorded blobs to mono 16 kHz samples |
| `vite.config.js` | Vite + React; `optimizeDeps.exclude` for `@huggingface/transformers` |
| `public/manifest.json` | PWA manifest |

## Notes

- **Secure context** - Wake Lock, mic, and many APIs expect `https://` or `http://localhost`.
- **First-load size** - ML weights are large; first run can take noticeable time and bandwidth.
- **Share behavior** - `Share...` depends on browser/device support. On supported devices, you can pick Google Drive directly from the share sheet.

## License

Private project (`package.json` sets `"private": true`).
