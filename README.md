# Conscious Assistant

A React + Vite web app (“MuleBot: Conscious Assistant”) that keeps the screen awake while active, captures speech into audio blobs after silence, runs **Phase 2** local inference with [Transformers.js](https://huggingface.co/docs/transformers.js) (Whisper ASR + DistilBART summarization), and **Phase 3** queues each transcript/insight locally and can append JSON lines to a Google Drive file. Swap brain models in `src/brain/brainModels.js` when `google/gemma-4-e2b-it` is available in-browser.

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
- `src/hooks/useDriveSync.js` — Phase 3: local queue + Google Identity + Drive append
- `src/sync/actionQueue.js` — persisted queue (`localStorage`)
- `src/sync/googleDrive.js` — Drive REST: ensure log file, append JSONL
- `src/brain/brainModels.js` — Hugging Face model IDs for the Brain

### Google Drive sync (Phase 3)

1. In [Google Cloud Console](https://console.cloud.google.com/), create an OAuth **Web client** and enable the **Google Drive API**.
2. Under the client, set **Authorized JavaScript origins** to your dev origin (e.g. `http://localhost:5173`) and production origin when you deploy.
3. Create a `.env` file in the project root with:

   `VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com`

4. Restart `npm run dev`. Use **Connect Google**, then **Sync to Drive** to append pending items to `MuleBot_Conscious_Log.txt` (scope: `drive.file`).

## Notes

- Wake Lock uses the [Screen Wake Lock API](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API); support varies by browser and may require a secure context (`https` or `localhost`).
- First run downloads model weights (cached via the browser **Cache API** / Transformers.js defaults). Allow mic access after Wake Up.
- WebGPU is used when available; the code falls back to WASM/quantized paths if not.

## License

Private project (`package.json` sets `"private": true`).
