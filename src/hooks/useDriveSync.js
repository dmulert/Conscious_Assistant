import { useCallback, useEffect, useState } from 'react';
import { enqueue as enqueueItem, loadQueue, saveQueue, updateItem } from '../sync/actionQueue.js';
import { appendLogLine, ensureLogFile } from '../sync/googleDrive.js';

const GIS_SRC = 'https://accounts.google.com/gsi/client';
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';

/**
 * Phase 3: queue brain results locally and sync JSON lines to Google Drive (`drive.file` scope).
 */
export function useDriveSync() {
  const [queue, setQueue] = useState(loadQueue);
  const [accessToken, setAccessToken] = useState(null);
  const [gisReady, setGisReady] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [driveError, setDriveError] = useState(null);

  useEffect(() => {
    if (!CLIENT_ID) return;
    const existing = document.querySelector(`script[src="${GIS_SRC}"]`);
    if (existing && window.google?.accounts?.oauth2) {
      setGisReady(true);
      return;
    }
    const s = document.createElement('script');
    s.src = GIS_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => setGisReady(true);
    document.head.appendChild(s);
  }, []);

  const enqueue = useCallback((payload) => {
    setQueue((prev) => {
      const next = enqueueItem(prev, payload);
      saveQueue(next);
      return next;
    });
  }, []);

  const connectGoogle = useCallback(() => {
    setDriveError(null);
    if (!CLIENT_ID) {
      setDriveError('Set VITE_GOOGLE_CLIENT_ID in .env (Google Cloud OAuth Web client).');
      return;
    }
    if (!gisReady || !window.google?.accounts?.oauth2) {
      setDriveError('Google Identity script not loaded yet.');
      return;
    }
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: 'https://www.googleapis.com/auth/drive.file',
      callback: (resp) => {
        if (resp.access_token) {
          setAccessToken(resp.access_token);
          return;
        }
        if (resp.error) {
          setDriveError(`${resp.error}: ${resp.error_description ?? ''}`);
        }
      },
    });
    client.requestAccessToken();
  }, [gisReady]);

  const disconnectGoogle = useCallback(() => {
    setAccessToken(null);
    setDriveError(null);
  }, []);

  const syncNow = useCallback(async () => {
    if (!accessToken) {
      setDriveError('Connect Google first.');
      return;
    }
    const pending = loadQueue().filter((x) => x.status === 'pending');
    if (pending.length === 0) {
      setDriveError(null);
      return;
    }
    setSyncing(true);
    setDriveError(null);
    try {
      const fileId = await ensureLogFile(accessToken);
      let current = loadQueue();
      for (const item of pending) {
        await appendLogLine(fileId, accessToken, {
          id: item.id,
          createdAt: item.createdAt,
          transcript: item.transcript,
          insight: item.insight,
        });
        current = updateItem(current, item.id, { status: 'synced' });
        saveQueue(current);
        setQueue(current);
      }
    } catch (e) {
      console.error(e);
      setDriveError(e?.message ?? String(e));
    } finally {
      setSyncing(false);
    }
  }, [accessToken]);

  const pendingCount = queue.filter((x) => x.status === 'pending').length;

  return {
    clientIdConfigured: Boolean(CLIENT_ID),
    gisReady,
    accessToken,
    queue,
    pendingCount,
    syncing,
    driveError,
    enqueue,
    connectGoogle,
    disconnectGoogle,
    syncNow,
  };
}
