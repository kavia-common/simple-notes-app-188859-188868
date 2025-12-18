 import React, { useEffect, useMemo, useState } from 'react';
import { listNotes, createNote, updateNote, deleteNote } from './api';
import { cx, formatDate } from './utils';

// Theme constants from style guide
const colors = {
  primary: '#3b82f6',
  secondary: '#64748b',
  success: '#06b6d4',
  error: '#EF4444',
  background: '#f9fafb',
  surface: '#ffffff',
  text: '#111827',
};

function useNotes() {
  const [notes, setNotes] = useState([]);
  const [status, setStatus] = useState('idle'); // idle | loading | error | success
  const [error, setError] = useState('');

  async function refresh() {
    setStatus('loading');
    setError('');
    try {
      const data = await listNotes();
      setNotes(data || []);
      setStatus('success');
    } catch (e) {
      setStatus('error');
      setError(e?.message || 'Failed to load notes');
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  return { notes, setNotes, status, error, refresh };
}

function Sidebar({ notes, activeId, onSelect, onCreate, search, setSearch, loading }) {
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return notes;
    return notes.filter(n =>
      (n.title || '').toLowerCase().includes(term) ||
      (n.content || '').toLowerCase().includes(term)
    );
  }, [notes, search]);

  return (
    <aside className="sidebar" aria-label="Notes list">
      <div className="sidebar-header">
        <h1 className="app-title">Notes</h1>
        <button className="btn-primary" onClick={onCreate} aria-label="Create new note">+ New</button>
      </div>
      <div className="search-wrap">
        <input
          className="search-input"
          type="search"
          placeholder="Search notes..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          aria-label="Search notes"
        />
      </div>
      <div className="list" role="list">
        {loading && (
          <div className="placeholder">Loading notes…</div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="placeholder">No notes {search ? 'match your search' : 'yet'}</div>
        )}
        {filtered.map(n => (
          <button
            key={n.id}
            role="listitem"
            className={cx('list-item', activeId === n.id && 'active')}
            onClick={() => onSelect(n.id)}
            title={n.title}
          >
            <div className="list-item-title">{n.title || 'Untitled'}</div>
            <div className="list-item-preview">{(n.content || '').slice(0, 80) || 'No content'}</div>
            <div className="list-item-date">{formatDate(n.updatedAt)}</div>
          </button>
        ))}
      </div>
    </aside>
  );
}

function EmptyState({ onCreate }) {
  return (
    <div className="empty-state">
      <h2>Welcome</h2>
      <p>Create your first note to get started.</p>
      <button className="btn-primary" onClick={onCreate}>Create a note</button>
    </div>
  );
}

function NoteEditor({ note, onSave, onCancel, onDelete, saving }) {
  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || '');

  useEffect(() => {
    setTitle(note?.title || '');
    setContent(note?.content || '');
  }, [note?.id]);

  return (
    <div className="editor">
      <div className="editor-toolbar">
        <input
          className="title-input"
          placeholder="Untitled"
          value={title}
          onChange={e => setTitle(e.target.value)}
          aria-label="Note title"
        />
        <div className="spacer" />
        {note?.id && (
          <button
            className="btn-danger-outline"
            onClick={onDelete}
            aria-label="Delete note"
          >
            Delete
          </button>
        )}
        <button className="btn-secondary" onClick={onCancel}>Cancel</button>
        <button
          className="btn-primary"
          onClick={() => onSave({ title: (title || '').trim(), content })}
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
      <textarea
        className="content-input"
        placeholder="Write your note here..."
        value={content}
        onChange={e => setContent(e.target.value)}
        aria-label="Note content"
      />
    </div>
  );
}

function NoteView({ note, onEdit, onDelete }) {
  if (!note) return null;
  return (
    <div className="note-view">
      <div className="editor-toolbar">
        <h2 className="note-title">{note.title || 'Untitled'}</h2>
        <div className="spacer" />
        <span className="muted mr">{formatDate(note.updatedAt)}</span>
        <button className="btn-danger-outline" onClick={onDelete}>Delete</button>
        <button className="btn-primary" onClick={onEdit}>Edit</button>
      </div>
      <div className="note-content">
        {(note.content || '').split('\n').map((line, idx) => (
          <p key={idx}>{line || ' '}</p>
        ))}
      </div>
    </div>
  );
}

// PUBLIC_INTERFACE
export default function NotesLayout() {
  /** Main layout for the Notes app with sidebar and detail panel. */
  const { notes, setNotes, status, error, refresh } = useNotes();
  const [activeId, setActiveId] = useState(null);
  const [mode, setMode] = useState('empty'); // empty | viewing | editing | creating
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (notes.length > 0 && !activeId) {
      setActiveId(notes[0].id);
      setMode('viewing');
    } else if (notes.length === 0) {
      setActiveId(null);
      setMode('empty');
    }
  }, [notes, activeId]);

  const activeNote = useMemo(() => notes.find(n => n.id === activeId), [notes, activeId]);

  function onSelect(id) {
    setActiveId(id);
    setMode('viewing');
  }

  async function onCreate() {
    setMode('creating');
    setActiveId(null);
  }

  async function handleSave(payload) {
    setSaving(true);
    try {
      if (mode === 'creating') {
        // optimistic insert
        const tempId = `temp_${Date.now()}`;
        const optimistic = {
          id: tempId,
          title: payload.title || 'Untitled',
          content: payload.content || '',
          updatedAt: new Date().toISOString(),
        };
        setNotes(prev => [optimistic, ...prev]);
        setActiveId(tempId);
        setMode('viewing');

        const created = await createNote(payload);
        setNotes(prev => [created, ...prev.filter(n => n.id !== tempId)]);
        setActiveId(created.id);
        setMode('viewing');
      } else if (mode === 'editing' && activeNote) {
        // optimistic update
        const updated = {
          ...activeNote,
          ...payload,
          updatedAt: new Date().toISOString(),
        };
        setNotes(prev => prev.map(n => (n.id === activeNote.id ? updated : n)));
        await updateNote(activeNote.id, payload);
        await refresh(); // ensure canonical order
        setMode('viewing');
      }
    } catch (e) {
      alert(`Error saving note: ${e?.message || e}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!activeNote) return;
    const confirmMsg = `Delete "${activeNote.title || 'Untitled'}"?`;
    if (!window.confirm(confirmMsg)) return;
    const idToDelete = activeNote.id;
    // optimistic remove
    setNotes(prev => prev.filter(n => n.id !== idToDelete));
    setActiveId(null);
    setMode('empty');
    try {
      await deleteNote(idToDelete);
      if (notes.length > 1) {
        // select next available
        const next = notes.find(n => n.id !== idToDelete);
        if (next) {
          setActiveId(next.id);
          setMode('viewing');
        }
      }
    } catch (e) {
      alert(`Error deleting note: ${e?.message || e}`);
      // revert by reloading
      refresh();
    }
  }

  function startEdit() {
    setMode('editing');
  }

  function cancelEdit() {
    if (notes.length === 0) {
      setMode('empty');
      return;
    }
    setMode('viewing');
  }

  return (
    <div className="layout" style={{ background: colors.background, color: colors.text }}>
      <Sidebar
        notes={notes}
        activeId={activeId}
        onSelect={onSelect}
        onCreate={onCreate}
        search={search}
        setSearch={setSearch}
        loading={status === 'loading'}
      />
      <main className="main-panel" aria-live="polite">
        {status === 'error' && (
          <div className="banner banner-error" role="alert">
            Failed to load notes: {error}
          </div>
        )}
        {status === 'loading' && notes.length === 0 && (
          <div className="loading">Loading…</div>
        )}
        {mode === 'empty' && status !== 'loading' && (
          <EmptyState onCreate={onCreate} />
        )}
        {(mode === 'creating' || mode === 'editing') && (
          <NoteEditor
            note={mode === 'editing' ? activeNote : null}
            onSave={handleSave}
            onCancel={cancelEdit}
            onDelete={handleDelete}
            saving={saving}
          />
        )}
        {mode === 'viewing' && activeNote && (
          <NoteView note={activeNote} onEdit={startEdit} onDelete={handleDelete} />
        )}
      </main>
      <style>{`
        :root {
          --primary: ${colors.primary};
          --secondary: ${colors.secondary};
          --success: ${colors.success};
          --error: ${colors.error};
          --bg: ${colors.background};
          --surface: ${colors.surface};
          --text: ${colors.text};
          --border: #e5e7eb;
        }
        .layout {
          display: grid;
          grid-template-columns: 320px 1fr;
          height: 100vh;
          background: var(--bg);
        }
        @media (max-width: 900px) {
          .layout {
            grid-template-columns: 1fr;
            grid-template-rows: auto 1fr;
          }
          .sidebar {
            position: sticky;
            top: 0;
            z-index: 2;
            border-right: none !important;
            border-bottom: 1px solid var(--border);
          }
        }
        .sidebar {
          background: var(--surface);
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          padding: 16px;
          gap: 12px;
        }
        .sidebar-header {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .app-title {
          margin: 0;
          font-size: 20px;
          font-weight: 700;
          color: var(--text);
        }
        .search-wrap {
          position: relative;
        }
        .search-input {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid var(--border);
          border-radius: 8px;
          font-size: 14px;
          outline: none;
          background: #fff;
        }
        .list {
          overflow: auto;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .list-item {
          text-align: left;
          background: #fff;
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 10px;
          cursor: pointer;
          transition: box-shadow 0.2s, border-color 0.2s, transform 0.05s;
        }
        .list-item:hover {
          border-color: var(--primary);
          box-shadow: 0 2px 10px rgba(59,130,246,0.12);
        }
        .list-item:active {
          transform: translateY(1px);
        }
        .list-item.active {
          border-color: var(--primary);
          box-shadow: 0 0 0 2px rgba(59,130,246,0.25) inset;
        }
        .list-item-title {
          font-weight: 600;
          margin-bottom: 4px;
        }
        .list-item-preview {
          font-size: 12px;
          color: ${colors.secondary};
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .list-item-date {
          font-size: 11px;
          color: ${colors.secondary};
          margin-top: 6px;
        }
        .placeholder {
          color: ${colors.secondary};
          text-align: center;
          padding: 12px;
        }
        .main-panel {
          display: flex;
          flex-direction: column;
          padding: 16px;
          overflow: auto;
        }
        .banner {
          padding: 10px 12px;
          border-radius: 8px;
          margin-bottom: 12px;
        }
        .banner-error {
          background: rgba(239,68,68,0.1);
          color: #7f1d1d;
          border: 1px solid rgba(239,68,68,0.3);
        }
        .loading {
          color: ${colors.secondary};
          padding: 24px;
        }
        .empty-state {
          margin: auto;
          text-align: center;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 32px;
          max-width: 520px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.05);
        }
        .empty-state h2 {
          margin: 0 0 8px 0;
        }
        .empty-state p {
          color: ${colors.secondary};
          margin: 0 0 16px 0;
        }
        .editor, .note-view {
          display: flex;
          flex-direction: column;
          gap: 12px;
          height: 100%;
        }
        .editor-toolbar {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 12px;
        }
        .title-input {
          flex: 1;
          padding: 10px 12px;
          border: 1px solid var(--border);
          border-radius: 8px;
          font-size: 16px;
          outline: none;
          background: #fff;
        }
        .content-input {
          flex: 1;
          min-height: 300px;
          resize: vertical;
          padding: 12px;
          border-radius: 12px;
          border: 1px solid var(--border);
          background: var(--surface);
          outline: none;
          font-size: 14px;
          line-height: 1.5;
        }
        .note-title {
          margin: 0;
        }
        .note-content {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 16px;
        }
        .muted { color: ${colors.secondary}; font-size: 13px; }
        .mr { margin-right: 8px; }
        .spacer { flex: 1; }

        .btn-primary, .btn-secondary, .btn-danger-outline {
          border-radius: 8px;
          border: 1px solid transparent;
          padding: 8px 12px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.05s, box-shadow 0.2s, background 0.2s, border-color 0.2s, color 0.2s;
        }
        .btn-primary {
          background: var(--primary);
          color: white;
          box-shadow: 0 4px 14px rgba(59,130,246,0.25);
        }
        .btn-primary:hover { box-shadow: 0 6px 18px rgba(59,130,246,0.35); }
        .btn-primary:active { transform: translateY(1px); }
        .btn-secondary {
          background: #e5f4f7;
          color: #065f6f;
          border-color: rgba(6,182,212,0.4);
        }
        .btn-secondary:hover { background: #d7f0f5; }
        .btn-danger-outline {
          background: transparent;
          color: ${colors.error};
          border-color: rgba(239,68,68,0.6);
        }
        .btn-danger-outline:hover { background: rgba(239,68,68,0.08); }
      `}</style>
    </div>
  );
}
