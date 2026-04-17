import { useCallback, useEffect, useRef, useState } from 'react';
import { env, pipeline } from '@huggingface/transformers';
import { ASR_MODEL, SUMMARY_MODEL } from '../brain/brainModels.js';

env.useBrowserCache = true;

function fallbackInsight(text) {
  if (!text) return '';
  const parts = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const priority = parts.filter((s) =>
    /need|must|should|pick up|buy|remember|todo|call|email|get the|grab/i.test(s)
  );
  return priority.length ? priority.join(' ') : parts.slice(0, 2).join(' ') || text.slice(0, 280);
}

async function createAsrPipeline(progress_callback) {
  const opts = { progress_callback };
  try {
    return await pipeline('automatic-speech-recognition', ASR_MODEL, {
      ...opts,
      device: 'webgpu',
      dtype: 'fp16',
    });
  } catch {
    return await pipeline('automatic-speech-recognition', ASR_MODEL, {
      ...opts,
      device: 'wasm',
      dtype: 'q8',
    });
  }
}

async function createSummarizerPipeline(progress_callback) {
  const opts = { progress_callback };
  try {
    return await pipeline('summarization', SUMMARY_MODEL, {
      ...opts,
      device: 'webgpu',
      dtype: 'fp16',
    });
  } catch {
    return await pipeline('summarization', SUMMARY_MODEL, {
      ...opts,
      device: 'wasm',
      dtype: 'q8',
    });
  }
}

/**
 * Local “Brain”: ASR (Whisper) + summarization (DistilBART). Swap models in
 * `brainModels.js` when Gemma 4 E2B is available in Transformers.js.
 */
export const useGemmaInference = (enabled) => {
  const asrRef = useRef(null);
  const summarizerRef = useRef(null);
  const [brainStatus, setBrainStatus] = useState('idle');
  const [loadProgress, setLoadProgress] = useState(0);
  const [lastTranscript, setLastTranscript] = useState(null);
  const [lastInsight, setLastInsight] = useState(null);
  const [error, setError] = useState(null);
  const [summarizerReady, setSummarizerReady] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setBrainStatus('idle');
      setLoadProgress(0);
      setSummarizerReady(false);
      void asrRef.current?.dispose?.();
      void summarizerRef.current?.dispose?.();
      asrRef.current = null;
      summarizerRef.current = null;
      return;
    }

    let cancelled = false;

    const onProgress = (info) => {
      if (info.status === 'progress' && typeof info.progress === 'number') {
        setLoadProgress(Math.min(100, Math.round(info.progress)));
      }
    };

    (async () => {
      setBrainStatus('loading');
      setError(null);
      setLoadProgress(0);
      setSummarizerReady(false);
      try {
        const asr = await createAsrPipeline(onProgress);
        if (cancelled) {
          await asr.dispose?.();
          return;
        }
        asrRef.current = asr;
        setBrainStatus('ready');

        void (async () => {
          try {
            const sum = await createSummarizerPipeline(onProgress);
            if (cancelled) {
              await sum.dispose?.();
              return;
            }
            summarizerRef.current = sum;
            if (!cancelled) setSummarizerReady(true);
          } catch (e) {
            console.warn('Summarizer load skipped:', e);
            summarizerRef.current = null;
            if (!cancelled) setSummarizerReady(false);
          }
        })();
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setError(e?.message ?? String(e));
          setBrainStatus('error');
        }
      }
    })();

    return () => {
      cancelled = true;
      void asrRef.current?.dispose?.();
      void summarizerRef.current?.dispose?.();
      asrRef.current = null;
      summarizerRef.current = null;
    };
  }, [enabled]);

  const processAudio = useCallback(async (audioBlob) => {
    if (!audioBlob || audioBlob.size < 800) return;
    if (!asrRef.current) {
      setError('Brain not ready yet.');
      return;
    }

    setBrainStatus('inferring');
    setError(null);
    try {
      const asrOut = await asrRef.current(audioBlob);
      const transcript = (asrOut?.text ?? '').trim();
      setLastTranscript(transcript || '(no speech detected)');

      let insight = fallbackInsight(transcript);
      if (summarizerRef.current && transcript.length > 12) {
        try {
          const out = await summarizerRef.current(transcript, {
            max_new_tokens: 120,
            min_length: 8,
          });
          const first = Array.isArray(out) ? out[0] : out;
          const summary = first?.summary_text?.trim();
          if (summary) insight = summary;
        } catch (e) {
          console.warn('Summarization failed, using heuristic:', e);
        }
      }
      setLastInsight(insight);
      setBrainStatus('ready');
    } catch (e) {
      console.error(e);
      setError(e?.message ?? String(e));
      setBrainStatus('error');
    }
  }, []);

  return {
    processAudio,
    brainStatus,
    loadProgress,
    lastTranscript,
    lastInsight,
    error,
    summarizerReady,
  };
};
