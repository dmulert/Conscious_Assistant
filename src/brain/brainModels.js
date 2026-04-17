/**
 * Phase 2 “Brain” models (Transformers.js / ONNX in-browser).
 * TechSpec targets `google/gemma-4-e2b-it` for native audio; when that ships in
 * Transformers.js, swap ASR + summarization here behind the same hook API.
 */
export const ASR_MODEL = 'Xenova/whisper-tiny.en';
export const SUMMARY_MODEL = 'Xenova/distilbart-cnn-6-6';
