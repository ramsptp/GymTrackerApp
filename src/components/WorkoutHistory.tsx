import React, { useState, useEffect } from 'react';
import { Award, ChevronDown, ChevronUp } from 'lucide-react';
import { powersync } from '../db/powersync';
import type { WorkoutRecord, SetRecord } from '../db/schema';

interface HistoryItem {
  workout: WorkoutRecord;
  snippetName?: string;
  totalVolume: number;
  totalSets: number;
  durationMinutes: number;
  sets: (SetRecord & { exercise_name?: string })[];
}

export const WorkoutHistory: React.FC = () => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [expandedWorkoutId, setExpandedWorkoutId] = useState<string | null>(null);

  const loadHistory = async () => {
    try {
      const workouts = await powersync.getAll<WorkoutRecord>(
        'SELECT * FROM workouts WHERE end_time IS NOT NULL ORDER BY start_time DESC'
      );

      const items: HistoryItem[] = [];

      for (const w of workouts) {
        let snippetName = 'Freestyle Workout';
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
          volume += s.weight * s.reps;
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
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '4px' }}>Workout History</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          Completed sessions persisted in local SQLite and synced to PostgreSQL
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {history.map((item) => {
          const isExpanded = expandedWorkoutId === item.workout.id;

          return (
            <div key={item.workout.id} className="card" style={{ padding: '18px' }}>
              <div
                onClick={() => setExpandedWorkoutId(isExpanded ? null : item.workout.id)}
                style={{ cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--accent-blue)', fontWeight: 700 }}>
                    {formatDate(item.workout.start_time)}
                  </span>
                  {isExpanded ? <ChevronUp size={18} color="var(--text-muted)" /> : <ChevronDown size={18} color="var(--text-muted)" />}
                </div>

                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '12px' }}>
                  {item.snippetName}
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  <div style={{ background: 'var(--bg-surface-elevated)', padding: '10px 12px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>DURATION</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.95rem', fontWeight: 700, marginTop: '2px' }}>
                      {item.durationMinutes}m
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-surface-elevated)', padding: '10px 12px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>VOLUME</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.95rem', fontWeight: 700, marginTop: '2px', color: 'var(--accent-green)' }}>
                      {item.totalVolume} kg
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-surface-elevated)', padding: '10px 12px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>SETS</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.95rem', fontWeight: 700, marginTop: '2px', color: '#60a5fa' }}>
                      {item.totalSets}
                    </div>
                  </div>
                </div>
              </div>

              {/* Expanded Set Details */}
              {isExpanded && (
                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '10px' }}>
                    Logged Sets Breakdown
                  </h4>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {item.sets.map((s, idx) => (
                      <div
                        key={s.id || idx}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '8px 12px',
                          background: 'var(--bg-surface-elevated)',
                          borderRadius: '8px',
                          fontSize: '0.85rem',
                        }}
                      >
                        <div>
                          <span style={{ fontWeight: 600 }}>{s.exercise_name || 'Exercise'}</span>
                          <span style={{ marginLeft: '8px', fontSize: '0.72rem', color: 'var(--text-muted)', padding: '2px 6px', background: 'var(--bg-primary)', borderRadius: '4px' }}>
                            {s.set_type}
                          </span>
                        </div>

                        <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                          {s.weight} kg × {s.reps} reps
                        </div>
                      </div>
                    ))}

                    {item.sets.length === 0 && (
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No sets logged for this session.</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {history.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            <Award size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <p>No completed workouts logged yet.</p>
            <p style={{ fontSize: '0.85rem', marginTop: '6px' }}>Start a workout snippet to record your first session!</p>
          </div>
        )}
      </div>
    </div>
  );
};
