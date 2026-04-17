# Conscious Assistant

A React + Vite web app (“MuleBot: Conscious Assistant”) that keeps the screen awake while active, captures speech into audio blobs after silence, and runs **Phase 2** local inference with [Transformers.js](https://huggingface.co/docs/transformers.js) (Whisper ASR + DistilBART summarization). When `google/gemma-4-e2b-it` is available for the browser stack, swap models in `src/brain/brainModels.js`.

## Prerequisites

- [Node.js](https://nodejs.org/) (current LTS recommended)

## Setup

```bash
npm install
```

## Scripts

| Command        | Description              |
| -------------- | ------------------------ |
| `npm run dev`  | Start dev server (Vite)  |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the production build locally |

## Project layout

- `src/main.jsx` — app entry
- `src/App.jsx` — main UI
- `src/hooks/useVAD.js` — VAD + `MediaRecorder` (silence end → audio `Blob`)
- `src/hooks/useGemmaInference.js` — loads pipelines on Wake Up; `processAudio(blob)` → transcript + summary
- `src/brain/brainModels.js` — Hugging Face model IDs for the Brain

## Notes

- Wake Lock uses the [Screen Wake Lock API](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API); support varies by browser and may require a secure context (`https` or `localhost`).
- First run downloads model weights (cached via the browser **Cache API** / Transformers.js defaults). Allow mic access after Wake Up.
- WebGPU is used when available; the code falls back to WASM/quantized paths if not.

## License

Private project (`package.json` sets `"private": true`).
