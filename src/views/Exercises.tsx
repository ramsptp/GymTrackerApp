import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Dumbbell, Check, X, Info, ChevronRight, Sparkles } from 'lucide-react';
import { powersync, createExercise, DEFAULT_USER_ID } from '../db/powersync';
import type { ExerciseRecord } from '../db/schema';

const FILTER_CATEGORIES = [
  'All',
  'Chest',
  'Back',
  'Legs',
  'Shoulders',
  'Arms',
  'Waist',
  'Cardio',
] as const;

export const ExercisesView: React.FC = () => {
  const [exercises, setExercises] = useState<ExerciseRecord[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [displayLimit, setDisplayLimit] = useState(50);
  const [selectedExercise, setSelectedExercise] = useState<ExerciseRecord | null>(null);

  // Custom exercise modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customGroup, setCustomGroup] = useState('Chest');
  const [customEquipment, setCustomEquipment] = useState('dumbbell');
  const [customInstructions, setCustomInstructions] = useState('');

  const loadExercises = async () => {
    try {
      const rows = await powersync.getAll<ExerciseRecord>(
        'SELECT * FROM exercises ORDER BY is_custom DESC, name ASC'
      );
      setExercises(rows);
    } catch (err) {
      console.error('Error fetching exercises:', err);
    }
  };

  useEffect(() => {
    loadExercises();
  }, []);

  // Reset pagination when category or search changes
  useEffect(() => {
    setDisplayLimit(50);
  }, [selectedCategory, search]);

  const handleCreateCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    await createExercise(
      customName.trim(),
      customGroup,
      DEFAULT_USER_ID,
      {
        body_part: customGroup.toLowerCase(),
        target_muscle: customGroup.toLowerCase(),
        equipment: customEquipment,
        instructions: customInstructions.trim() || undefined,
      }
    );

    setCustomName('');
    setCustomInstructions('');
    setShowAddModal(false);
    loadExercises();
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return exercises.filter((ex) => {
      // Category match
      let matchesCategory = true;
      if (selectedCategory !== 'All') {
        const bp = (ex.body_part || '').toLowerCase();
        const mg = (ex.muscle_group || '').toLowerCase();
        const tm = (ex.target_muscle || '').toLowerCase();

        switch (selectedCategory) {
          case 'Chest':
            matchesCategory = bp === 'chest' || mg.includes('chest') || tm.includes('pectoral');
            break;
          case 'Back':
            matchesCategory =
              bp === 'back' ||
              mg.includes('back') ||
              mg.includes('lats') ||
              mg.includes('traps') ||
              tm.includes('lats') ||
              tm.includes('back');
            break;
          case 'Legs':
            matchesCategory =
              bp.includes('leg') ||
              mg.includes('quad') ||
              mg.includes('hamstring') ||
              mg.includes('calv') ||
              mg.includes('glute') ||
              tm.includes('quad') ||
              tm.includes('hamstring') ||
              tm.includes('glute');
            break;
          case 'Shoulders':
            matchesCategory =
              bp === 'shoulders' ||
              mg.includes('shoulder') ||
              mg.includes('deltoid') ||
              tm.includes('deltoid');
            break;
          case 'Arms':
            matchesCategory =
              bp.includes('arm') ||
              mg.includes('bicep') ||
              mg.includes('tricep') ||
              mg.includes('forearm') ||
              tm.includes('bicep') ||
              tm.includes('tricep');
            break;
          case 'Waist':
            matchesCategory =
              bp === 'waist' ||
              mg.includes('core') ||
              mg.includes('ab') ||
              mg.includes('oblique') ||
              tm.includes('abs');
            break;
          case 'Cardio':
            matchesCategory = bp === 'cardio' || mg.includes('cardio');
            break;
          default:
            matchesCategory = true;
        }
      }

      if (!matchesCategory) return false;

      // Query match
      if (!q) return true;
      const nameMatch = ex.name.toLowerCase().includes(q);
      const targetMatch = (ex.target_muscle || '').toLowerCase().includes(q);
      const equipMatch = (ex.equipment || '').toLowerCase().includes(q);
      const muscleMatch = (ex.muscle_group || '').toLowerCase().includes(q);
      const bodyPartMatch = (ex.body_part || '').toLowerCase().includes(q);

      return nameMatch || targetMatch || equipMatch || muscleMatch || bodyPartMatch;
    });
  }, [exercises, selectedCategory, search]);

  const displayedExercises = useMemo(() => {
    return filtered.slice(0, displayLimit);
  }, [filtered, displayLimit]);

  // Parse secondary muscles safely
  const parseSecondaryMuscles = (jsonStr?: string | null): string[] => {
    if (!jsonStr) return [];
    try {
      const parsed = JSON.parse(jsonStr);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '90px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <span className="font-label-micro text-label-micro uppercase text-secondary tracking-widest font-bold">
            GymVisual Catalog
          </span>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
            Exercises
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '2px' }}>
            {exercises.length > 0 ? exercises.length : '1,324'} animated movements with GIF demos
          </p>
        </div>

        <button
          className="btn btn-primary"
          style={{ minHeight: '48px', height: '48px', padding: '0 16px', fontSize: '0.88rem' }}
          onClick={() => setShowAddModal(true)}
          id="btn-new-custom-exercise"
        >
          <Plus size={18} /> Custom
        </button>
      </div>

      {/* Sticky Search & Filter Header */}
      <div
        style={{
          position: 'sticky',
          top: '64px',
          zIndex: 30,
          background: 'var(--bg-primary)',
          paddingTop: '4px',
          paddingBottom: '8px',
        }}
      >
        <div style={{ position: 'relative', marginBottom: '10px' }}>
          <input
            type="text"
            placeholder="Search exercises, target muscle, or equipment..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              height: '52px',
              borderRadius: '12px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              padding: '0 16px 0 48px',
              fontSize: '0.95rem',
              outline: 'none',
            }}
          />
          <Search size={20} color="var(--text-muted)" style={{ position: 'absolute', left: '16px', top: '16px' }} />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{
                position: 'absolute',
                right: '14px',
                top: '16px',
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Filter Chips */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px' }}>
          {FILTER_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                minHeight: '38px',
                padding: '0 14px',
                borderRadius: '9999px',
                border: '1px solid',
                borderColor: selectedCategory === cat ? 'var(--accent-blue)' : 'var(--border-subtle)',
                backgroundColor: selectedCategory === cat ? 'var(--accent-blue)' : 'var(--bg-surface)',
                color: selectedCategory === cat ? '#fff' : 'var(--text-secondary)',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Exercise Count indicator */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
          Showing {displayedExercises.length} of {filtered.length} exercises
        </span>
      </div>

      {/* Exercise List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {displayedExercises.map((ex) => (
          <div
            key={ex.id}
            onClick={() => setSelectedExercise(ex)}
            style={{
              minHeight: '68px',
              padding: '12px 14px',
              borderRadius: '14px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              transition: 'background 0.15s ease',
            }}
          >
            {/* Left: 44x44 Thumbnail + Details */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
              {/* 44x44 Thumbnail with fallback */}
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  minWidth: '44px',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  background: '#1d222e',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                {ex.thumbnail_url ? (
                  <img
                    src={ex.thumbnail_url}
                    alt={ex.name}
                    loading="lazy"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      // Fallback to icon on error
                      (e.currentTarget as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <Dumbbell size={20} color="var(--text-muted)" />
                )}
              </div>

              {/* Title & Metadata Badges */}
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: '0.96rem',
                    color: 'var(--text-primary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {ex.name}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                  {/* Target Muscle Badge */}
                  {ex.target_muscle && (
                    <span
                      style={{
                        fontSize: '0.7rem',
                        padding: '2px 7px',
                        borderRadius: '6px',
                        background: 'rgba(59, 130, 246, 0.15)',
                        color: '#60a5fa',
                        fontWeight: 700,
                        textTransform: 'capitalize',
                      }}
                    >
                      {ex.target_muscle}
                    </span>
                  )}

                  {/* Equipment Badge */}
                  {ex.equipment && (
                    <span
                      style={{
                        fontSize: '0.7rem',
                        padding: '2px 7px',
                        borderRadius: '6px',
                        background: 'var(--bg-surface-elevated)',
                        color: 'var(--text-muted)',
                        fontWeight: 600,
                        textTransform: 'capitalize',
                      }}
                    >
                      {ex.equipment}
                    </span>
                  )}

                  {/* Custom Indicator */}
                  {ex.is_custom === 1 && (
                    <span
                      style={{
                        fontSize: '0.68rem',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: 'rgba(16, 185, 129, 0.15)',
                        color: '#34d399',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                      }}
                    >
                      Custom
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Chevron */}
            <div style={{ paddingLeft: '8px', color: 'var(--text-muted)' }}>
              <ChevronRight size={18} />
            </div>
          </div>
        ))}

        {/* Load More Button */}
        {filtered.length > displayLimit && (
          <button
            onClick={() => setDisplayLimit((prev) => prev + 50)}
            style={{
              minHeight: '48px',
              marginTop: '8px',
              padding: '12px',
              borderRadius: '12px',
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <Sparkles size={16} color="var(--accent-blue)" />
            Load More Exercises ({filtered.length - displayLimit} remaining)
          </button>
        )}

        {filtered.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '60px 20px',
              background: 'var(--bg-surface)',
              borderRadius: '18px',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <Dumbbell size={44} color="var(--text-muted)" style={{ opacity: 0.3, margin: '0 auto 12px auto' }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>No Exercises Found</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '6px' }}>
              No matches found for "{search}". Create a custom movement above!
            </p>
          </div>
        )}
      </div>

      {/* Exercise Detail Modal (Looped GIF + Instructions) */}
      {selectedExercise && (
        <div className="modal-backdrop" onClick={() => setSelectedExercise(null)}>
          <div
            className="modal-sheet"
            onClick={(e) => e.stopPropagation()}
            style={{ maxHeight: '88vh', overflowY: 'auto' }}
          >
            <div className="sheet-handle" />

            {/* Header with Title & Close */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
              <div>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: '#60a5fa',
                  }}
                >
                  {selectedExercise.body_part || selectedExercise.muscle_group || 'Exercise Detail'}
                </span>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
                  {selectedExercise.name}
                </h2>
              </div>
              <button
                onClick={() => setSelectedExercise(null)}
                style={{
                  background: 'var(--bg-surface-elevated)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Looping GIF Video / Animation */}
            {selectedExercise.gif_url ? (
              <div
                style={{
                  width: '100%',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  background: '#12151c',
                  border: '1px solid var(--border-subtle)',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  minHeight: '220px',
                }}
              >
                <img
                  src={selectedExercise.gif_url}
                  alt={selectedExercise.name}
                  style={{ width: '100%', height: 'auto', maxHeight: '320px', objectFit: 'contain' }}
                  onError={(e) => {
                    // Fallback to thumbnail if GIF fails
                    if (selectedExercise.thumbnail_url) {
                      e.currentTarget.src = selectedExercise.thumbnail_url;
                    }
                  }}
                />
              </div>
            ) : selectedExercise.thumbnail_url ? (
              <div
                style={{
                  width: '100%',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  background: '#12151c',
                  border: '1px solid var(--border-subtle)',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '180px',
                }}
              >
                <img
                  src={selectedExercise.thumbnail_url}
                  alt={selectedExercise.name}
                  style={{ width: '100%', height: 'auto', maxHeight: '240px', objectFit: 'contain' }}
                />
              </div>
            ) : null}

            {/* Muscle & Equipment Badges */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '18px' }}>
              {selectedExercise.target_muscle && (
                <div
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    background: 'rgba(59, 130, 246, 0.15)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    color: '#93c5fd',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                  }}
                >
                  🎯 Target: <span style={{ textTransform: 'capitalize' }}>{selectedExercise.target_muscle}</span>
                </div>
              )}

              {selectedExercise.equipment && (
                <div
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-secondary)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                  }}
                >
                  🏋️ Equipment: <span style={{ textTransform: 'capitalize' }}>{selectedExercise.equipment}</span>
                </div>
              )}

              {parseSecondaryMuscles(selectedExercise.secondary_muscles).map((sec) => (
                <div
                  key={sec}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-muted)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    textTransform: 'capitalize',
                  }}
                >
                  + {sec}
                </div>
              ))}
            </div>

            {/* Instructions Section */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <Info size={16} color="var(--accent-blue)" />
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  How to Perform
                </h3>
              </div>

              {selectedExercise.instructions ? (
                <div
                  style={{
                    background: 'var(--bg-surface-elevated)',
                    padding: '14px 16px',
                    borderRadius: '12px',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.88rem',
                    lineHeight: '1.6',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {selectedExercise.instructions}
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                  No execution instructions available for this movement.
                </p>
              )}
            </div>

            {/* Close Button */}
            <button
              className="btn btn-secondary btn-lg"
              style={{ width: '100%', minHeight: '50px' }}
              onClick={() => setSelectedExercise(null)}
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Add Custom Exercise Modal */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '16px' }}>+ New Custom Exercise</h2>

            <form onSubmit={handleCreateCustom}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: 'var(--text-secondary)',
                  marginBottom: '6px',
                }}
              >
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
                  height: '52px',
                  borderRadius: '12px',
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  padding: '0 16px',
                  fontSize: '0.95rem',
                  marginBottom: '14px',
                  outline: 'none',
                }}
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      color: 'var(--text-secondary)',
                      marginBottom: '6px',
                    }}
                  >
                    TARGET GROUP
                  </label>
                  <select
                    value={customGroup}
                    onChange={(e) => setCustomGroup(e.target.value)}
                    style={{
                      width: '100%',
                      height: '52px',
                      borderRadius: '12px',
                      background: 'var(--bg-surface-elevated)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                      padding: '0 12px',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  >
                    {FILTER_CATEGORIES.filter((g) => g !== 'All').map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      color: 'var(--text-secondary)',
                      marginBottom: '6px',
                    }}
                  >
                    EQUIPMENT
                  </label>
                  <select
                    value={customEquipment}
                    onChange={(e) => setCustomEquipment(e.target.value)}
                    style={{
                      width: '100%',
                      height: '52px',
                      borderRadius: '12px',
                      background: 'var(--bg-surface-elevated)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                      padding: '0 12px',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  >
                    <option value="barbell">Barbell</option>
                    <option value="dumbbell">Dumbbell</option>
                    <option value="cable">Cable</option>
                    <option value="machine">Machine</option>
                    <option value="body weight">Body Weight</option>
                    <option value="kettlebell">Kettlebell</option>
                    <option value="band">Resistance Band</option>
                  </select>
                </div>
              </div>

              <label
                style={{
                  display: 'block',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: 'var(--text-secondary)',
                  marginBottom: '6px',
                }}
              >
                OPTIONAL NOTES / FORM CUES
              </label>
              <textarea
                placeholder="Keep elbows tucked, pause at bottom..."
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                rows={3}
                style={{
                  width: '100%',
                  borderRadius: '12px',
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  padding: '12px 16px',
                  fontSize: '0.9rem',
                  marginBottom: '20px',
                  outline: 'none',
                  resize: 'none',
                }}
              />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button type="submit" disabled={!customName.trim()} className="btn btn-primary btn-lg">
                  <Check size={20} /> Save Custom Exercise
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
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
