 /**
  * Lightweight API client for the Notes frontend.
  * Uses REACT_APP_API_BASE or REACT_APP_BACKEND_URL to construct the base URL.
  * Falls back to same-origin if not set.
  * Provides a simple in-memory fallback store when backend fails and feature flag REACT_APP_FEATURE_FLAGS contains "fallback".
  */

// PUBLIC_INTERFACE
export function getApiBase() {
  /** Returns the API base URL derived from env or same-origin. */
  const base =
    process.env.REACT_APP_API_BASE ||
    process.env.REACT_APP_BACKEND_URL ||
    '';
  if (!base) return '';
  // Remove trailing slash
  return base.replace(/\/+$/, '');
}

const FEATURE_FLAGS =
  (process.env.REACT_APP_FEATURE_FLAGS || '').split(',').map(s => s.trim().toLowerCase());

const enableFallback = FEATURE_FLAGS.includes('fallback');

// Simple in-memory fallback data store
let fallbackNotes = [
  { id: '1', title: 'Welcome to Notes', content: 'This is a demo note from the fallback store.', updatedAt: new Date().toISOString() },
];

function fakeDelay(ms = 300) {
  return new Promise(res => setTimeout(res, ms));
}

async function handleResponse(res) {
  if (!res.ok) {
    const text = await res.text();
    const message = text || res.statusText || 'Request failed';
    throw new Error(message);
  }
  if (res.status === 204) return null;
  return res.json();
}

// PUBLIC_INTERFACE
export async function listNotes() {
  /** Fetch all notes. Uses backend if available, else fallback when enabled. */
  const base = getApiBase();
  if (base) {
    try {
      const res = await fetch(`${base}/notes`);
      return await handleResponse(res);
    } catch (e) {
      if (!enableFallback) throw e;
    }
  }
  if (!enableFallback) throw new Error('Backend unavailable and fallback disabled.');
  await fakeDelay();
  // Return sorted by updatedAt desc
  return [...fallbackNotes].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

// PUBLIC_INTERFACE
export async function getNote(id) {
  /** Fetch a single note by id. */
  const base = getApiBase();
  if (base) {
    try {
      const res = await fetch(`${base}/notes/${encodeURIComponent(id)}`);
      return await handleResponse(res);
    } catch (e) {
      if (!enableFallback) throw e;
    }
  }
  if (!enableFallback) throw new Error('Backend unavailable and fallback disabled.');
  await fakeDelay();
  const found = fallbackNotes.find(n => n.id === id);
  if (!found) throw new Error('Note not found');
  return found;
}

// PUBLIC_INTERFACE
export async function createNote(payload) {
  /** Create a new note. payload: {title, content} */
  const base = getApiBase();
  if (base) {
    try {
      const res = await fetch(`${base}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return await handleResponse(res);
    } catch (e) {
      if (!enableFallback) throw e;
    }
  }
  if (!enableFallback) throw new Error('Backend unavailable and fallback disabled.');
  await fakeDelay();
  const newNote = {
    id: Math.random().toString(36).slice(2, 10),
    title: payload.title || 'Untitled',
    content: payload.content || '',
    updatedAt: new Date().toISOString(),
  };
  fallbackNotes = [newNote, ...fallbackNotes];
  return newNote;
}

// PUBLIC_INTERFACE
export async function updateNote(id, payload) {
  /** Update note fields by id. payload: {title?, content?} */
  const base = getApiBase();
  if (base) {
    try {
      const res = await fetch(`${base}/notes/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return await handleResponse(res);
    } catch (e) {
      if (!enableFallback) throw e;
    }
  }
  if (!enableFallback) throw new Error('Backend unavailable and fallback disabled.');
  await fakeDelay();
  const idx = fallbackNotes.findIndex(n => n.id === id);
  if (idx === -1) throw new Error('Note not found');
  const updated = {
    ...fallbackNotes[idx],
    ...payload,
    updatedAt: new Date().toISOString(),
  };
  fallbackNotes[idx] = updated;
  return updated;
}

// PUBLIC_INTERFACE
export async function deleteNote(id) {
  /** Delete a note by id. */
  const base = getApiBase();
  if (base) {
    try {
      const res = await fetch(`${base}/notes/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      await handleResponse(res);
      return true;
    } catch (e) {
      if (!enableFallback) throw e;
    }
  }
  if (!enableFallback) throw new Error('Backend unavailable and fallback disabled.');
  await fakeDelay();
  fallbackNotes = fallbackNotes.filter(n => n.id !== id);
  return true;
}
