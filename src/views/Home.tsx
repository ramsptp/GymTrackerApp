import React, { useState, useEffect } from 'react';
import { Play, Plus, Layers, Bolt, MoreVertical, Edit3, Trash2 } from 'lucide-react';
import { powersync, deleteSnippet } from '../db/powersync';
import type { SnippetRecord, WorkoutRecord, SetRecord } from '../db/schema';

interface HomeViewProps {
  onStartSnippetWorkout: (snippet: SnippetRecord) => void;
  onStartFreestyleWorkout: () => void;
  onNavigateToBuilder: (snippetId?: string) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onStartSnippetWorkout,
  onStartFreestyleWorkout,
  onNavigateToBuilder,
}) => {
  const [snippets, setSnippets] = useState<SnippetRecord[]>([]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [weeklyCount, setWeeklyCount] = useState(0);
  const [monthlyVolume, setMonthlyVolume] = useState(0);
  const [monthlySessions, setMonthlySessions] = useState(0);

  const loadData = async () => {
    try {
      // 1. Load Snippets
      const snippetRows = await powersync.getAll<SnippetRecord>(
        'SELECT * FROM snippets ORDER BY created_at DESC'
      );
      setSnippets(snippetRows);

      // 2. Load Telemetry Metrics
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const weekWorkouts = await powersync.getAll<{ count: number }>(
        'SELECT count(*) as count FROM workouts WHERE end_time IS NOT NULL AND start_time >= ?',
        [oneWeekAgo]
      );
      setWeeklyCount(weekWorkouts[0]?.count || 0);

      const monthWorkouts = await powersync.getAll<WorkoutRecord>(
        'SELECT id FROM workouts WHERE end_time IS NOT NULL AND start_time >= ?',
        [oneMonthAgo]
      );
      setMonthlySessions(monthWorkouts.length);

      // Calculate total volume for the month
      let totalVol = 0;
      for (const w of monthWorkouts) {
        const sets = await powersync.getAll<SetRecord>(
          'SELECT weight, reps FROM sets WHERE workout_id = ?',
          [w.id]
        );
        for (const s of sets) {
          totalVol += s.weight * s.reps;
        }
      }
      setMonthlyVolume(Math.round(totalVol));
    } catch (err) {
      console.error('Error loading home view data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDeleteSnippetItem = async (id: string) => {
    if (confirm('Delete this workout snippet?')) {
      await deleteSnippet(id);
      loadData();
    }
  };

  const handleScrollToSnippets = () => {
    const el = document.getElementById('my-snippets-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} onClick={() => setOpenMenuId(null)}>
      {/* Status & Quick Momentum Banner */}
      <div
        style={{
          width: '100%',
          backgroundColor: 'var(--bg-surface)',
          borderRadius: '16px',
          padding: '14px 18px',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="status-dot synced" />
          <span style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--accent-green)' }}>
            {weeklyCount} {weeklyCount === 1 ? 'Workout' : 'Workouts'} This Week
          </span>
        </div>
        <span
          style={{
            fontSize: '0.68rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            backgroundColor: 'var(--bg-surface-elevated)',
            color: 'var(--text-secondary)',
            padding: '4px 8px',
            borderRadius: '6px',
            letterSpacing: '0.05em',
          }}
        >
          {weeklyCount > 0 ? 'On Track' : 'Ready'}
        </span>
      </div>

      {/* Hero: Quick Start Command Center */}
      <div
        style={{
          width: '100%',
          backgroundColor: 'var(--bg-surface)',
          borderRadius: '20px',
          padding: '20px',
          border: '1px solid var(--border-subtle)',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
              Ready to Train?
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Start an unscripted session or jump straight into a routine.
            </p>
          </div>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(78, 222, 163, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bolt size={22} color="var(--accent-green)" />
          </div>
        </div>

        {/* Huge Touch Targets for Sweaty Hands (56px) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Primary Action: Start Empty Workout */}
          <button
            className="btn btn-primary btn-lg"
            style={{ minHeight: '56px', height: '56px', fontSize: '1rem', fontWeight: 800, letterSpacing: '0.03em', textTransform: 'uppercase' }}
            onClick={onStartFreestyleWorkout}
            id="btn-empty-workout"
          >
            <Plus size={22} strokeWidth={3} />
            <span>Start Empty Workout</span>
          </button>

          {/* Secondary Routine Action: Strictly "Browse Snippets" */}
          <button
            className="btn btn-secondary btn-lg"
            style={{ minHeight: '56px', height: '56px', fontSize: '1rem', fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase' }}
            onClick={handleScrollToSnippets}
            id="btn-browse-snippets"
          >
            <Layers size={20} color="var(--text-secondary)" />
            <span>Browse Snippets</span>
          </button>
        </div>
      </div>

      {/* Telemetry Strip: Quick Stat Glance */}
      <div
        style={{
          width: '100%',
          backgroundColor: 'var(--bg-surface)',
          borderRadius: '16px',
          padding: '16px 20px',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
            Monthly Output
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '2px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {monthlySessions}
            </span>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>sessions</span>
          </div>
        </div>

        <div style={{ width: '1px', height: '36px', backgroundColor: 'var(--border-subtle)' }} />

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <span style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
            Volume Load
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '2px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-green)' }}>
              {monthlyVolume.toLocaleString()}
            </span>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>kg</span>
          </div>
        </div>
      </div>

      {/* My Snippets Section */}
      <div id="my-snippets-section" style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--text-primary)' }}>
              My Snippets
            </h3>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, background: 'var(--bg-surface-elevated)', color: 'var(--text-secondary)', padding: '2px 8px', borderRadius: '6px' }}>
              {snippets.length}
            </span>
          </div>

          {/* + NEW SNIPPET button navigating directly to /snippet-builder */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNavigateToBuilder();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: 'var(--accent-green)',
              fontSize: '0.82rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              cursor: 'pointer',
              padding: '8px 14px',
              borderRadius: '10px',
              minHeight: '44px',
            }}
            id="btn-new-snippet-header"
          >
            <Plus size={16} strokeWidth={3} />
            <span>+ New Snippet</span>
          </button>
        </div>

        {/* Snippets Stack */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {snippets.map((snippet) => (
            <div
              key={snippet.id}
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderRadius: '16px',
                padding: '16px 18px',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'border-color 0.15s ease',
                position: 'relative',
              }}
            >
              <div style={{ flex: 1, minWidth: 0, paddingRight: '12px' }}>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {snippet.name}
                </h4>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  Snippet ID: {snippet.id.slice(0, 8)}...
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* 3-Dot Options Menu Button (56px Touch Target) */}
                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenuId(openMenuId === snippet.id ? null : snippet.id);
                    }}
                    style={{
                      width: '48px',
                      height: '48px',
                      minHeight: '48px',
                      borderRadius: '10px',
                      border: '1px solid var(--border-subtle)',
                      backgroundColor: 'var(--bg-surface-elevated)',
                      color: 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                    id={`btn-snippet-options-${snippet.id}`}
                    title="Snippet options"
                  >
                    <MoreVertical size={20} />
                  </button>

                  {/* Dropdown Menu */}
                  {openMenuId === snippet.id && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        position: 'absolute',
                        right: 0,
                        top: '54px',
                        backgroundColor: 'var(--bg-surface-elevated)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '12px',
                        padding: '6px',
                        boxShadow: '0 12px 28px rgba(0, 0, 0, 0.6)',
                        zIndex: 50,
                        minWidth: '160px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setOpenMenuId(null);
                          onNavigateToBuilder(snippet.id);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '12px 14px',
                          background: 'none',
                          border: 'none',
                          borderRadius: '8px',
                          color: 'var(--text-primary)',
                          fontSize: '0.88rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          textAlign: 'left',
                          width: '100%',
                          minHeight: '44px',
                        }}
                        id={`btn-edit-snippet-${snippet.id}`}
                      >
                        <Edit3 size={16} color="var(--accent-blue)" />
                        <span>Edit Snippet</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setOpenMenuId(null);
                          handleDeleteSnippetItem(snippet.id);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '12px 14px',
                          background: 'none',
                          border: 'none',
                          borderRadius: '8px',
                          color: 'var(--accent-rose)',
                          fontSize: '0.88rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          textAlign: 'left',
                          width: '100%',
                          minHeight: '44px',
                        }}
                        id={`btn-delete-snippet-${snippet.id}`}
                      >
                        <Trash2 size={16} />
                        <span>Delete Snippet</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* 1-Tap Start Workout */}
                <button
                  className="btn btn-primary"
                  style={{ minHeight: '48px', height: '48px', padding: '0 16px', fontSize: '0.88rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.03em' }}
                  onClick={() => onStartSnippetWorkout(snippet)}
                  id={`btn-start-snippet-${snippet.id}`}
                >
                  <Play size={16} fill="white" />
                  <span>Start</span>
                </button>
              </div>
            </div>
          ))}

          {snippets.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px', background: 'var(--bg-surface)', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}>
              <Layers size={40} color="var(--text-muted)" style={{ opacity: 0.3, margin: '0 auto 10px auto' }} />
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>No snippets saved yet.</p>
              <button
                className="btn btn-primary"
                style={{ marginTop: '12px', minHeight: '48px' }}
                onClick={() => onNavigateToBuilder()}
              >
                + Create First Snippet
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomeView;
