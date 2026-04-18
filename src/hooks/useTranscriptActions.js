import { useCallback, useMemo, useState } from 'react';

const STORAGE_KEY = 'conscious_actions_v1';

function safeLoadQueue() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveQueue(queue) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

function buildText(queue) {
  return queue
    .map((item) => {
      const ts = new Date(item.createdAt).toISOString();
      return [
        `Time: ${ts}`,
        `Transcript: ${item.transcript}`,
        `Insight: ${item.insight}`,
      ].join('\n');
    })
    .join('\n\n---\n\n');
}

function downloadText(text, filename) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return blob;
}

async function saveWithPicker(text, filename) {
  if (!window.showSaveFilePicker) {
    downloadText(text, filename);
    return;
  }

  const handle = await window.showSaveFilePicker({
    suggestedName: filename,
    types: [
      {
        description: 'Text',
        accept: { 'text/plain': ['.txt'] },
      },
    ],
  });
  const writable = await handle.createWritable();
  await writable.write(text);
  await writable.close();
}

export function useTranscriptActions() {
  const [queue, setQueue] = useState(safeLoadQueue);
  const [actionError, setActionError] = useState(null);
  const [actionMessage, setActionMessage] = useState('');

  const enqueue = useCallback((payload) => {
    setQueue((prev) => {
      const next = [
        ...prev,
        {
          id: `${payload.createdAt}-${Math.random().toString(36).slice(2, 10)}`,
          transcript: payload.transcript,
          insight: payload.insight,
          createdAt: payload.createdAt,
        },
      ];
      saveQueue(next);
      return next;
    });
  }, []);

  const clearQueue = useCallback(() => {
    saveQueue([]);
    setQueue([]);
    setActionMessage('Queue cleared.');
  }, []);

  const copyAll = useCallback(async () => {
    setActionError(null);
    if (!queue.length) return;
    try {
      await navigator.clipboard.writeText(buildText(queue));
      setActionMessage('Copied queue to clipboard.');
    } catch (e) {
      setActionError(e?.message ?? String(e));
    }
  }, [queue]);

  const saveAll = useCallback(async () => {
    setActionError(null);
    if (!queue.length) return;
    try {
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      await saveWithPicker(buildText(queue), `mulebot-transcripts-${stamp}.txt`);
      setActionMessage('Saved transcript file.');
    } catch (e) {
      if (e?.name !== 'AbortError') setActionError(e?.message ?? String(e));
    }
  }, [queue]);

  const shareAll = useCallback(async () => {
    setActionError(null);
    if (!queue.length) return;
    const text = buildText(queue);
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `mulebot-transcripts-${stamp}.txt`;

    try {
      const file = new File([text], filename, { type: 'text/plain' });
      if (navigator.canShare?.({ files: [file] }) && navigator.share) {
        await navigator.share({
          title: 'MuleBot transcripts',
          text: 'Transcript export from Conscious Assistant',
          files: [file],
        });
        setActionMessage('Shared transcript file.');
        return;
      }
      if (navigator.share) {
        await navigator.share({
          title: 'MuleBot transcripts',
          text,
        });
        setActionMessage('Shared transcript text.');
        return;
      }

      // Fallback for browsers without share support.
      downloadText(text, filename);
      setActionMessage('Share not supported; downloaded transcript file instead.');
    } catch (e) {
      if (e?.name !== 'AbortError') setActionError(e?.message ?? String(e));
    }
  }, [queue]);

  const latest = useMemo(() => (queue.length ? queue[queue.length - 1] : null), [queue]);

  return {
    queue,
    queueCount: queue.length,
    latest,
    actionError,
    actionMessage,
    enqueue,
    clearQueue,
    copyAll,
    saveAll,
    shareAll,
  };
}
