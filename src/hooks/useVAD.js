import { useEffect, useRef, useState } from 'react';

const VOLUME_THRESHOLD = 40;

function pickMimeType() {
  const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
  for (const t of types) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return '';
}

/**
 * Voice activity + MediaRecorder: buffers audio while speech is present, then
 * after `silenceMs` of quiet exports a Blob for the Brain (Phase 2).
 */
export const useVAD = (isActive, options = {}) => {
  const { onSegmentReady, silenceMs = 3000 } = options;
  const [isSpeaking, setIsSpeaking] = useState(false);
  const onSegmentReadyRef = useRef(onSegmentReady);

  useEffect(() => {
    onSegmentReadyRef.current = onSegmentReady;
  }, [onSegmentReady]);

  useEffect(() => {
    if (!isActive) return;

    let audioContext;
    let stream;
    let mediaRecorder = null;
    let silenceTimer = null;
    let recording = false;
    let prevLoud = false;
    let rafId;
    let analyser;

    const startRecording = () => {
      if (recording) return;
      const chunks = [];
      const mime = pickMimeType();
      const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      mr.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(chunks, { type: mr.mimeType || 'audio/webm' });
        recording = false;
        mediaRecorder = null;
        if (blob.size > 0) onSegmentReadyRef.current?.(blob);
      };
      mediaRecorder = mr;
      mr.start();
      recording = true;
    };

    const tick = () => {
      if (!isActive) return;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(dataArray);
      const volume = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      const loud = volume > VOLUME_THRESHOLD;

      if (loud) {
        if (silenceTimer) {
          clearTimeout(silenceTimer);
          silenceTimer = null;
        }
        if (!recording) startRecording();
        setIsSpeaking(true);
      } else {
        setIsSpeaking(false);
        if (prevLoud && recording) {
          silenceTimer = setTimeout(() => {
            if (mediaRecorder && mediaRecorder.state === 'recording') {
              mediaRecorder.stop();
            }
            silenceTimer = null;
          }, silenceMs);
        }
      }
      prevLoud = loud;

      rafId = requestAnimationFrame(tick);
    };

    const startListening = async () => {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      tick();
    };

    startListening();

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      if (silenceTimer) clearTimeout(silenceTimer);
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
      }
      stream?.getTracks().forEach((t) => t.stop());
      void audioContext?.close();
    };
  }, [isActive, silenceMs]);

  return { isSpeaking };
};
