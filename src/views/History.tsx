import React, { useState, useEffect } from 'react';
import { Calendar, Award, ChevronDown, ChevronUp, Layers, Trash2 } from 'lucide-react';
import { powersync } from '../db/powersync';
import type { WorkoutRecord, SetRecord } from '../db/schema';

interface HistoryItem {
  workout: WorkoutRecord;
  snippetName: string;
  totalVolume: number;
  totalSets: number;
  durationMinutes: number;
  sets: (SetRecord & { exercise_name?: string })[];
}

export const HistoryView: React.FC = () => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [expandedWorkoutId, setExpandedWorkoutId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const workouts = await powersync.getAll<WorkoutRecord>(
        'SELECT * FROM workouts WHERE end_time IS NOT NULL ORDER BY start_time DESC'
      );

      const items: HistoryItem[] = [];

      for (const w of workouts) {
        let snippetName = 'Freestyle Session';
        if (w.snippet_id) {
          const snip = await powersync.getOptional<{ name: string }>(
            'SELECT name FROM snippets WHERE id = ?',
            [w.snippet_id]
          );
          if (snip) snippetName = snip.name;
        }

        const sets = await powersync.getAll<SetRecord & { exercise_name: string }>(
          `SELECT s.*, e.name as exercise_name 
           FROM sets s 
           LEFT JOIN exercises e ON s.exercise_id = e.id 
           WHERE s.workout_id = ? 
           ORDER BY s.logged_at ASC`,
          [w.id]
        );

        let volume = 0;
        for (const s of sets) {
          if (s.set_type !== 'Warmup') {
            volume += s.weight * s.reps;
          }
        }

        const start = new Date(w.start_time).getTime();
        const end = new Date(w.end_time || w.start_time).getTime();
        const durationMins = Math.max(1, Math.round((end - start) / (1000 * 60)));

        items.push({
          workout: w,
          snippetName,
          totalVolume: Math.round(volume),
          totalSets: sets.length,
          durationMinutes: durationMins,
          sets,
        });
      }

      setHistory(items);
    } catch (err) {
      console.error('Error loading workout history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleDeleteWorkout = async (e: React.MouseEvent, workoutId: string) => {
    e.stopPropagation();
    if (confirm('Delete this workout from history?')) {
      setHistory((prev) => prev.filter(item => item.workout.id !== workoutId));
      await powersync.writeTransaction(async (tx) => {
        await tx.execute('DELETE FROM sets WHERE workout_id = ?', [workoutId]);
        await tx.execute('DELETE FROM workouts WHERE id = ?', [workoutId]);
      });
      loadHistory();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header */}
      <div>
        <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
          Chronological Logs
        </span>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
          Workout History
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '2px' }}>
          Past sessions recorded in local SQLite and synchronized to Supabase
        </p>
      </div>

      {/* History Items Feed */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {history.map((item) => {
          const isExpanded = expandedWorkoutId === item.workout.id;

          return (
            <div
              key={item.workout.id}
              className="card"
              style={{
                padding: '18px',
                backgroundColor: 'var(--bg-surface)',
                cursor: 'pointer',
              }}
              onClick={() => setExpandedWorkoutId(isExpanded ? null : item.workout.id)}
            >
              {/* Card Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar size={14} color="var(--text-muted)" />
                  <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                    {formatDate(item.workout.start_time)} • {formatTime(item.workout.start_time)}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={(e) => handleDeleteWorkout(e, item.workout.id)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                    title="Delete session"
                  >
                    <Trash2 size={16} />
                  </button>
                  {isExpanded ? <ChevronUp size={20} color="var(--text-muted)" /> : <ChevronDown size={20} color="var(--text-muted)" />}
                </div>
              </div>

              {/* Snippet Name Title */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Layers size={18} color="var(--text-primary)" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {item.snippetName}
                </h3>
              </div>

              {/* Telemetry Metrics Row (56px touch target friendly) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                <div style={{ background: 'var(--bg-surface-elevated)', padding: '12px 14px', borderRadius: '12px', minHeight: '52px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Duration</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
                    {item.durationMinutes}m
                  </div>
                </div>

                <div style={{ background: 'var(--bg-surface-elevated)', padding: '12px 14px', borderRadius: '12px', minHeight: '52px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Total Volume</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
                    {item.totalVolume.toLocaleString()} kg
                  </div>
                </div>

                <div style={{ background: 'var(--bg-surface-elevated)', padding: '12px 14px', borderRadius: '12px', minHeight: '52px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Sets Logged</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
                    {item.totalSets}
                  </div>
                </div>
              </div>

              {/* Expanded Breakdown */}
              {isExpanded && (
                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '10px' }}>
                    Detailed Sets Breakdown
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {item.sets.map((s, idx) => (
                      <div
                        key={s.id || idx}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '10px 14px',
                          background: 'var(--bg-surface-elevated)',
                          borderRadius: '8px',
                          minHeight: '44px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 500, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                            {s.exercise_name || 'Exercise'}
                          </span>
                          <span
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: 500,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: s.set_type === 'Warmup' ? 'rgba(245, 158, 11, 0.15)' : s.set_type === 'Drop' ? 'rgba(139, 92, 246, 0.15)' : s.set_type === 'Failure' ? 'rgba(244, 63, 94, 0.15)' : 'transparent',
                              color: s.set_type === 'Warmup' ? 'var(--accent-amber)' : s.set_type === 'Drop' ? 'var(--accent-purple)' : s.set_type === 'Failure' ? 'var(--accent-rose)' : 'var(--text-muted)',
                            }}
                          >
                            {s.set_type}
                          </span>
                        </div>

                        <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                          {s.weight} kg × {s.reps} reps
                        </div>
                      </div>
                    ))}

                    {item.sets.length === 0 && (
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '8px 0' }}>
                        No sets logged for this session.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {!loading && history.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--bg-surface)', borderRadius: '18px', border: '1px solid var(--border-subtle)' }}>
            <Award size={48} color="var(--text-muted)" style={{ opacity: 0.4, margin: '0 auto 12px auto' }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>No Sessions Recorded Yet</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '6px' }}>
              Launch a workout from the Home tab to log your first session.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryView;
