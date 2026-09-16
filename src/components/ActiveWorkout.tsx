import React, { useState, useEffect } from 'react';
import { Check, Plus, Trash2, Clock, Award, Dumbbell, X } from 'lucide-react';
import { powersync, logSet, deleteSet, finishWorkout, cancelWorkout } from '../db/powersync';
import type { SetType, ExerciseRecord } from '../db/schema';
import { useQuery } from '@powersync/react';
import { useAuth } from '../context/AuthContext';
import { v4 as uuidv4 } from 'uuid';


interface ActiveWorkoutProps {
  workoutId: string;
  snippetId?: string;
  snippetName?: string;
  partnerId?: string;
  onFinish: () => void;
  onCancel: () => void;
}

interface ActiveExerciseItem {
  exercise: ExerciseRecord;
  sets: {
    id?: string; // Generated client UUID once saved
    setNumber: number;
    ownerId: string;
    weight: number;
    reps: number;
    setType: SetType;
    isLogged: boolean;
  }[];
}

const UserAvatar = ({ profile, color, fallbackLetter }: { profile: any, color: string, fallbackLetter: string }) => {
  if (profile?.avatar_url) {
    return (
      <img 
        src={profile.avatar_url} 
        alt="avatar" 
        style={{ width: 24, height: 24, minWidth: 24, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${color}` }} 
      />
    );
  }
  return (
    <div style={{ width: 24, height: 24, minWidth: 24, borderRadius: '50%', backgroundColor: color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '10px', fontWeight: 'bold' }}>
      {fallbackLetter}
    </div>
  );
};

export const ActiveWorkout: React.FC<ActiveWorkoutProps> = ({
  workoutId,
  snippetId,
  snippetName = 'Active Workout',
  partnerId,
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

  const { user } = useAuth();

  const { data: myProfileData } = useQuery(
    `SELECT username, avatar_url FROM profiles WHERE id = ?`,
    [user?.id || '']
  );
  const myProfile = myProfileData?.[0];

  const { data: partnerProfileData } = useQuery(
    `SELECT username, avatar_url FROM profiles WHERE id = ?`,
    [partnerId || '']
  );
  const partnerProfile = partnerProfileData?.[0];

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
            const defaults = snippetExercises.map((ex) => {
              const initialSets: { setNumber: number, ownerId: string, weight: number, reps: number, setType: SetType, isLogged: boolean }[] = [];
              if (user) {
                initialSets.push({ setNumber: 1, ownerId: user.id, weight: 0, reps: 0, setType: 'Normal' as SetType, isLogged: false });
              }
              if (partnerId) {
                initialSets.push({ setNumber: 1, ownerId: partnerId, weight: 0, reps: 0, setType: 'Normal' as SetType, isLogged: false });
              }
              return {
                exercise: ex,
                sets: initialSets,
              };
            });
            setExercises(defaults);
            return;
          }
        }

      } catch (err) {
        console.error('Error loading exercises:', err);
      }
    };
    loadExercises();
  }, [snippetId, user, partnerId]);

  const formatElapsed = (sec: number) => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (hrs > 0) {
      return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleAddSet = (exerciseIndex: number) => {
    setExercises((prev) => {
      const updated = [...prev];
      updated[exerciseIndex] = { ...updated[exerciseIndex], sets: [...updated[exerciseIndex].sets] };
      const target = updated[exerciseIndex];
      const highestSetNumber = target.sets.reduce((max, s) => Math.max(max, s.setNumber), 0);
      const nextNumber = highestSetNumber + 1;
      
      const myPrevSets = target.sets.filter(s => s.ownerId === user?.id);
      const partnerPrevSets = target.sets.filter(s => s.ownerId === partnerId);
      
      const myPrev = myPrevSets[myPrevSets.length - 1];
      const partnerPrev = partnerPrevSets[partnerPrevSets.length - 1];

      if (user) {
        target.sets.push({
          setNumber: nextNumber,
          ownerId: user.id,
          weight: myPrev ? myPrev.weight : 50,
          reps: myPrev ? myPrev.reps : 10,
          setType: 'Normal',
          isLogged: false,
        });
      }
      
      if (partnerId) {
        target.sets.push({
          setNumber: nextNumber,
          ownerId: partnerId,
          weight: partnerPrev ? partnerPrev.weight : 50,
          reps: partnerPrev ? partnerPrev.reps : 10,
          setType: 'Normal',
          isLogged: false,
        });
      }

      return updated;
    });
  };

  const handleRestoreSet = (exerciseIndex: number, setNumber: number, targetUserId: string) => {
    setExercises((prev) => {
      const updated = [...prev];
      updated[exerciseIndex] = { ...updated[exerciseIndex], sets: [...updated[exerciseIndex].sets] };
      const target = updated[exerciseIndex];
      
      // Get the user's latest set BEFORE this setNumber to inherit weight/reps
      const userPrevSets = target.sets.filter(s => s.ownerId === targetUserId && s.setNumber < setNumber);
      const prevSet = userPrevSets[userPrevSets.length - 1];

      target.sets.push({
        setNumber: setNumber,
        ownerId: targetUserId,
        weight: prevSet ? prevSet.weight : 50,
        reps: prevSet ? prevSet.reps : 10,
        setType: 'Normal',
        isLogged: false,
      });

      return updated;
    });
  };

  const handleCycleSetType = (exerciseIndex: number, setIndex: number) => {
    const types: SetType[] = ['Normal', 'Warmup', 'Drop', 'Failure'];
    setExercises((prev) => {
      const updated = [...prev];
      updated[exerciseIndex] = { ...updated[exerciseIndex], sets: [...updated[exerciseIndex].sets] };
      updated[exerciseIndex].sets[setIndex] = { ...updated[exerciseIndex].sets[setIndex] };
      
      const current = updated[exerciseIndex].sets[setIndex].setType;
      const nextType = types[(types.indexOf(current) + 1) % types.length];
      updated[exerciseIndex].sets[setIndex].setType = nextType;
      return updated;
    });
  };

  const handleTapLogSet = async (exerciseIndex: number, setIndex: number) => {
    const targetExercise = exercises[exerciseIndex];
    const targetSet = targetExercise.sets[setIndex];

    if (window.navigator?.vibrate) {
      window.navigator.vibrate(40);
    }

    if (!targetSet.isLogged) {
      const setId = await logSet({
        workoutId,
        exerciseId: targetExercise.exercise.id,
        weight: targetSet.weight,
        reps: targetSet.reps,
        setType: targetSet.setType,
        userId: targetSet.ownerId, // Specify who did it
      });

      setExercises((prev) => {
        const updated = [...prev];
        updated[exerciseIndex] = { ...updated[exerciseIndex], sets: [...updated[exerciseIndex].sets] };
        updated[exerciseIndex].sets[setIndex] = { ...updated[exerciseIndex].sets[setIndex] };
        
        updated[exerciseIndex].sets[setIndex].isLogged = true;
        updated[exerciseIndex].sets[setIndex].id = setId;
        return updated;
      });
    } else if (targetSet.id) {
      await deleteSet(targetSet.id);
      setExercises((prev) => {
        const updated = [...prev];
        updated[exerciseIndex] = { ...updated[exerciseIndex], sets: [...updated[exerciseIndex].sets] };
        updated[exerciseIndex].sets[setIndex] = { ...updated[exerciseIndex].sets[setIndex] };
        
        updated[exerciseIndex].sets[setIndex].isLogged = false;
        updated[exerciseIndex].sets[setIndex].id = undefined;
        return updated;
      });
    }
  };

  const handleDeleteSetRow = async (exerciseIndex: number, setIndex: number) => {
    const s = exercises[exerciseIndex].sets[setIndex];
    if (s.isLogged && s.id) {
       await deleteSet(s.id);
    }
    setExercises((prev) => {
      const upd = [...prev];
      upd[exerciseIndex] = { ...upd[exerciseIndex], sets: [...upd[exerciseIndex].sets] };
      upd[exerciseIndex].sets.splice(setIndex, 1);
      return upd;
    });
  };

  const handleUpdateWeight = (exerciseIndex: number, setIndex: number, delta: number) => {
    setExercises((prev) => {
      const updated = [...prev];
      updated[exerciseIndex] = { ...updated[exerciseIndex], sets: [...updated[exerciseIndex].sets] };
      updated[exerciseIndex].sets[setIndex] = { ...updated[exerciseIndex].sets[setIndex] };
      
      const s = updated[exerciseIndex].sets[setIndex];
      s.weight = Math.max(0, Math.round((s.weight + delta) * 10) / 10);
      return updated;
    });
  };

  const handleUpdateReps = (exerciseIndex: number, setIndex: number, delta: number) => {
    setExercises((prev) => {
      const updated = [...prev];
      updated[exerciseIndex] = { ...updated[exerciseIndex], sets: [...updated[exerciseIndex].sets] };
      updated[exerciseIndex].sets[setIndex] = { ...updated[exerciseIndex].sets[setIndex] };
      
      const s = updated[exerciseIndex].sets[setIndex];
      s.reps = Math.max(0, s.reps + delta);
      return updated;
    });
  };

  const handleAddExerciseToWorkout = (ex: ExerciseRecord) => {
    const initialSets: { setNumber: number, ownerId: string, weight: number, reps: number, setType: SetType, isLogged: boolean }[] = [];
    if (user) {
      initialSets.push({ setNumber: 1, ownerId: user.id, weight: 0, reps: 0, setType: 'Normal' as SetType, isLogged: false });
    }
    if (partnerId) {
      initialSets.push({ setNumber: 1, ownerId: partnerId, weight: 0, reps: 0, setType: 'Normal' as SetType, isLogged: false });
    }

    setExercises((prev) => [
      ...prev,
      { exercise: ex, sets: initialSets },
    ]);
    setShowAddModal(false);
    setSearchTerm('');
  };

  const handleFinishWorkout = async () => {
    let totalVolume = 0;
    let loggedSetsCount = 0;
    for (const ex of exercises) {
      for (const s of ex.sets) {
        if (s.isLogged && s.ownerId === user?.id) { // Only count my volume for summary
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

  const handleConfirmFinish = async () => {
    if (user) {
      const now = new Date().toISOString();
      await powersync.execute(
        `INSERT OR REPLACE INTO workout_participants (id, workout_id, user_id, status, role, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
        [uuidv4(), workoutId, user.id, 'confirmed', 'owner', now]
      );
      if (partnerId) {
        await powersync.execute(
          `INSERT OR REPLACE INTO workout_participants (id, workout_id, user_id, status, role, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
          [uuidv4(), workoutId, partnerId, 'pending', 'participant', now]
        );
      }
    }
    onFinish();
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
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-green)' }}>
            ● Live Session {partnerProfile && `w/ ${partnerProfile.username}`}
          </span>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 600 }}>{snippetName}</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', padding: '6px 0' }}>
          <Clock size={16} color="var(--text-secondary)" />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            {formatElapsed(elapsedSeconds)}
          </span>
        </div>
      </div>

      {/* Exercises List */}
      {exercises.map((item, exIdx) => (
        <div key={item.exercise.id + exIdx} className="exercise-card">
          <div className="exercise-header">
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)' }}>{item.exercise.name}</h3>
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
          <div className="set-table-header" style={{ paddingLeft: partnerId ? '32px' : '0', paddingRight: partnerId ? '24px' : '0' }}>
            <span>SET</span>
            <span>KG</span>
            <span>REPS</span>
            <span>LOG</span>
          </div>

          {/* Group Sets by setNumber in Bubbles */}
          {Array.from(new Set(item.sets.map(s => s.setNumber))).sort((a,b) => a - b).map((setNum) => {
            const usersToRender: { id: string; profile: any; color: string; fallback: string }[] = [];
            if (user) {
              usersToRender.push({ id: user.id, profile: myProfile, color: 'var(--accent-green)', fallback: myProfile?.username ? myProfile.username.substring(0, 2).toUpperCase() : 'ME' });
            }
            if (partnerId) {
              usersToRender.push({ id: partnerId, profile: partnerProfile, color: '#8b5cf6', fallback: partnerProfile?.username ? partnerProfile.username.substring(0, 2).toUpperCase() : 'P' });
            }

            return (
              <div key={setNum} style={{
                background: 'var(--bg-surface-elevated)',
                borderRadius: '12px',
                padding: '12px',
                marginBottom: '12px',
                border: '1px solid var(--border-subtle)'
              }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Set {setNum}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {usersToRender.map((u) => {
                    const sIdx = item.sets.findIndex(s => s.setNumber === setNum && s.ownerId === u.id);
                    const s = sIdx >= 0 ? item.sets[sIdx] : null;

                    if (!s) {
                      return (
                        <button
                          key={u.id}
                          type="button"
                          className="btn btn-secondary"
                          style={{ width: '100%', minHeight: '38px', height: '38px', borderStyle: 'dashed', opacity: 0.8 }}
                          onClick={() => handleRestoreSet(exIdx, setNum, u.id)}
                        >
                          <Plus size={16} /> Restore {u.profile?.username}'s Set {setNum}
                        </button>
                      );
                    }

                    return (
                      <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {/* Avatar for Multi-player */}
                        {partnerId && (
                           <UserAvatar profile={u.profile} color={u.color} fallbackLetter={u.fallback} />
                        )}

                        <div style={{ flex: 1 }}>
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

                            {/* Weight Input */}
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

                            {/* 1-Tap Log Set Completion */}
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
                              <button type="button" className="stepper-chip" onClick={() => handleUpdateWeight(exIdx, sIdx, -2.5)}>-2.5</button>
                              <button type="button" className="stepper-chip" onClick={() => handleUpdateWeight(exIdx, sIdx, 2.5)}>+2.5</button>
                              <button type="button" className="stepper-chip" onClick={() => handleUpdateWeight(exIdx, sIdx, 5)}>+5</button>
                              <button type="button" className="stepper-chip" onClick={() => handleUpdateReps(exIdx, sIdx, 1)}>+1 rep</button>
                            </div>
                          )}
                        </div>

                        {/* Delete specific row */}
                        <button 
                          onClick={() => handleDeleteSetRow(exIdx, sIdx)}
                          style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', color: 'var(--text-muted)' }}
                        >
                          <X size={20} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Add Set Button */}
          <button
            type="button"
            className="btn btn-secondary"
            style={{ width: '100%', minHeight: '48px', height: '48px', marginTop: '4px' }}
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
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '14px' }}>Select Exercise</h2>

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
                      <div style={{ fontWeight: 600, fontSize: '0.92rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'var(--accent-green)', margin: '0 auto 16px auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Award size={36} color="#000" />
            </div>

            <h2 style={{ fontSize: '1.4rem', fontWeight: 600, marginBottom: '6px' }}>Workout Completed!</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px' }}>
              Saved to local SQLite database and queued for Supabase.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '28px' }}>
              <div style={{ background: 'var(--bg-surface-elevated)', padding: '14px', borderRadius: '12px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Duration</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.2rem', fontWeight: 600, marginTop: '4px' }}>
                  {summaryStats.duration}
                </div>
              </div>

              <div style={{ background: 'var(--bg-surface-elevated)', padding: '14px', borderRadius: '12px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>My Volume</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.2rem', fontWeight: 600, marginTop: '4px', color: 'var(--accent-green)' }}>
                  {summaryStats.volume} kg
                </div>
              </div>

              <div style={{ background: 'var(--bg-surface-elevated)', padding: '14px', borderRadius: '12px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>My Sets</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.2rem', fontWeight: 600, marginTop: '4px', color: 'var(--accent-blue)' }}>
                  {summaryStats.sets}
                </div>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-primary btn-lg"
              onClick={handleConfirmFinish}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
