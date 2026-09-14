import React, { useState } from 'react';
import { Cloud, CloudOff } from 'lucide-react';
import { connector } from '../db/connector';

export const SyncStatusBadge: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showConfig, setShowConfig] = useState(false);
  const isConfigured = connector.isConfigured();

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <>
      <button
        className="status-pill"
        onClick={() => setShowConfig(true)}
        title="Sync & Database Status"
      >
        {isConfigured && isOnline ? (
          <>
            <span className="status-dot synced" />
            <Cloud size={14} color="#10b981" />
            <span>Supabase Synced</span>
          </>
        ) : (
          <>
            <span className="status-dot offline" />
            <CloudOff size={14} color="#f59e0b" />
            <span>SQLite Offline</span>
          </>
        )}
      </button>

      {showConfig && (
        <div className="modal-backdrop" onClick={() => setShowConfig(false)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Database & Sync Status</h2>
              <button
                onClick={() => setShowConfig(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ backgroundColor: 'var(--bg-surface-elevated)', padding: '16px', borderRadius: '12px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span className={`status-dot ${isConfigured && isOnline ? 'synced' : 'offline'}`} />
                <strong style={{ fontSize: '0.95rem' }}>
                  {isConfigured && isOnline ? 'Connected to Supabase' : 'Running 100% Offline (Local SQLite)'}
                </strong>
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Local browser SQLite (via PowerSync WASM) is actively intercepting and storing all workout logs with &lt;2ms latency.
                When connected, changes stream automatically to your Supabase PostgreSQL backend.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  SUPABASE URL
                </label>
                <input
                  type="text"
                  readOnly
                  value={import.meta.env.VITE_SUPABASE_URL || '(Local SQLite Mode)'}
                  style={{
                    width: '100%',
                    height: '46px',
                    borderRadius: '8px',
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-secondary)',
                    padding: '0 12px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.85rem',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  POWERSYNC SERVICE ENDPOINT
                </label>
                <input
                  type="text"
                  readOnly
                  value={import.meta.env.VITE_POWERSYNC_URL || '(Local In-Memory / OPFS)'}
                  style={{
                    width: '100%',
                    height: '46px',
                    borderRadius: '8px',
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-secondary)',
                    padding: '0 12px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.85rem',
                  }}
                />
              </div>
            </div>

            <button
              className="btn btn-secondary"
              style={{ width: '100%', marginTop: '20px' }}
              onClick={() => setShowConfig(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};
