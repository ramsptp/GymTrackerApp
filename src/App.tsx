import React, { useState, useEffect } from 'react';
import { Dumbbell, Layers, History, Play, User, ChevronDown } from 'lucide-react';
import { initDatabase, startWorkout } from './db/powersync';
import type { SnippetRecord } from './db/schema';
import { ActiveWorkout } from './components/ActiveWorkout';
import { HomeView } from './views/Home';
import { ExercisesView } from './views/Exercises';
import { HistoryView } from './views/History';
import { SnippetBuilderView } from './views/SnippetBuilder';
import { AccountView } from './views/Account';
import { SyncStatusBadge } from './components/SyncStatusBadge';

export const App: React.FC = () => {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return window.location.pathname || '/';
  });

  const [activeWorkout, setActiveWorkout] = useState<{
    workoutId: string;
    snippetId?: string;
    snippetName?: string;
  } | null>(null);

  const [isWorkoutExpanded, setIsWorkoutExpanded] = useState(false);
  const [isDbReady, setIsDbReady] = useState(false);

  // Sync state with browser navigation (popstate)
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Navigate function updating browser history & state without full reload
  const navigate = (path: string) => {
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    setCurrentPath(path);
  };

  useEffect(() => {
    const bootstrap = async () => {
      try {
        await initDatabase();
        setIsDbReady(true);
      } catch (err) {
        console.error('Failed to initialize PowerSync SQLite database:', err);
        setIsDbReady(true);
      }
    };
    bootstrap();
  }, []);

  const handleStartSnippetWorkout = async (snippet: SnippetRecord) => {
    const workoutId = await startWorkout(snippet.id);
    setActiveWorkout({
      workoutId,
      snippetId: snippet.id,
      snippetName: snippet.name,
    });
    setIsWorkoutExpanded(true);
  };

  const handleStartFreestyleWorkout = async () => {
    const workoutId = await startWorkout();
    setActiveWorkout({
      workoutId,
      snippetName: 'Freestyle Workout',
    });
    setIsWorkoutExpanded(true);
  };

  const handleFinishActiveWorkout = () => {
    setActiveWorkout(null);
    navigate('/history');
  };

  const handleCancelActiveWorkout = () => {
    setActiveWorkout(null);
  };

  // Route matching for Snippet Builder
  const isSnippetBuilder = currentPath.startsWith('/snippet-builder');
  let editSnippetId: string | undefined = undefined;
  if (isSnippetBuilder) {
    if (currentPath.startsWith('/snippet-builder/')) {
      editSnippetId = currentPath.replace('/snippet-builder/', '').trim() || undefined;
    } else if (window.location.search.includes('id=')) {
      editSnippetId = new URLSearchParams(window.location.search).get('id') || undefined;
    }
  }

  if (!isDbReady) {
    return (
      <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="brand-icon" style={{ width: '54px', height: '54px', margin: '0 auto 16px auto' }}>
            <Dumbbell size={28} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Gym Tracker</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '6px' }}>
            Booting local browser SQLite engine...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Top Global Header with Global Sync Badge (Hidden in Snippet Builder for dedicated top bar) */}
      {!isSnippetBuilder && (
        <header className="top-nav">
          <div className="brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            <div className="brand-icon">
              <Dumbbell size={20} />
            </div>
            <span className="brand-title">Gym Tracker</span>
          </div>

          {/* Global Sync Status Badge hooking into useStatus */}
          <SyncStatusBadge />
        </header>
      )}

      {/* Main View Area */}
      <main className="main-content">
        {/* Snippet Builder View (New or Edit) */}
        {isSnippetBuilder ? (
          <SnippetBuilderView
            snippetId={editSnippetId}
            onSave={() => navigate('/')}
            onCancel={() => navigate('/')}
          />
        ) : (
          <>
            {/* Active Workout Session Overlay */}
            {activeWorkout && (
              <div
                style={{
                  display: isWorkoutExpanded ? 'block' : 'none',
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'var(--bg-primary)',
                  zIndex: 100,
                  overflowY: 'auto',
                  padding: '16px',
                  paddingTop: 'env(safe-area-inset-top, 16px)'
                }}
              >
                <div style={{ paddingBottom: '16px', display: 'flex', justifyContent: 'center' }}>
                  <button onClick={() => setIsWorkoutExpanded(false)} style={{ background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '20px', padding: '6px 20px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold' }}>
                    <ChevronDown size={20} /> Minimize Workout
                  </button>
                </div>
                <ActiveWorkout
                  workoutId={activeWorkout.workoutId}
                  snippetId={activeWorkout.snippetId}
                  snippetName={activeWorkout.snippetName}
                  onFinish={handleFinishActiveWorkout}
                  onCancel={handleCancelActiveWorkout}
                />
              </div>
            )}

            {/* Home / Snippets View */}
            {currentPath === '/' && (
              <HomeView
                onStartSnippetWorkout={handleStartSnippetWorkout}
                onStartFreestyleWorkout={handleStartFreestyleWorkout}
                onNavigateToBuilder={(id?: string) => {
                  if (id) navigate(`/snippet-builder/${id}`);
                  else navigate('/snippet-builder');
                }}
              />
            )}

            {/* Exercises Catalog View */}
            <div style={{ display: currentPath === '/exercises' ? 'block' : 'none' }}>
              <ExercisesView />
            </div>

            {/* Workout History View */}
            <div style={{ display: currentPath === '/history' ? 'block' : 'none' }}>
              <HistoryView />
            </div>

            {/* Account & Cloud Sync View */}
            <div style={{ display: currentPath === '/account' ? 'block' : 'none' }}>
              <AccountView />
            </div>
          </>
        )}
      </main>

      {/* Persistent Active Workout Mini-Banner */}
      {!isSnippetBuilder && activeWorkout && !isWorkoutExpanded && (
        <div
          onClick={() => setIsWorkoutExpanded(true)}
          style={{
            position: 'fixed',
            bottom: '84px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'calc(100% - 32px)',
            maxWidth: '488px',
            backgroundColor: 'var(--bg-surface-elevated)',
            border: '1px solid var(--accent-green)',
            borderRadius: '14px',
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
            cursor: 'pointer',
            zIndex: 48,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="status-dot synced" />
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--accent-green)', textTransform: 'uppercase' }}>
                Workout in Progress
              </div>
              <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {activeWorkout.snippetName}
              </div>
            </div>
          </div>

          <button
            className="btn btn-primary"
            style={{ minHeight: '38px', height: '38px', padding: '0 14px', fontSize: '0.82rem', fontWeight: 800 }}
            onClick={(e) => {
              e.stopPropagation();
              setIsWorkoutExpanded(true);
            }}
          >
            <Play size={14} fill="white" /> Resume
          </button>
        </div>
      )}

      {/* Persistent Bottom Tab Bar (4 Tabs) */}
      {!isSnippetBuilder && (
        <nav className="bottom-tab-bar">
          <button
            className={`tab-btn ${currentPath === '/' ? 'active' : ''}`}
            onClick={() => navigate('/')}
            id="tab-snippets"
          >
            <Layers size={22} />
            <span>Snippets</span>
          </button>

          <button
            className={`tab-btn ${currentPath === '/exercises' ? 'active' : ''}`}
            onClick={() => navigate('/exercises')}
            id="tab-exercises"
          >
            <Dumbbell size={22} />
            <span>Exercises</span>
          </button>

          <button
            className={`tab-btn ${currentPath === '/history' ? 'active' : ''}`}
            onClick={() => navigate('/history')}
            id="tab-history"
          >
            <History size={22} />
            <span>History</span>
          </button>

          <button
            className={`tab-btn ${currentPath === '/account' ? 'active' : ''}`}
            onClick={() => navigate('/account')}
            id="tab-account"
          >
            <User size={22} />
            <span>Account</span>
          </button>
        </nav>
      )}
    </div>
  );
};

export default App;
