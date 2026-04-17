import React, { useCallback, useState } from 'react';
import { useGemmaInference } from './hooks/useGemmaInference';
import { useVAD } from './hooks/useVAD';

const App = () => {
  const [isAwake, setIsAwake] = useState(false);
  const {
    processAudio,
    brainStatus,
    loadProgress,
    lastTranscript,
    lastInsight,
    error,
    summarizerReady,
  } = useGemmaInference(isAwake);
  const [wakeLock, setWakeLock] = useState(null);

  const onSegment = useCallback(
    (blob) => {
      void processAudio(blob);
    },
    [processAudio]
  );

  const { isSpeaking } = useVAD(isAwake, { onSegmentReady: onSegment, silenceMs: 3000 });

  const toggleWakeState = async () => {
    if (!isAwake) {
      try {
        const lock = await navigator.wakeLock.request('screen');
        setWakeLock(lock);
        setIsAwake(true);
      } catch (err) {
        console.error('Wake Lock failed:', err);
      }
    } else {
      wakeLock?.release();
      setWakeLock(null);
      setIsAwake(false);
    }
  };

  const brainLabel =
    brainStatus === 'idle'
      ? 'Sleeping'
      : brainStatus === 'loading'
        ? `Loading models… ${loadProgress}%`
        : brainStatus === 'ready'
          ? summarizerReady
            ? 'Ready (ASR + summary)'
            : 'Ready (ASR; summary loading…)'
          : brainStatus === 'inferring'
            ? 'Thinking…'
            : brainStatus === 'error'
              ? 'Error'
              : brainStatus;

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>MuleBot: Conscious Assistant</h1>

      <button
        onClick={toggleWakeState}
        style={{
          ...styles.button,
          backgroundColor: isAwake ? '#4CAF50' : '#f44336',
        }}
      >
        {isAwake ? 'SYSTEM AWAKE' : 'WAKE UP'}
      </button>

      <div style={styles.statusBox}>
        <p>
          Mic: <strong>{isSpeaking ? 'LISTENING…' : 'WAITING'}</strong>
        </p>
        <p>Brain: {brainLabel}</p>
        {error ? (
          <p style={styles.error}>
            <strong>Error:</strong> {error}
          </p>
        ) : null}
        <p style={styles.sectionLabel}>Transcript</p>
        <p style={styles.block}>{lastTranscript ?? '—'}</p>
        <p style={styles.sectionLabel}>Insight / summary</p>
        <p style={styles.block}>{lastInsight ?? '—'}</p>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '20px',
    fontFamily: 'monospace',
    maxWidth: '640px',
    margin: '0 auto',
  },
  title: { fontSize: '1.2rem', marginBottom: '2rem' },
  button: {
    width: '200px',
    height: '200px',
    borderRadius: '50%',
    color: 'white',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: 'bold',
  },
  statusBox: {
    marginTop: '2rem',
    textAlign: 'left',
    border: '1px solid #ccc',
    padding: '16px',
    width: '100%',
    boxSizing: 'border-box',
  },
  sectionLabel: {
    marginTop: '12px',
    marginBottom: '4px',
    fontSize: '0.75rem',
    textTransform: 'uppercase',
    color: '#666',
  },
  block: {
    margin: 0,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  error: { color: '#c62828', marginTop: '8px' },
};

export default App;
