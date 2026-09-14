import React, { useState, useEffect } from 'react';
import { Search, Plus } from 'lucide-react';
import { powersync, createExercise } from '../db/powersync';
import type { ExerciseRecord } from '../db/schema';

const MUSCLE_GROUPS = ['All', 'Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core'];

export const ExerciseCatalog: React.FC = () => {
  const [exercises, setExercises] = useState<ExerciseRecord[]>([]);
  const [selectedGroup, setSelectedGroup] = useState('All');
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customGroup, setCustomGroup] = useState('Chest');

  const loadExercises = async () => {
    try {
      const rows = await powersync.getAll<ExerciseRecord>(
        'SELECT * FROM exercises ORDER BY name ASC'
      );
      setExercises(rows);
    } catch (err) {
      console.error('Error fetching exercises:', err);
    }
  };

  useEffect(() => {
    loadExercises();
  }, []);

  const handleCreateCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    await createExercise(customName.trim(), customGroup);
    setCustomName('');
    setShowAddModal(false);
    loadExercises();
  };

  const filtered = exercises.filter((ex) => {
    const matchesGroup = selectedGroup === 'All' || ex.muscle_group.toLowerCase() === selectedGroup.toLowerCase();
    const matchesSearch = ex.name.toLowerCase().includes(search.toLowerCase());
    return matchesGroup && matchesSearch;
  });

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '4px' }}>Exercise Library</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Built-in & custom exercises saved in local SQLite
          </p>
        </div>

        <button
          className="btn btn-primary"
          style={{ minHeight: '48px', height: '48px', padding: '0 16px', fontSize: '0.9rem' }}
          onClick={() => setShowAddModal(true)}
        >
          <Plus size={18} /> + Custom
        </button>
      </div>

      {/* Search Bar */}
      <div style={{ position: 'relative', marginBottom: '16px' }}>
        <input
          type="text"
          placeholder="Search exercises..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            height: '52px',
            borderRadius: '12px',
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-primary)',
            padding: '0 16px 0 46px',
            fontSize: '1rem',
            outline: 'none',
          }}
        />
        <Search size={20} color="var(--text-muted)" style={{ position: 'absolute', left: '16px', top: '16px' }} />
      </div>

      {/* Muscle Group Filter Chips */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '16px' }}>
        {MUSCLE_GROUPS.map((group) => (
          <button
            key={group}
            onClick={() => setSelectedGroup(group)}
            style={{
              padding: '8px 16px',
              borderRadius: '9999px',
              border: '1px solid',
              borderColor: selectedGroup === group ? 'var(--accent-blue)' : 'var(--border-subtle)',
              backgroundColor: selectedGroup === group ? 'var(--accent-blue)' : 'var(--bg-surface-elevated)',
              color: selectedGroup === group ? '#fff' : 'var(--text-secondary)',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {group}
          </button>
        ))}
      </div>

      {/* List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filtered.map((ex) => (
          <div
            key={ex.id}
            style={{
              padding: '16px',
              borderRadius: '12px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>{ex.name}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {ex.muscle_group}
              </div>
            </div>

            {ex.is_custom === 1 ? (
              <span style={{ fontSize: '0.7rem', padding: '4px 8px', borderRadius: '6px', background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', fontWeight: 700 }}>
                Custom
              </span>
            ) : (
              <span style={{ fontSize: '0.7rem', padding: '4px 8px', borderRadius: '6px', background: 'var(--bg-surface-elevated)', color: 'var(--text-muted)', fontWeight: 600 }}>
                Built-in
              </span>
            )}
          </div>
        ))}

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
            No exercises found matching "{search}".
          </div>
        )}
      </div>

      {/* Add Custom Exercise Modal */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '16px' }}>Add Custom Exercise</h2>

            <form onSubmit={handleCreateCustom}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                EXERCISE NAME
              </label>
              <input
                type="text"
                autoFocus
                placeholder="e.g., Incline Hammer Strength Press"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                style={{
                  width: '100%',
                  height: '56px',
                  borderRadius: '12px',
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  padding: '0 16px',
                  fontSize: '1rem',
                  marginBottom: '16px',
                  outline: 'none',
                }}
              />

              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                PRIMARY MUSCLE GROUP
              </label>
              <select
                value={customGroup}
                onChange={(e) => setCustomGroup(e.target.value)}
                style={{
                  width: '100%',
                  height: '56px',
                  borderRadius: '12px',
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  padding: '0 16px',
                  fontSize: '1rem',
                  marginBottom: '24px',
                  outline: 'none',
                }}
              >
                {MUSCLE_GROUPS.filter((g) => g !== 'All').map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  type="submit"
                  disabled={!customName.trim()}
                  className="btn btn-primary btn-lg"
                >
                  Save to Library
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddModal(false)}
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
