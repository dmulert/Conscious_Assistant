import React, { useCallback, useState } from 'react';
import { useDriveSync } from './hooks/useDriveSync';
import { useGemmaInference } from './hooks/useGemmaInference';
import { useVAD } from './hooks/useVAD';

const App = () => {
  const [isAwake, setIsAwake] = useState(false);
  const {
    clientIdConfigured,
    accessToken,
    queue,
    pendingCount,
    syncing,
    driveError,
    enqueue,
    connectGoogle,
    disconnectGoogle,
    syncNow,
  } = useDriveSync();

  const handleInsight = useCallback(
    (payload) => {
      enqueue(payload);
    },
    [enqueue]
  );

  const {
    processAudio,
    brainStatus,
    loadProgress,
    lastTranscript,
    lastInsight,
    error,
    summarizerReady,
  } = useGemmaInference(isAwake, { onInsight: handleInsight });
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

        <p style={styles.sectionLabel}>Phase 3 — Drive queue</p>
        {!clientIdConfigured ? (
          <p style={styles.hint}>
            Add <code style={styles.code}>VITE_GOOGLE_CLIENT_ID</code> to <code style={styles.code}>.env</code> and
            restart Vite to enable Google sync (OAuth Web client + Drive API).
          </p>
        ) : (
          <div style={styles.driveRow}>
            {!accessToken ? (
              <button type="button" style={styles.secondaryBtn} onClick={connectGoogle}>
                Connect Google
              </button>
            ) : (
              <>
                <span style={styles.connected}>Drive connected</span>
                <button type="button" style={styles.secondaryBtn} onClick={disconnectGoogle}>
                  Disconnect
                </button>
                <button
                  type="button"
                  style={styles.secondaryBtn}
                  onClick={() => void syncNow()}
                  disabled={syncing || pendingCount === 0}
                >
                  {syncing ? 'Syncing…' : `Sync to Drive (${pendingCount} pending)`}
                </button>
              </>
            )}
          </div>
        )}
        {driveError ? (
          <p style={styles.error}>
            <strong>Drive:</strong> {driveError}
          </p>
        ) : null}
        <p style={styles.queueMeta}>
          Local queue: {queue.length} item(s) · {pendingCount} pending
        </p>
        <ul style={styles.queueList}>
          {queue.slice(-8).map((item) => (
            <li key={item.id} style={styles.queueItem}>
              <span style={item.status === 'synced' ? styles.synced : styles.pending}>
                [{item.status}]
              </span>{' '}
              {new Date(item.createdAt).toLocaleString()} — {item.insight.slice(0, 120)}
              {item.insight.length > 120 ? '…' : ''}
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
  hint: { fontSize: '0.85rem', color: '#555', lineHeight: 1.5 },
  code: { background: '#eee', padding: '0 4px' },
  driveRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    alignItems: 'center',
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
  connected: { fontSize: '0.85rem', color: '#2e7d32' },
  queueMeta: { fontSize: '0.8rem', color: '#666', marginTop: '12px' },
  queueList: {
    margin: '8px 0 0',
    paddingLeft: '1.2rem',
    fontSize: '0.8rem',
    maxHeight: '180px',
    overflowY: 'auto',
  },
  queueItem: { marginBottom: '6px' },
  synced: { color: '#2e7d32' },
  pending: { color: '#ef6c00' },
};

export default App;
