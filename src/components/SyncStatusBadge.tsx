import React, { useState } from 'react';
import { useStatus } from '@powersync/react';
import { Cloud, CloudOff, RefreshCw, X, Database } from 'lucide-react';
import { connector } from '../db/connector';

export const SyncStatusBadge: React.FC = () => {
  const status = useStatus();
  const [showConfig, setShowConfig] = useState(false);
  const isConfigured = connector.isConfigured();

  // Determine current synchronization state from PowerSync observer
  const isSyncing = status?.uploading || status?.downloading || status?.connecting;
  const isSynced = status?.connected && !status?.uploading && !status?.downloading;

  let badgeType: 'synced' | 'syncing' | 'offline';
  let badgeLabel: string;

  if (isSyncing) {
    badgeType = 'syncing';
    badgeLabel = 'Syncing...';
  } else if (isSynced) {
    badgeType = 'synced';
    badgeLabel = 'Synced';
  } else {
    badgeType = 'offline';
    badgeLabel = 'Offline';
  }

  return (
    <>
      <button
        className="status-pill"
        onClick={() => setShowConfig(true)}
        title="PowerSync & Supabase Engine Status"
        id="sync-status-badge"
      >
        <span className={`status-dot ${badgeType}`} />
        {badgeType === 'synced' && <Cloud size={14} color="var(--accent-green)" />}
        {badgeType === 'syncing' && <RefreshCw size={14} color="var(--accent-blue)" className="animate-spin" />}
        {badgeType === 'offline' && <CloudOff size={14} color="var(--accent-amber)" />}
        <span>{badgeLabel}</span>
      </button>

      {showConfig && (
        <div className="modal-backdrop" onClick={() => setShowConfig(false)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Database size={20} color="var(--accent-blue)" />
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>PowerSync Telemetry</h2>
              </div>
              <button
                onClick={() => setShowConfig(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Current Real-time State Card */}
            <div style={{ backgroundColor: 'var(--bg-surface-elevated)', padding: '16px', borderRadius: '12px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span className={`status-dot ${badgeType}`} />
                <strong style={{ fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {badgeType === 'synced' && '🟢 Connected & Synced'}
                  {badgeType === 'syncing' && '🔵 Active Data Streaming'}
                  {badgeType === 'offline' && '🟠 Offline (Browser SQLite Active)'}
                </strong>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {badgeType === 'offline'
                  ? 'All exercises, snippets, workouts, and sets write locally to in-browser SQLite with instant <2ms execution. Mutations will stream to Supabase automatically when online.'
                  : 'PowerSync is actively replicating local SQLite changes with your Supabase PostgreSQL cluster.'}
              </p>
            </div>

            {/* Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
              <div style={{ background: 'var(--bg-surface-elevated)', padding: '12px', borderRadius: '10px' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>CONNECTED</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', fontWeight: 800, marginTop: '2px', color: status?.connected ? 'var(--accent-green)' : 'var(--accent-amber)' }}>
                  {status?.connected ? 'TRUE' : 'FALSE'}
                </div>
              </div>

              <div style={{ background: 'var(--bg-surface-elevated)', padding: '12px', borderRadius: '10px' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>UPLOADING</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', fontWeight: 800, marginTop: '2px', color: status?.uploading ? 'var(--accent-blue)' : 'var(--text-primary)' }}>
                  {status?.uploading ? 'IN PROGRESS' : 'IDLE'}
                </div>
              </div>
            </div>

            {/* Endpoints */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
                  SUPABASE CLUSTER
                </label>
                <div style={{ background: 'var(--bg-surface-elevated)', padding: '10px 12px', borderRadius: '8px', fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
                  {isConfigured ? import.meta.env.VITE_SUPABASE_URL : 'Local SQLite Standalone Mode'}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
                  LOCAL DATABASE ENGINE
                </label>
                <div style={{ background: 'var(--bg-surface-elevated)', padding: '10px 12px', borderRadius: '8px', fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
                  Capacitor Native SQLite (Android SQLite3)
                </div>
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
