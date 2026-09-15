import React, { useState, useEffect } from 'react';
import { Search, Plus, Dumbbell, Check, X } from 'lucide-react';
import { powersync, createExercise, DEFAULT_USER_ID } from '../db/powersync';
import type { ExerciseRecord } from '../db/schema';

const MUSCLE_GROUPS = ['All', 'Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core'];

export const ExercisesView: React.FC = () => {
  const [exercises, setExercises] = useState<ExerciseRecord[]>([]);
  const [selectedGroup, setSelectedGroup] = useState('All');
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customGroup, setCustomGroup] = useState('Chest');

  const loadExercises = async () => {
    try {
      const rows = await powersync.getAll<ExerciseRecord>(
        'SELECT * FROM exercises ORDER BY muscle_group ASC, name ASC'
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

    // Strictly ensure is_custom = 1 and user_id populated with user UUID
    await createExercise(customName.trim(), customGroup, DEFAULT_USER_ID);
    setCustomName('');
    setShowAddModal(false);
    loadExercises();
  };

  const filtered = exercises.filter((ex) => {
    const matchesGroup = selectedGroup === 'All' || ex.muscle_group.toLowerCase() === selectedGroup.toLowerCase();
    const matchesSearch = ex.name.toLowerCase().includes(search.toLowerCase()) ||
                          ex.muscle_group.toLowerCase().includes(search.toLowerCase());
    return matchesGroup && matchesSearch;
  });

  // Group by muscle_group
  const groupedExercises: Record<string, ExerciseRecord[]> = {};
  filtered.forEach((ex) => {
    if (!groupedExercises[ex.muscle_group]) {
      groupedExercises[ex.muscle_group] = [];
    }
    groupedExercises[ex.muscle_group].push(ex);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <span className="font-label-micro text-label-micro uppercase text-secondary tracking-widest font-bold">
            Catalog & Database
          </span>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
            Exercises
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '2px' }}>
            {exercises.length} movements stored in browser SQLite
          </p>
        </div>

        <button
          className="btn btn-primary"
          style={{ minHeight: '52px', height: '52px', padding: '0 16px', fontSize: '0.9rem' }}
          onClick={() => setShowAddModal(true)}
          id="btn-new-custom-exercise"
        >
          <Plus size={18} /> + Custom
        </button>
      </div>

      {/* Sticky Search & Filter Header */}
      <div style={{ position: 'sticky', top: '70px', zIndex: 30, background: 'var(--bg-primary)', paddingTop: '4px', paddingBottom: '8px' }}>
        <div style={{ position: 'relative', marginBottom: '10px' }}>
          <input
            type="text"
            placeholder="Search exercises or muscle..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              height: '56px',
              borderRadius: '12px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              padding: '0 16px 0 48px',
              fontSize: '1rem',
              outline: 'none',
            }}
          />
          <Search size={20} color="var(--text-muted)" style={{ position: 'absolute', left: '16px', top: '18px' }} />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{ position: 'absolute', right: '14px', top: '16px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Filter Chips */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px' }}>
          {MUSCLE_GROUPS.map((group) => (
            <button
              key={group}
              onClick={() => setSelectedGroup(group)}
              style={{
                minHeight: '40px',
                padding: '0 16px',
                borderRadius: '9999px',
                border: '1px solid',
                borderColor: selectedGroup === group ? 'var(--accent-blue)' : 'var(--border-subtle)',
                backgroundColor: selectedGroup === group ? 'var(--accent-blue)' : 'var(--bg-surface)',
                color: selectedGroup === group ? '#fff' : 'var(--text-secondary)',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              {group}
            </button>
          ))}
        </div>
      </div>

      {/* Grouped Exercise List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {Object.keys(groupedExercises).map((muscle) => (
          <div key={muscle}>
            {/* Muscle Group Section Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <div style={{ width: '4px', height: '16px', background: 'var(--accent-green)', borderRadius: '2px' }} />
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {muscle}
              </h2>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', background: 'var(--bg-surface-elevated)', padding: '2px 8px', borderRadius: '999px' }}>
                {groupedExercises[muscle].length}
              </span>
            </div>

            {/* Exercises in this group */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {groupedExercises[muscle].map((ex) => (
                <div
                  key={ex.id}
                  style={{
                    minHeight: '56px',
                    padding: '14px 18px',
                    borderRadius: '12px',
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
                      {ex.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {ex.muscle_group}
                    </div>
                  </div>

                  {ex.is_custom === 1 ? (
                    <span style={{ fontSize: '0.72rem', padding: '4px 10px', borderRadius: '6px', background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Custom
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.72rem', padding: '4px 10px', borderRadius: '6px', background: 'var(--bg-surface-elevated)', color: 'var(--text-muted)', fontWeight: 600 }}>
                      Built-in
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--bg-surface)', borderRadius: '18px', border: '1px solid var(--border-subtle)' }}>
            <Dumbbell size={44} color="var(--text-muted)" style={{ opacity: 0.3, margin: '0 auto 12px auto' }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>No Exercises Found</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '6px' }}>
              No matches for "{search}". Create a custom exercise above!
            </p>
          </div>
        )}
      </div>

      {/* Add Custom Exercise Modal */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '16px' }}>+ New Custom Exercise</h2>

            <form onSubmit={handleCreateCustom}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                EXERCISE NAME
              </label>
              <input
                type="text"
                autoFocus
                placeholder="e.g., Incline Hammer Strength Chest Press"
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
                TARGET MUSCLE GROUP
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
                  <Check size={20} /> Save Custom Exercise
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

export default ExercisesView;
