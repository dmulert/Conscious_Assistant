const LOG_NAME = 'MuleBot_Conscious_Log.txt';
const FILE_ID_KEY = 'conscious_drive_log_file_id';

const DRIVE_FILES = 'https://www.googleapis.com/drive/v3/files';
const UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3/files';

/**
 * @param {string} accessToken
 */
async function fileExists(fileId, accessToken) {
  const r = await fetch(`${DRIVE_FILES}/${encodeURIComponent(fileId)}?fields=id`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return r.ok;
}

/**
 * @param {string} accessToken
 * @returns {Promise<string>} file id
 */
async function createLogFile(accessToken) {
  const meta = await fetch(DRIVE_FILES, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: LOG_NAME,
      mimeType: 'text/plain',
    }),
  });
  if (!meta.ok) {
    const t = await meta.text();
    throw new Error(`Drive create: ${meta.status} ${t}`);
  }
  const { id } = await meta.json();
  const header = '# MuleBot Conscious Assistant — JSONL (one object per line)\n';
  const up = await fetch(`${UPLOAD_BASE}/${encodeURIComponent(id)}?uploadType=media`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'text/plain; charset=UTF-8',
    },
    body: header,
  });
  if (!up.ok) {
    const t = await up.text();
    throw new Error(`Drive upload: ${up.status} ${t}`);
  }
  return id;
}

/**
 * Resolve or create the log file. Persists file id in localStorage.
 * @param {string} accessToken
 * @returns {Promise<string>}
 */
export async function ensureLogFile(accessToken) {
  let fileId = localStorage.getItem(FILE_ID_KEY);
  if (fileId && (await fileExists(fileId, accessToken))) {
    return fileId;
  }
  fileId = await createLogFile(accessToken);
  localStorage.setItem(FILE_ID_KEY, fileId);
  return fileId;
}

/**
 * Append one JSON line to the log file (download + replace).
 * @param {string} fileId
 * @param {string} accessToken
 * @param {Record<string, unknown>} entry
 */
export async function appendLogLine(fileId, accessToken, entry) {
  const line = `${JSON.stringify(entry)}\n`;
  const cur = await fetch(`${DRIVE_FILES}/${encodeURIComponent(fileId)}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!cur.ok) {
    const t = await cur.text();
    throw new Error(`Drive read: ${cur.status} ${t}`);
  }
  const text = await cur.text();
  const up = await fetch(`${UPLOAD_BASE}/${encodeURIComponent(fileId)}?uploadType=media`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'text/plain; charset=UTF-8',
    },
    body: text + line,
  });
  if (!up.ok) {
    const t = await up.text();
    throw new Error(`Drive append: ${up.status} ${t}`);
  }
}
