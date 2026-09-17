import React, { useState, useEffect } from 'react';
import { Trash2, Plus, Search, X, Dumbbell, GripVertical } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { powersync, createSnippet, updateSnippet, getSnippetById, getSnippetExercises } from '../db/powersync';
import type { ExerciseRecord } from '../db/schema';

interface SnippetBuilderProps {
  snippetId?: string; // Present if editing existing snippet
  onSave: () => void;
  onCancel: () => void;
}

const MUSCLE_GROUPS = ['All', 'Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core'];

interface SelectedExercise extends ExerciseRecord {
  _uniqueId: string;
}

const SortableExerciseRow = ({ 
  ex, 
  index, 
  onRemove 
}: { 
  ex: SelectedExercise; 
  index: number; 
  onRemove: () => void 
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: ex._uniqueId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1 : 0,
    position: 'relative' as const,
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '16px',
        padding: '8px 12px 8px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: '68px',
      }}
    >
      {/* Drag Handle Area */}
      <div 
        {...attributes} 
        {...listeners} 
        style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0, cursor: 'grab', touchAction: 'none' }}
      >
        <GripVertical size={20} color="var(--text-muted)" />
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.85rem',
            fontWeight: 800,
            color: 'var(--accent-green)',
            background: 'var(--bg-surface-elevated)',
            width: '28px',
            height: '28px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {index + 1}
        </span>
        <div style={{ minWidth: 0, paddingRight: '8px' }}>
          <div
            style={{
              fontSize: '1.02rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {ex.name}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            {ex.muscle_group}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
        {/* Remove Exercise Button */}
        <button
          type="button"
          onClick={onRemove}
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '12px',
            border: 'none',
            backgroundColor: 'var(--bg-surface-elevated)',
            color: 'var(--accent-rose)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
          title="Remove exercise"
        >
          <Trash2 size={20} />
        </button>
      </div>
    </div>
  );
};

export const SnippetBuilderView: React.FC<SnippetBuilderProps> = ({
  snippetId,
  onSave,
  onCancel,
}) => {
  const [snippetName, setSnippetName] = useState('');
  const [selectedExercises, setSelectedExercises] = useState<SelectedExercise[]>([]);
  const [allCatalogExercises, setAllCatalogExercises] = useState<ExerciseRecord[]>([]);
  const [showPickerModal, setShowPickerModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('All');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load existing snippet data (if editing) & full exercise catalog
  useEffect(() => {
    const loadInitial = async () => {
      try {
        setLoading(true);
        // Load all catalog exercises
        const catalog = await powersync.getAll<ExerciseRecord>(
          'SELECT * FROM exercises ORDER BY muscle_group ASC, name ASC'
        );
        setAllCatalogExercises(catalog);

        if (snippetId) {
          // Edit mode: fetch snippet details and associated ordered exercises
          const existingSnippet = await getSnippetById(snippetId);
          if (existingSnippet) {
            setSnippetName(existingSnippet.name);
          }
          const assignedExercises = await getSnippetExercises(snippetId);
          setSelectedExercises(assignedExercises.map(e => ({ ...e, _uniqueId: Math.random().toString(36).substring(2, 9) })));
        }
      } catch (err) {
        console.error('Error loading snippet builder data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadInitial();
  }, [snippetId]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSelectedExercises((items) => {
        const oldIndex = items.findIndex((item) => item._uniqueId === active.id);
        const newIndex = items.findIndex((item) => item._uniqueId === over.id);
        if (window.navigator?.vibrate) window.navigator.vibrate(25);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleRemoveExercise = (index: number) => {
    if (window.navigator?.vibrate) window.navigator.vibrate(30);
    setSelectedExercises((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddExerciseFromPicker = (ex: ExerciseRecord) => {
    if (window.navigator?.vibrate) window.navigator.vibrate(35);
    setSelectedExercises((prev) => [...prev, { ...ex, _uniqueId: Math.random().toString(36).substring(2, 9) }]);
    setShowPickerModal(false);
    setSearchQuery('');
  };

  const handleSave = async () => {
    const trimmed = snippetName.trim();
    if (!trimmed) {
      alert('Please provide a name for this snippet.');
      return;
    }

    try {
      setSaving(true);
      const exerciseIds = selectedExercises.map((e) => e.id);

      if (snippetId) {
        await updateSnippet(snippetId, trimmed, exerciseIds);
      } else {
        await createSnippet(trimmed, exerciseIds);
      }

      onSave();
    } catch (err) {
      console.error('Failed to save workout snippet:', err);
      alert('Failed to save snippet. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Filter exercises in picker modal
  const filteredCatalog = allCatalogExercises.filter((ex) => {
    const q = searchQuery.toLowerCase();
    const matchesGroup =
      selectedGroup === 'All' ||
      ex.muscle_group?.toLowerCase() === selectedGroup.toLowerCase() ||
      ex.body_part?.toLowerCase() === selectedGroup.toLowerCase();

    const matchesSearch =
      !q ||
      ex.name.toLowerCase().includes(q) ||
      (ex.muscle_group && ex.muscle_group.toLowerCase().includes(q)) ||
      (ex.target_muscle && ex.target_muscle.toLowerCase().includes(q)) ||
      (ex.equipment && ex.equipment.toLowerCase().includes(q));

    return matchesGroup && matchesSearch;
  });

  // Group by muscle group
  const groupedCatalog: Record<string, ExerciseRecord[]> = {};
  filteredCatalog.forEach((ex) => {
    const groupName = ex.muscle_group || ex.body_part || 'General';
    if (!groupedCatalog[groupName]) {
      groupedCatalog[groupName] = [];
    }
    groupedCatalog[groupName].push(ex);
  });

  if (loading) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Loading snippet...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '90px' }}>
      {/* Sticky Header Bar */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          backgroundColor: 'rgba(12, 14, 18, 0.95)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--border-subtle)',
          margin: '-16px -16px 0 -16px',
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: '64px',
        }}
      >
        <button
          type="button"
          onClick={onCancel}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: 'pointer',
            minHeight: '56px',
            padding: '0 12px',
            display: 'flex',
            alignItems: 'center',
          }}
          id="btn-snippet-cancel"
        >
          Cancel
        </button>

        <span
          style={{
            fontSize: '1.1rem',
            fontWeight: 600,
            letterSpacing: '-0.02em',
            color: 'var(--text-primary)',
          }}
        >
          {snippetId ? 'Edit Routine' : 'New Routine'}
        </span>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !snippetName.trim()}
          style={{
            background: 'none',
            border: 'none',
            color: saving || !snippetName.trim() ? 'var(--text-muted)' : 'var(--accent-green)',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: saving || !snippetName.trim() ? 'not-allowed' : 'pointer',
            minHeight: '56px',
            padding: '0 12px',
            display: 'flex',
            alignItems: 'center',
            letterSpacing: '0.02em',
          }}
          id="btn-snippet-save"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      {/* Large Borderless Snippet Name Input */}
      <div style={{ paddingTop: '8px' }}>
        <label
          style={{
            display: 'block',
            fontSize: '0.8rem',
            fontWeight: 500,
            color: 'var(--text-secondary)',
            marginBottom: '6px',
          }}
        >
          Routine Name
        </label>
        <input
          type="text"
          autoFocus
          placeholder="e.g. Pull Day, Leg Day..."
          value={snippetName}
          onChange={(e) => setSnippetName(e.target.value)}
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            borderBottom: '2px solid var(--border-subtle)',
            borderRadius: 0,
            padding: '10px 0',
            color: '#ffffff',
            fontFamily: 'var(--font-sans)',
            fontSize: '1.6rem',
            fontWeight: 700,
            outline: 'none',
            letterSpacing: '-0.02em',
          }}
          id="input-snippet-name"
        />
      </div>

      {/* Ordered Exercises Section */}
      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '0.9rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
              }}
            >
              Exercises in Routine
            </span>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                background: 'var(--bg-surface-elevated)',
                color: 'var(--text-secondary)',
                padding: '2px 8px',
                borderRadius: '10px',
              }}
            >
              {selectedExercises.length}
            </span>
          </div>

          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Drag handle to reorder
          </span>
        </div>

        {/* Selected Exercises Rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={selectedExercises.map(e => e._uniqueId)} strategy={verticalListSortingStrategy}>
              {selectedExercises.map((ex, index) => (
                <SortableExerciseRow
                  key={ex._uniqueId}
                  ex={ex}
                  index={index}
                  onRemove={() => handleRemoveExercise(index)}
                />
              ))}
            </SortableContext>
          </DndContext>

          {selectedExercises.length === 0 && (
            <div
              style={{
                textAlign: 'center',
                padding: '40px 20px',
                backgroundColor: 'var(--bg-surface)',
                border: '1px dashed var(--border-subtle)',
                borderRadius: '16px',
                color: 'var(--text-muted)',
              }}
            >
              <Dumbbell size={36} style={{ opacity: 0.3, margin: '0 auto 8px auto' }} />
              <p style={{ fontWeight: 600, fontSize: '0.95rem' }}>No exercises in this routine yet.</p>
              <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>
                Tap "+ Add Exercise" below to build your routine.
              </p>
            </div>
          )}
        </div>

        {/* Massive 56px "+ Add Exercise" Button */}
        <button
          type="button"
          onClick={() => setShowPickerModal(true)}
          className="btn btn-secondary btn-lg"
          style={{
            minHeight: '52px',
            height: '52px',
            marginTop: '16px',
            border: 'none',
            color: 'var(--accent-blue)',
            backgroundColor: 'var(--bg-surface-elevated)',
            fontSize: '1rem',
            fontWeight: 600,
            gap: '8px',
            borderRadius: '12px',
          }}
          id="btn-snippet-add-exercise"
        >
          <Plus size={22} strokeWidth={3} />
          <span>+ Add Exercise</span>
        </button>
      </div>

      {/* Slide-Up Exercise Picker Modal (Exact Exercises.tsx Catalog Visuals) */}
      {showPickerModal && (
        <div className="modal-backdrop" onClick={() => setShowPickerModal(false)}>
          <div
            className="modal-sheet"
            onClick={(e) => e.stopPropagation()}
            style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
          >
            <div className="sheet-handle" />

            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
              }}
            >
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Add Exercise
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Tap to add to your workout routine
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowPickerModal(false)}
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-surface-elevated)',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Sticky Search & Filter Header inside Modal */}
            <div style={{ marginBottom: '14px' }}>
              <div style={{ position: 'relative', marginBottom: '10px' }}>
                <input
                  type="text"
                  placeholder="Search exercises or muscle..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
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
                <Search
                  size={20}
                  color="var(--text-muted)"
                  style={{ position: 'absolute', left: '16px', top: '16px' }}
                />
              </div>

              {/* Muscle Group Filter Chips */}
              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
                {MUSCLE_GROUPS.map((group) => (
                  <button
                    key={group}
                    type="button"
                    onClick={() => setSelectedGroup(group)}
                    style={{
                      minHeight: '36px',
                      padding: '0 14px',
                      borderRadius: '9999px',
                      border: '1px solid',
                      borderColor: selectedGroup === group ? 'var(--accent-blue)' : 'var(--border-subtle)',
                      backgroundColor: selectedGroup === group ? 'var(--accent-blue)' : 'var(--bg-surface-elevated)',
                      color: selectedGroup === group ? '#fff' : 'var(--text-secondary)',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {group}
                  </button>
                ))}
              </div>
            </div>

            {/* Grouped Exercise List */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                paddingRight: '4px',
              }}
            >
              {Object.keys(groupedCatalog).map((muscle) => (
                <div key={muscle}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '8px',
                    }}
                  >
                    <div style={{ width: '4px', height: '14px', background: 'var(--text-primary)', borderRadius: '2px' }} />
                    <span
                      style={{
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        letterSpacing: '0.02em',
                      }}
                    >
                      {muscle}
                    </span>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: 'var(--text-secondary)',
                        background: 'var(--bg-surface-elevated)',
                        padding: '1px 8px',
                        borderRadius: '10px',
                      }}
                    >
                      {groupedCatalog[muscle].length}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {groupedCatalog[muscle].slice(0, 40).map((ex) => (
                      <div
                        key={ex.id}
                        onClick={() => handleAddExerciseFromPicker(ex)}
                        style={{
                          minHeight: '56px',
                          padding: '10px 14px',
                          borderRadius: '12px',
                          backgroundColor: 'var(--bg-surface-elevated)',
                          border: '1px solid var(--border-subtle)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          cursor: 'pointer',
                          transition: 'background-color 0.15s ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                          <div
                            style={{
                              width: '38px',
                              height: '38px',
                              minWidth: '38px',
                              borderRadius: '8px',
                              overflow: 'hidden',
                              background: '#1d222e',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {ex.thumbnail_url ? (
                              <img
                                src={ex.thumbnail_url}
                                alt={ex.name}
                                loading="lazy"
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={(e) => {
                                  (e.currentTarget as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <Dumbbell size={18} color="var(--text-muted)" />
                            )}
                          </div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: '0.94rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {ex.name}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                              {ex.target_muscle && (
                                <span style={{ fontSize: '0.68rem', color: '#60a5fa', fontWeight: 600, textTransform: 'capitalize' }}>
                                  {ex.target_muscle}
                                </span>
                              )}
                              {ex.equipment && (
                                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                                  • {ex.equipment}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            backgroundColor: 'rgba(16, 185, 129, 0.15)',
                            color: 'var(--accent-green)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <Plus size={18} strokeWidth={3} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {filteredCatalog.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                  No exercises found matching "{searchQuery}".
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SnippetBuilderView;
