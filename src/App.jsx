import React, { useState } from 'react';
import { useVAD } from './hooks/useVAD';

const App = () => {
  const [isAwake, setIsAwake] = useState(false);
  const { isSpeaking, lastTranscript } = useVAD(isAwake);
  const [wakeLock, setWakeLock] = useState(null);

  // Utility over Novelty: Keep the screen on while "Awake"
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
          Status: <strong>{isSpeaking ? 'LISTENING...' : 'WAITING'}</strong>
        </p>
        <p>Last Sync: {lastTranscript || 'None'}</p>
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
    textAlign: 'center',
    border: '1px solid #ccc',
    padding: '10px',
    width: '80%',
  },
};

export default App;

