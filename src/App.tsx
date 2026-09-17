import React, { useState, useEffect } from 'react';
import { Dumbbell, History, Play, User, ChevronDown, Home } from 'lucide-react';
import { initDatabase, startWorkout, powersync } from './db/powersync';
import type { SnippetRecord } from './db/schema';
import { ActiveWorkout } from './components/ActiveWorkout';
import { HomeView } from './views/Home';
import { ExercisesView } from './views/Exercises';
import { HistoryView } from './views/History';
import { SnippetBuilderView } from './views/SnippetBuilder';
import { ProfileView } from './views/Profile';
import { SyncStatusBadge } from './components/SyncStatusBadge';
import { useAuth } from './context/AuthContext';
import { useQuery, useStatus } from '@powersync/react';
import { LandingView } from './views/Landing';

export const App: React.FC = () => {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return window.location.pathname || '/';
  });

  const [activeWorkout, setActiveWorkout] = useState<{
    workoutId: string;
    snippetId?: string;
    snippetName?: string;
    partnerId?: string;
  } | null>(null);

  const [isWorkoutExpanded, setIsWorkoutExpanded] = useState(false);
  const [isDbReady, setIsDbReady] = useState(false);

  const { user, loading } = useAuth();
  const status = useStatus();

  const { data: profileData, isLoading: isProfileLoading } = useQuery('SELECT username FROM profiles WHERE id = ?', [user?.id || '']);
  const profileUsername = profileData?.[0]?.username || null;

  // Notification Badge Queries
  const { data: pendingInvitesData } = useQuery(
    user?.id ? `SELECT count(*) as count FROM workout_participants WHERE user_id = ? AND status = 'pending'` : '',
    user?.id ? [user.id] : []
  );
  const pendingInvitesCount = pendingInvitesData?.[0]?.count || 0;

  const { data: pendingFriendsData } = useQuery(
    user?.id ? `SELECT count(*) as count FROM friendships WHERE addressee_id = ? AND status = 'pending'` : '',
    user?.id ? [user.id] : []
  );
  const pendingFriendsCount = pendingFriendsData?.[0]?.count || 0;

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

  // Auto-resume active workouts
  useEffect(() => {
    const checkActiveWorkout = async () => {
      if (user && isDbReady && !activeWorkout) {
        const active = await powersync.getOptional<{id: string, snippet_id: string, name: string}>(
          `SELECT w.id, w.snippet_id, s.name 
           FROM workouts w 
           LEFT JOIN snippets s ON w.snippet_id = s.id 
           WHERE w.user_id = ? AND w.end_time IS NULL 
           ORDER BY w.start_time DESC LIMIT 1`, 
          [user.id]
        );
        if (active) {
          const participant = await powersync.getOptional<{user_id: string}>(
            `SELECT user_id FROM workout_participants WHERE workout_id = ? AND user_id != ? AND role = 'participant' LIMIT 1`,
            [active.id, user.id]
          );
          setActiveWorkout({
            workoutId: active.id,
            snippetId: active.snippet_id,
            snippetName: active.name || 'Freestyle Workout',
            partnerId: participant?.user_id
          });
          setIsWorkoutExpanded(false);
        }
      }
    };
    checkActiveWorkout();
  }, [user, isDbReady]);

  const handleStartSnippetWorkout = async (snippet: SnippetRecord, partnerId?: string) => {
    const workoutId = await startWorkout(snippet.id);
    setActiveWorkout({
      workoutId,
      snippetId: snippet.id,
      snippetName: snippet.name,
      partnerId,
    });
    setIsWorkoutExpanded(true);
  };

  const handleStartFreestyleWorkout = async (partnerId?: string) => {
    const workoutId = await startWorkout();
    setActiveWorkout({
      workoutId,
      snippetName: 'Freestyle Workout',
      partnerId,
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

  // Wait for PowerSync to complete its initial sync before determining if the user lacks a profile
  const isHydratingProfile = user && (!status.hasSynced || isProfileLoading);

  if (loading || !isDbReady || isHydratingProfile) {
    return (
      <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="brand-icon" style={{ width: '54px', height: '54px', margin: '0 auto 16px auto' }}>
            <Dumbbell size={28} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Gym Tracker</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '6px' }}>
            {loading ? 'Authenticating...' : 'Booting local browser SQLite engine...'}
          </p>
        </div>
      </div>
    );
  }

  // Force users to authenticate and set username before accessing the app
  if (!user || (user && !profileUsername)) {
    return (
      <div className="app-container">
        <LandingView profileUsername={profileUsername} />
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
                  <button onClick={() => setIsWorkoutExpanded(false)} style={{ background: 'transparent', border: 'none', padding: '12px 24px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.95rem', fontWeight: 500, cursor: 'pointer' }}>
                    <ChevronDown size={20} /> Minimize Workout
                  </button>
                </div>
                <ActiveWorkout
                  workoutId={activeWorkout.workoutId}
                  snippetId={activeWorkout.snippetId}
                  snippetName={activeWorkout.snippetName}
                  partnerId={activeWorkout.partnerId}
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
            {currentPath === '/exercises' && (
              <ExercisesView />
            )}

            {/* Workout History View */}
            {currentPath === '/history' && (
              <HistoryView />
            )}

            {/* Profile & Cloud Sync View */}
            {currentPath === '/profile' && (
              <ProfileView />
            )}
          </>
        )}
      </main>

      {/* Persistent Active Workout Mini-Banner */}
      {!isSnippetBuilder && activeWorkout && !isWorkoutExpanded && (
        <div
          onClick={() => setIsWorkoutExpanded(true)}
          style={{
            position: 'fixed',
            bottom: '96px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'calc(100% - 32px)',
            maxWidth: '488px',
            backgroundColor: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '16px',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            cursor: 'pointer',
            zIndex: 48,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--accent-green)' }} />
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-green)' }}>
                Workout in Progress
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {activeWorkout.snippetName}
              </div>
            </div>
          </div>

          <button
            className="btn btn-primary"
            style={{ minHeight: '40px', height: '40px', padding: '0 16px', fontSize: '0.9rem', borderRadius: '20px' }}
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
            <div style={{ position: 'relative' }}>
              <Home size={22} />
              {pendingInvitesCount > 0 && (
                <div style={{
                  position: 'absolute', top: -2, right: -4, width: 10, height: 10, 
                  backgroundColor: 'var(--accent-rose)', borderRadius: '50%', border: '2px solid var(--bg-body)'
                }} />
              )}
            </div>
            <span>Home</span>
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
            className={`tab-btn ${currentPath === '/profile' ? 'active' : ''}`}
            onClick={() => navigate('/profile')}
            id="tab-profile"
          >
            <div style={{ position: 'relative' }}>
              <User size={22} />
              {pendingFriendsCount > 0 && (
                <div style={{
                  position: 'absolute', top: -2, right: -4, width: 10, height: 10, 
                  backgroundColor: 'var(--accent-rose)', borderRadius: '50%', border: '2px solid var(--bg-body)'
                }} />
              )}
            </div>
            <span>Profile</span>
          </button>
        </nav>
      )}
    </div>
  );
};

export default App;
