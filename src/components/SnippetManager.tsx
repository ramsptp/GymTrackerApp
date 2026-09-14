import React, { useState, useEffect } from 'react';
import { Play, Plus, Trash2, Layers } from 'lucide-react';
import { powersync, createSnippet } from '../db/powersync';
import type { SnippetRecord } from '../db/schema';

interface SnippetManagerProps {
  onStartSnippetWorkout: (snippet: SnippetRecord) => void;
  onStartFreestyleWorkout: () => void;
}

export const SnippetManager: React.FC<SnippetManagerProps> = ({
  onStartSnippetWorkout,
  onStartFreestyleWorkout,
}) => {
  const [snippets, setSnippets] = useState<SnippetRecord[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [snippetName, setSnippetName] = useState('');

  const loadSnippets = async () => {
    try {
      const rows = await powersync.getAll<SnippetRecord>(
        'SELECT * FROM snippets ORDER BY created_at DESC'
      );
      setSnippets(rows);
    } catch (err) {
      console.error('Error fetching snippets:', err);
    }
  };

  useEffect(() => {
    loadSnippets();
  }, []);

  const handleCreateSnippet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!snippetName.trim()) return;

    await createSnippet(snippetName.trim());
    setSnippetName('');
    setShowCreateModal(false);
    loadSnippets();
  };

  const handleDeleteSnippet = async (id: string) => {
    if (confirm('Delete this snippet?')) {
      await powersync.execute('DELETE FROM snippets WHERE id = ?', [id]);
      loadSnippets();
    }
  };

  return (
    <div>
      {/* Header with Freestyle Quick Start */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '6px' }}>Workout Snippets</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>
          Select a recurring snippet to start mid-workout logging, or create a new one.
        </p>

        <button
          className="btn btn-primary btn-lg"
          onClick={onStartFreestyleWorkout}
          style={{ marginBottom: '12px' }}
        >
          <Play size={22} fill="white" /> Quick Start (Empty Session)
        </button>

        <button
          className="btn btn-secondary btn-lg"
          onClick={() => setShowCreateModal(true)}
        >
          <Plus size={22} /> + Create New Snippet
        </button>
      </div>

      {/* Snippet Cards List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '8px' }}>
          <Layers size={14} /> Saved Snippets ({snippets.length})
        </div>

        {snippets.map((snippet) => (
          <div key={snippet.id} className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  {snippet.name}
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  Snippet ID: {snippet.id.slice(0, 8)}...
                </span>
              </div>

              <button
                onClick={() => handleDeleteSnippet(snippet.id)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '6px' }}
                title="Delete Snippet"
              >
                <Trash2 size={18} />
              </button>
            </div>

            <button
              className="btn btn-primary"
              style={{ width: '100%', minHeight: '52px', height: '52px', borderRadius: '12px' }}
              onClick={() => onStartSnippetWorkout(snippet)}
            >
              <Play size={18} fill="white" /> Start Workout
            </button>
          </div>
        ))}

        {snippets.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
            No snippets saved yet. Click "+ Create New Snippet" to add your split routines.
          </div>
        )}
      </div>

      {/* Create Snippet Modal */}
      {showCreateModal && (
        <div className="modal-backdrop" onClick={() => setShowCreateModal(false)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '16px' }}>New Workout Snippet</h2>

            <form onSubmit={handleCreateSnippet}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                SNIPPET NAME
              </label>
              <input
                type="text"
                autoFocus
                placeholder="e.g., Push B (Chest focus), Upper Body, Legs"
                value={snippetName}
                onChange={(e) => setSnippetName(e.target.value)}
                style={{
                  width: '100%',
                  height: '56px',
                  borderRadius: '12px',
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  padding: '0 16px',
                  fontSize: '1.05rem',
                  marginBottom: '24px',
                  outline: 'none',
                }}
              />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  type="submit"
                  disabled={!snippetName.trim()}
                  className="btn btn-primary btn-lg"
                >
                  Save Snippet
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
