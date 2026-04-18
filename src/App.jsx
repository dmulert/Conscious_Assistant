import React, { useCallback, useState } from 'react';
import { useGemmaInference } from './hooks/useGemmaInference';
import { useTranscriptActions } from './hooks/useTranscriptActions';
import { useVAD } from './hooks/useVAD';

const App = () => {
  const [isAwake, setIsAwake] = useState(false);
  const { queue, queueCount, actionError, actionMessage, enqueue, clearQueue, copyAll, saveAll, shareAll } =
    useTranscriptActions();

  const handleInsight = useCallback(
    (payload) => {
      enqueue(payload);
    },
    [enqueue]
  );

  const { processAudio, brainStatus, loadProgress, lastTranscript, lastInsight, error, summarizerReady } =
    useGemmaInference(isAwake, { onInsight: handleInsight });
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
        ? `Loading models... ${loadProgress}%`
        : brainStatus === 'ready'
          ? summarizerReady
            ? 'Ready (ASR + summary)'
            : 'Ready (ASR; summary loading...)'
          : brainStatus === 'inferring'
            ? 'Thinking...'
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
          Mic: <strong>{isSpeaking ? 'LISTENING...' : 'WAITING'}</strong>
        </p>
        <p>Brain: {brainLabel}</p>
        {error ? (
          <p style={styles.error}>
            <strong>Error:</strong> {error}
          </p>
        ) : null}
        <p style={styles.sectionLabel}>Transcript</p>
        <p style={styles.block}>{lastTranscript ?? '-'}</p>
        <p style={styles.sectionLabel}>Insight / summary</p>
        <p style={styles.block}>{lastInsight ?? '-'}</p>

        <p style={styles.sectionLabel}>Phase 3 - Save options</p>
        <p style={styles.queueMeta}>Queue: {queueCount} item(s)</p>
        <div style={styles.actionsRow}>
          <button type="button" style={styles.secondaryBtn} onClick={() => void copyAll()} disabled={!queueCount}>
            Copy all
          </button>
          <button type="button" style={styles.secondaryBtn} onClick={() => void saveAll()} disabled={!queueCount}>
            Save as...
          </button>
          <button type="button" style={styles.secondaryBtn} onClick={() => void shareAll()} disabled={!queueCount}>
            Share... (Drive, etc)
          </button>
          <button type="button" style={styles.secondaryBtn} onClick={clearQueue} disabled={!queueCount}>
            Clear queue
          </button>
        </div>
        <p style={styles.hint}>
          Tip: <strong>Share...</strong> opens your device share sheet, so you can choose Google Drive, email, notes,
          and more without app OAuth.
        </p>

        {actionMessage ? <p style={styles.ok}>{actionMessage}</p> : null}
        {actionError ? (
          <p style={styles.error}>
            <strong>Save action:</strong> {actionError}
          </p>
        ) : null}

        <ul style={styles.queueList}>
          {queue.slice(-8).map((item) => (
            <li key={item.id} style={styles.queueItem}>
              {new Date(item.createdAt).toLocaleString()} - {item.insight.slice(0, 120)}
              {item.insight.length > 120 ? '...' : ''}
            </li>
          ))}
        </ul>
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
  ok: { color: '#2e7d32', marginTop: '8px' },
  hint: { fontSize: '0.85rem', color: '#555', lineHeight: 1.5, marginTop: '8px' },
  actionsRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginTop: '8px',
  },
  secondaryBtn: {
    padding: '8px 12px',
    fontFamily: 'monospace',
    fontSize: '0.85rem',
    cursor: 'pointer',
    border: '1px solid #999',
    background: '#f5f5f5',
    borderRadius: '4px',
  },
  queueMeta: { fontSize: '0.8rem', color: '#666', marginTop: '8px' },
  queueList: {
    margin: '8px 0 0',
    paddingLeft: '1.2rem',
    fontSize: '0.8rem',
    maxHeight: '180px',
    overflowY: 'auto',
  },
  queueItem: { marginBottom: '6px' },
};

export default App;
