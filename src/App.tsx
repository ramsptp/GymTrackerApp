import React, { useState, useEffect } from 'react';
import { Dumbbell, Layers, History } from 'lucide-react';
import { initDatabase, startWorkout } from './db/powersync';
import type { SnippetRecord } from './db/schema';
import { ActiveWorkout } from './components/ActiveWorkout';
import { SnippetManager } from './components/SnippetManager';
import { ExerciseCatalog } from './components/ExerciseCatalog';
import { WorkoutHistory } from './components/WorkoutHistory';
import { SyncStatusBadge } from './components/SyncStatusBadge';

type Tab = 'snippets' | 'exercises' | 'history';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('snippets');
  const [activeWorkout, setActiveWorkout] = useState<{
    workoutId: string;
    snippetName?: string;
  } | null>(null);
  const [isDbReady, setIsDbReady] = useState(false);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        await initDatabase();
        setIsDbReady(true);
      } catch (err) {
        console.error('Failed to initialize PowerSync SQLite database:', err);
        setIsDbReady(true); // Proceed to allow UI to show error/state
      }
    };
    bootstrap();
  }, []);

  const handleStartSnippetWorkout = async (snippet: SnippetRecord) => {
    const workoutId = await startWorkout(snippet.id);
    setActiveWorkout({
      workoutId,
      snippetName: snippet.name,
    });
  };

  const handleStartFreestyleWorkout = async () => {
    const workoutId = await startWorkout();
    setActiveWorkout({
      workoutId,
      snippetName: 'Freestyle Workout',
    });
  };

  const handleFinishActiveWorkout = () => {
    setActiveWorkout(null);
    setActiveTab('history');
  };

  const handleCancelActiveWorkout = () => {
    setActiveWorkout(null);
  };

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
      {/* Top Navigation */}
      <header className="top-nav">
        <div className="brand">
          <div className="brand-icon">
            <Dumbbell size={20} />
          </div>
          <span className="brand-title">Gym Tracker</span>
        </div>

        <SyncStatusBadge />
      </header>

      {/* Main View Area */}
      <main className="main-content">
        {activeWorkout ? (
          <ActiveWorkout
            workoutId={activeWorkout.workoutId}
            snippetName={activeWorkout.snippetName}
            onFinish={handleFinishActiveWorkout}
            onCancel={handleCancelActiveWorkout}
          />
        ) : (
          <>
            {activeTab === 'snippets' && (
              <SnippetManager
                onStartSnippetWorkout={handleStartSnippetWorkout}
                onStartFreestyleWorkout={handleStartFreestyleWorkout}
              />
            )}

            {activeTab === 'exercises' && <ExerciseCatalog />}

            {activeTab === 'history' && <WorkoutHistory />}
          </>
        )}
      </main>

      {/* Bottom Tab Bar (hidden during active workout for maximum focus) */}
      {!activeWorkout && (
        <nav className="bottom-tab-bar">
          <button
            className={`tab-btn ${activeTab === 'snippets' ? 'active' : ''}`}
            onClick={() => setActiveTab('snippets')}
          >
            <Layers size={22} />
            <span>Snippets</span>
          </button>

          <button
            className={`tab-btn ${activeTab === 'exercises' ? 'active' : ''}`}
            onClick={() => setActiveTab('exercises')}
          >
            <Dumbbell size={22} />
            <span>Exercises</span>
          </button>

          <button
            className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <History size={22} />
            <span>History</span>
          </button>
        </nav>
      )}
    </div>
  );
};

export default App;
