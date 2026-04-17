const STORAGE_KEY = 'conscious_actions_v1';

/**
 * @typedef {{ id: string, transcript: string, insight: string, createdAt: number, status: 'pending'|'synced'|'error', error?: string }} ActionItem
 */

/** @returns {ActionItem[]} */
export function loadQueue() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** @param {ActionItem[]} items */
export function saveQueue(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

/**
 * @param {ActionItem[]} items
 * @param {{ transcript: string, insight: string, createdAt: number }} payload
 * @returns {ActionItem[]}
 */
export function enqueue(items, payload) {
  const id = `${payload.createdAt}-${Math.random().toString(36).slice(2, 10)}`;
  return [
    ...items,
    {
      id,
      transcript: payload.transcript,
      insight: payload.insight,
      createdAt: payload.createdAt,
      status: 'pending',
    },
  ];
}

/** @param {ActionItem[]} items */
export function updateItem(items, id, patch) {
  return items.map((x) => (x.id === id ? { ...x, ...patch } : x));
}
