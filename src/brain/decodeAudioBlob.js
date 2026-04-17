/** Whisper / ASR pipelines expect mono `Float32Array` at 16 kHz (not raw `Blob`). */

const TARGET_SAMPLE_RATE = 16000;

/**
 * Decode a recorded blob (e.g. webm/opus from MediaRecorder) to mono float32 @ 16kHz.
 */
export async function decodeBlobToMono16k(blob) {
  const arrayBuffer = await blob.arrayBuffer();
  const audioCtx = new AudioContext();
  let decoded;
  try {
    decoded = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
  } finally {
    await audioCtx.close();
  }

  let mono;
  if (decoded.numberOfChannels === 1) {
    mono = decoded.getChannelData(0);
  } else {
    const left = decoded.getChannelData(0);
    const right = decoded.getChannelData(1);
    mono = new Float32Array(left.length);
    const scale = Math.sqrt(2);
    for (let i = 0; i < left.length; i++) {
      mono[i] = (scale * (left[i] + right[i])) / 2;
    }
  }

  const sr = decoded.sampleRate;
  if (sr === TARGET_SAMPLE_RATE) {
    return mono;
  }

  const duration = decoded.duration;
  const offline = new OfflineAudioContext(
    1,
    Math.max(1, Math.ceil(duration * TARGET_SAMPLE_RATE)),
    TARGET_SAMPLE_RATE
  );
  const buffer = offline.createBuffer(1, mono.length, sr);
  buffer.copyToChannel(mono, 0);
  const source = offline.createBufferSource();
  source.buffer = buffer;
  source.connect(offline.destination);
  source.start(0);
  const rendered = await offline.startRendering();
  return rendered.getChannelData(0);
}
