import React, { useState, useEffect } from 'react';
import { Check, Plus, Trash2, Clock, Award, Dumbbell } from 'lucide-react';
import { powersync, logSet, deleteSet, finishWorkout, cancelWorkout } from '../db/powersync';
import type { SetType, ExerciseRecord } from '../db/schema';


interface ActiveWorkoutProps {
  workoutId: string;
  snippetId?: string;
  snippetName?: string;
  onFinish: () => void;
  onCancel: () => void;
}

interface ActiveExerciseItem {
  exercise: ExerciseRecord;
  sets: {
    id?: string; // Generated client UUID once saved
    setNumber: number;
    weight: number;
    reps: number;
    setType: SetType;
    isLogged: boolean;
  }[];
}

export const ActiveWorkout: React.FC<ActiveWorkoutProps> = ({
  workoutId,
  snippetId,
  snippetName = 'Active Workout',
  onFinish,
  onCancel,
}) => {
  const [exercises, setExercises] = useState<ActiveExerciseItem[]>([]);
  const [allCatalogExercises, setAllCatalogExercises] = useState<ExerciseRecord[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showFinishSummary, setShowFinishSummary] = useState(false);
  const [summaryStats, setSummaryStats] = useState({ volume: 0, sets: 0, duration: '' });

  // Elapsed workout timer
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Load catalog exercises and snippet exercises from local SQLite
  useEffect(() => {
    const loadExercises = async () => {
      try {
        const rows = await powersync.getAll<ExerciseRecord>('SELECT * FROM exercises ORDER BY name ASC');
        setAllCatalogExercises(rows);

        if (snippetId) {
          const snippetExercises = await powersync.getAll<ExerciseRecord>(
            `SELECT e.* FROM snippet_exercises se
             JOIN exercises e ON se.exercise_id = e.id
             WHERE se.snippet_id = ?
             ORDER BY se.sort_order ASC`,
            [snippetId]
          );

          if (snippetExercises.length > 0) {
            const defaults = snippetExercises.map((ex) => ({
              exercise: ex,
              sets: [
                { setNumber: 1, weight: 0, reps: 0, setType: 'Normal' as SetType, isLogged: false },
              ],
            }));
            setExercises(defaults);
            return;
          }
        }


      } catch (err) {
        console.error('Error loading exercises:', err);
      }
    };
    loadExercises();
  }, [snippetId]);

  const formatElapsed = (sec: number) => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (hrs > 0) {
      return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  // Add a new set to an exercise
  const handleAddSet = (exerciseIndex: number) => {
    setExercises((prev) => {
      const updated = [...prev];
      const target = updated[exerciseIndex];
      const prevSet = target.sets[target.sets.length - 1];
      const nextNumber = target.sets.length + 1;
      target.sets.push({
        setNumber: nextNumber,
        weight: prevSet ? prevSet.weight : 50,
        reps: prevSet ? prevSet.reps : 10,
        setType: 'Normal',
        isLogged: false,
      });
      return updated;
    });
  };

  // Cycle set type: Normal -> Warmup -> Drop -> Failure
  const handleCycleSetType = (exerciseIndex: number, setIndex: number) => {
    const types: SetType[] = ['Normal', 'Warmup', 'Drop', 'Failure'];
    setExercises((prev) => {
      const updated = [...prev];
      const current = updated[exerciseIndex].sets[setIndex].setType;
      const nextType = types[(types.indexOf(current) + 1) % types.length];
      updated[exerciseIndex].sets[setIndex].setType = nextType;
      return updated;
    });
  };

  // 1-Tap Log Set (Frictionless Core Loop)
  const handleTapLogSet = async (exerciseIndex: number, setIndex: number) => {
    const targetExercise = exercises[exerciseIndex];
    const targetSet = targetExercise.sets[setIndex];

    // Haptic feedback
    if (window.navigator?.vibrate) {
      window.navigator.vibrate(40);
    }

    if (!targetSet.isLogged) {
      // Write to SQLite locally
      const setId = await logSet({
        workoutId,
        exerciseId: targetExercise.exercise.id,
        weight: targetSet.weight,
        reps: targetSet.reps,
        setType: targetSet.setType,
      });

      setExercises((prev) => {
        const updated = [...prev];
        updated[exerciseIndex].sets[setIndex].isLogged = true;
        updated[exerciseIndex].sets[setIndex].id = setId;
        return updated;
      });
    } else if (targetSet.id) {
      // Toggle off / delete from SQLite
      await deleteSet(targetSet.id);
      setExercises((prev) => {
        const updated = [...prev];
        updated[exerciseIndex].sets[setIndex].isLogged = false;
        updated[exerciseIndex].sets[setIndex].id = undefined;
        return updated;
      });
    }
  };

  const handleUpdateWeight = (exerciseIndex: number, setIndex: number, delta: number) => {
    setExercises((prev) => {
      const updated = [...prev];
      const s = updated[exerciseIndex].sets[setIndex];
      s.weight = Math.max(0, Math.round((s.weight + delta) * 10) / 10);
      return updated;
    });
  };

  const handleUpdateReps = (exerciseIndex: number, setIndex: number, delta: number) => {
    setExercises((prev) => {
      const updated = [...prev];
      const s = updated[exerciseIndex].sets[setIndex];
      s.reps = Math.max(0, s.reps + delta);
      return updated;
    });
  };

  const handleAddExerciseToWorkout = (ex: ExerciseRecord) => {
    setExercises((prev) => [
      ...prev,
      {
        exercise: ex,
        sets: [
          { setNumber: 1, weight: 0, reps: 0, setType: 'Normal', isLogged: false },
        ],
      },
    ]);
    setShowAddModal(false);
    setSearchTerm('');
  };

  const handleFinishWorkout = async () => {
    // Calculate total volume and sets
    let totalVolume = 0;
    let loggedSetsCount = 0;
    for (const ex of exercises) {
      for (const s of ex.sets) {
        if (s.isLogged) {
          totalVolume += s.weight * s.reps;
          loggedSetsCount += 1;
        }
      }
    }

    await finishWorkout(workoutId);
    setSummaryStats({
      volume: Math.round(totalVolume),
      sets: loggedSetsCount,
      duration: formatElapsed(elapsedSeconds),
    });
    setShowFinishSummary(true);
  };

  const filteredExercises = allCatalogExercises
    .filter((ex) => {
      const q = searchTerm.toLowerCase();
      return (
        ex.name.toLowerCase().includes(q) ||
        (ex.muscle_group && ex.muscle_group.toLowerCase().includes(q)) ||
        (ex.target_muscle && ex.target_muscle.toLowerCase().includes(q)) ||
        (ex.equipment && ex.equipment.toLowerCase().includes(q))
      );
    })
    .slice(0, 60);

  return (
    <div style={{ paddingBottom: '80px' }}>
      {/* Active Workout Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-green)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            ● Live Session
          </span>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>{snippetName}</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-surface-elevated)', padding: '8px 14px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
          <Clock size={16} color="#60a5fa" />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.05rem', fontWeight: 700, color: '#60a5fa' }}>
            {formatElapsed(elapsedSeconds)}
          </span>
        </div>
      </div>

      {/* Exercises List */}
      {exercises.map((item, exIdx) => (
        <div key={item.exercise.id + exIdx} className="exercise-card">
          <div className="exercise-header">
            <div>
              <h3 className="exercise-title">{item.exercise.name}</h3>
              <span className="exercise-tag">{item.exercise.muscle_group}</span>
            </div>
            <button
              onClick={() => {
                setExercises((prev) => prev.filter((_, i) => i !== exIdx));
              }}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
              title="Remove exercise"
            >
              <Trash2 size={16} />
            </button>
          </div>

          {/* Table Header */}
          <div className="set-table-header">
            <span>SET</span>
            <span>KG</span>
            <span>REPS</span>
            <span>LOG</span>
          </div>

          {/* Set Rows */}
          {item.sets.map((s, sIdx) => (
            <div key={sIdx}>
              <div className="set-row">
                {/* Set Type Cycler */}
                <button
                  type="button"
                  className={`set-badge-btn ${
                    s.setType === 'Warmup' ? 'warmup' : s.setType === 'Drop' ? 'drop' : s.setType === 'Failure' ? 'failure' : ''
                  }`}
                  onClick={() => handleCycleSetType(exIdx, sIdx)}
                  title="Click to cycle: Normal / Warmup / Drop / Failure"
                >
                  {s.setType === 'Normal' ? s.setNumber : s.setType[0]}
                </button>

                {/* Weight Input with Touch Steppers */}
                <div className="num-input-wrap">
                  <input
                    type="number"
                    step="0.5"
                    className="num-input"
                    value={s.weight}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setExercises((prev) => {
                        const upd = [...prev];
                        upd[exIdx].sets[sIdx].weight = val;
                        return upd;
                      });
                    }}
                  />
                </div>

                {/* Reps Input */}
                <div className="num-input-wrap">
                  <input
                    type="number"
                    className="num-input"
                    value={s.reps}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setExercises((prev) => {
                        const upd = [...prev];
                        upd[exIdx].sets[sIdx].reps = val;
                        return upd;
                      });
                    }}
                  />
                </div>

                {/* 1-Tap Log Set Completion (Oversized 64px Target) */}
                <button
                  type="button"
                  className={`check-target-btn ${s.isLogged ? 'logged' : ''}`}
                  onClick={() => handleTapLogSet(exIdx, sIdx)}
                  title="1-Tap to log set"
                >
                  <Check size={28} strokeWidth={s.isLogged ? 3.5 : 2} />
                </button>
              </div>

              {/* Quick Stepper adjustment for active row */}
              {!s.isLogged && (
                <div className="stepper-row">
                  <button type="button" className="stepper-chip" onClick={() => handleUpdateWeight(exIdx, sIdx, -2.5)}>-2.5kg</button>
                  <button type="button" className="stepper-chip" onClick={() => handleUpdateWeight(exIdx, sIdx, 2.5)}>+2.5kg</button>
                  <button type="button" className="stepper-chip" onClick={() => handleUpdateWeight(exIdx, sIdx, 5)}>+5kg</button>
                  <button type="button" className="stepper-chip" onClick={() => handleUpdateReps(exIdx, sIdx, 1)}>+1 rep</button>
                </div>
              )}
            </div>
          ))}

          {/* Add Set Button */}
          <button
            type="button"
            className="btn btn-secondary"
            style={{ width: '100%', minHeight: '48px', height: '48px', marginTop: '6px' }}
            onClick={() => handleAddSet(exIdx)}
          >
            <Plus size={18} /> Add Set
          </button>
        </div>
      ))}

      {/* Action Buttons: Add Exercise, Finish, Cancel */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
        <button
          type="button"
          className="btn btn-secondary btn-lg"
          onClick={() => setShowAddModal(true)}
        >
          <Plus size={20} /> Add Exercise
        </button>

        <button
          type="button"
          className="btn btn-primary btn-lg"
          onClick={handleFinishWorkout}
        >
          <Check size={22} /> Finish Workout
        </button>

        <button
          type="button"
          className="btn btn-danger"
          style={{ minHeight: '48px' }}
          onClick={async () => {
            if (confirm('Cancel this workout? Any unsaved progress will be discarded.')) {
              await cancelWorkout(workoutId);
              onCancel();
            }
          }}
        >
          Discard Workout
        </button>
      </div>



      {/* Add Exercise Modal */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '14px' }}>Select Exercise</h2>

            <input
              type="text"
              placeholder="Search exercise or muscle..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                height: '52px',
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '50vh', overflowY: 'auto' }}>
              {filteredExercises.map((ex) => (
                <div
                  key={ex.id}
                  onClick={() => handleAddExerciseToWorkout(ex)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '12px',
                    backgroundColor: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
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
                      <div style={{ fontWeight: 700, fontSize: '0.92rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
                  <Plus size={18} color="#10b981" />
                </div>
              ))}
            </div>

            <button
              type="button"
              className="btn btn-secondary"
              style={{ width: '100%', marginTop: '16px' }}
              onClick={() => setShowAddModal(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Finish Summary Celebration Modal */}
      {showFinishSummary && (
        <div className="modal-backdrop">
          <div className="modal-sheet" style={{ textAlign: 'center' }}>
            <div className="sheet-handle" />
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(135deg, #10b981, #059669)', margin: '0 auto 16px auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Award size={36} color="#fff" />
            </div>

            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '6px' }}>Workout Completed!</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px' }}>
              Saved to local SQLite database and queued for Supabase.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '28px' }}>
              <div style={{ background: 'var(--bg-surface-elevated)', padding: '14px', borderRadius: '12px' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>DURATION</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.2rem', fontWeight: 800, marginTop: '4px' }}>
                  {summaryStats.duration}
                </div>
              </div>

              <div style={{ background: 'var(--bg-surface-elevated)', padding: '14px', borderRadius: '12px' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>VOLUME</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.2rem', fontWeight: 800, marginTop: '4px', color: '#10b981' }}>
                  {summaryStats.volume} kg
                </div>
              </div>

              <div style={{ background: 'var(--bg-surface-elevated)', padding: '14px', borderRadius: '12px' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>SETS</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.2rem', fontWeight: 800, marginTop: '4px', color: '#60a5fa' }}>
                  {summaryStats.sets}
                </div>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-primary btn-lg"
              onClick={onFinish}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
