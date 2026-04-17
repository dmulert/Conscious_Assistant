import { useEffect, useState } from 'react';

export const useVAD = (isActive) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastTranscript, setLastTranscript] = useState(null);

  useEffect(() => {
    if (!isActive) return;

    let audioContext;
    let stream;
    let speaking = false;

    const startListening = async () => {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const checkAudio = () => {
        analyser.getByteFrequencyData(dataArray);
        const volume = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;

        // Simple threshold for dialogue detection
        if (volume > 40) {
          if (!speaking) {
            speaking = true;
            setIsSpeaking(true);
          }
        } else {
          if (speaking) {
            speaking = false;
            setIsSpeaking(false);
            setLastTranscript(new Date().toLocaleTimeString()); // Placeholder for Phase 2 Transcription
          }
        }
        if (isActive) requestAnimationFrame(checkAudio);
      };

      checkAudio();
    };

    startListening();

    return () => {
      stream?.getTracks().forEach((t) => t.stop());
      audioContext?.close();
    };
  }, [isActive]);

  return { isSpeaking, lastTranscript };
};

