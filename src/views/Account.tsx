import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useStatus } from '@powersync/react';
import {
  User as UserIcon,
  LogOut,
  LogIn,
  UserPlus,
  Database,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import { connectSync } from '../db/powersync';

export const AccountView: React.FC = () => {
  const { user, signIn, signUp, signOut } = useAuth();
  const status = useStatus();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSyncingManual, setIsSyncingManual] = useState(false);

  // Determine current synchronization state from PowerSync observer
  const isSyncing = status?.uploading || status?.downloading || status?.connecting || isSyncingManual;
  const isSynced = status?.connected && !status?.uploading && !status?.downloading;

  let badgeType: 'synced' | 'syncing' | 'offline';
  let badgeLabel: string;

  if (isSyncing) {
    badgeType = 'syncing';
    badgeLabel = 'Streaming Data...';
  } else if (isSynced) {
    badgeType = 'synced';
    badgeLabel = 'Connected & Synced';
  } else {
    badgeType = 'offline';
    badgeLabel = 'Local SQLite Active';
  }

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      const { error } = await signIn(email.trim(), password);
      if (error) {
        setErrorMsg(error.message);
      } else {
        setSuccessMsg('Successfully logged in!');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during login.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      const { error, data } = await signUp(email.trim(), password);
      if (error) {
        setErrorMsg(error.message);
      } else {
        if ((data as any)?.session) {
          setSuccessMsg('Account created and logged in!');
        } else {
          setSuccessMsg('Account registered! Please check your email to confirm registration.');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during registration.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSync = async () => {
    setIsSyncingManual(true);
    await connectSync();
    setTimeout(() => {
      setIsSyncingManual(false);
    }, 1200);
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await signOut();
    } catch (err: any) {
      console.error('Sign out error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '488px', margin: '0 auto' }}>
      {/* View Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>
          Account
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
          {user ? 'Cloud sync and device telemetry active' : 'Log in to securely sync your gym records to the cloud'}
        </p>
      </div>

      {/* ========================================================================= */}
      {/* LOGGED IN VIEW                                                           */}
      {/* ========================================================================= */}
      {user ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* User Profile Card */}
          <div className="card" style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '16px',
                  backgroundColor: 'var(--accent-blue)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '1.4rem',
                  flexShrink: 0,
                }}
              >
                {user.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div style={{ overflow: 'hidden', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                    {user.email}
                  </div>
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--accent-green)', fontWeight: 700 }}>
                  <ShieldCheck size={14} />
                  <span>Authenticated & RLS Secured</span>
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>User ID (UUID)</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px', wordBreak: 'break-all' }}>
                {user.id}
              </div>
            </div>
          </div>

          {/* Red-outlined Massive Sign Out Button (56px Touch Target) */}
          <button
            onClick={handleSignOut}
            disabled={isLoading}
            className="btn"
            id="btn-sign-out"
            style={{
              height: '52px',
              minHeight: '52px',
              width: '100%',
              backgroundColor: 'transparent',
              border: '1px solid var(--border-subtle)',
              color: 'var(--accent-rose)',
              fontSize: '1rem',
              fontWeight: 600,
              gap: '10px',
            }}
          >
            <LogOut size={20} />
            <span>{isLoading ? 'Signing Out...' : 'Sign Out'}</span>
          </button>

          {/* Embedded PowerSync Telemetry Details */}
          <div className="card" style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Database size={20} color="var(--accent-blue)" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>PowerSync Telemetry</h3>
              </div>
              <button
                onClick={handleManualSync}
                className="btn btn-secondary"
                id="btn-manual-sync"
                style={{
                  minHeight: '38px',
                  height: '38px',
                  padding: '0 14px',
                  fontSize: '0.8rem',
                  gap: '6px',
                }}
              >
                <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                <span>Sync Now</span>
              </button>
            </div>

            {/* Current Real-time Status */}
            <div
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                padding: '14px 16px',
                borderRadius: '12px',
                marginBottom: '14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span className={`status-dot ${badgeType}`} />
                <strong style={{ fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {badgeLabel}
                </strong>
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {badgeType === 'synced'
                  ? 'All local SQLite transactions are verified and synced with Supabase Postgres.'
                  : badgeType === 'syncing'
                  ? 'Replicating data streams between Native SQLite and the PowerSync sync service.'
                  : 'Operating locally on Native SQLite. Unsynced mutations will push when reconnected.'}
              </p>
            </div>

            {/* Status Metrics Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
              <div style={{ background: 'var(--bg-surface-elevated)', padding: '12px', borderRadius: '10px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Sync Connected</div>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '1rem',
                    fontWeight: 600,
                    marginTop: '2px',
                    color: status?.connected ? 'var(--accent-green)' : 'var(--accent-amber)',
                  }}
                >
                  {status?.connected ? 'TRUE' : 'FALSE'}
                </div>
              </div>

              <div style={{ background: 'var(--bg-surface-elevated)', padding: '12px', borderRadius: '10px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Upload Queue</div>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '1rem',
                    fontWeight: 600,
                    marginTop: '2px',
                    color: status?.uploading ? 'var(--accent-blue)' : 'var(--text-primary)',
                  }}
                >
                  {status?.uploading ? 'UPLOADING' : 'IDLE'}
                </div>
              </div>
            </div>

            {/* Clusters & Engines */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Supabase Postgres Cluster
                </label>
                <div
                  style={{
                    background: 'var(--bg-surface-elevated)',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.78rem',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-subtle)',
                    wordBreak: 'break-all',
                  }}
                >
                  {import.meta.env.VITE_SUPABASE_URL || 'Not configured'}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  PowerSync Sync Service
                </label>
                <div
                  style={{
                    background: 'var(--bg-surface-elevated)',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.78rem',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-subtle)',
                    wordBreak: 'break-all',
                  }}
                >
                  {import.meta.env.VITE_POWERSYNC_URL || 'Not configured'}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Offline Local Engine
                </label>
                <div
                  style={{
                    background: 'var(--bg-surface-elevated)',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.78rem',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  Capacitor Native SQLite (Android SQLite3)
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* LOGGED OUT VIEW                                                          */
        /* ========================================================================= */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Form Card */}
          <div className="card" style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--bg-surface-elevated)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-green)',
                }}
              >
                <UserIcon size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Sign In / Register
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Supabase RLS & Cloud Sync Engine
                </p>
              </div>
            </div>

            {/* Error & Success Messages */}
            {errorMsg && (
              <div
                style={{
                  backgroundColor: 'rgba(244, 63, 94, 0.12)',
                  border: '1px solid var(--accent-rose)',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '16px',
                  color: 'var(--accent-rose)',
                  fontSize: '0.85rem',
                }}
              >
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div
                style={{
                  backgroundColor: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid var(--accent-green)',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '16px',
                  color: 'var(--accent-green)',
                  fontSize: '0.85rem',
                }}
              >
                <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Email Input (56px High) */}
              <div>
                <label
                  htmlFor="auth-email"
                  style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px' }}
                >
                  Email Address
                </label>
                <input
                  id="auth-email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="athlete@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: '100%',
                    height: '52px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--bg-surface-elevated)',
                    color: 'var(--text-primary)',
                    fontSize: '1rem',
                    padding: '0 16px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    fontFamily: 'var(--font-sans)',
                  }}
                />
              </div>

              {/* Password Input (56px High) */}
              <div>
                <label
                  htmlFor="auth-password"
                  style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px' }}
                >
                  Password
                </label>
                <input
                  id="auth-password"
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    height: '52px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--bg-surface-elevated)',
                    color: 'var(--text-primary)',
                    fontSize: '1rem',
                    padding: '0 16px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    fontFamily: 'var(--font-sans)',
                  }}
                />
              </div>

              {/* Action Buttons: Massive 56px Green Primary + Outlined 56px Sign Up */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn btn-primary"
                  id="btn-login"
                  style={{
                    height: '52px',
                    minHeight: '52px',
                    width: '100%',
                    fontSize: '1rem',
                    fontWeight: 600,
                  }}
                >
                  <LogIn size={20} />
                  <span>{isLoading ? 'Logging In...' : 'Log In'}</span>
                </button>

                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handleSignUp}
                  className="btn"
                  id="btn-signup"
                  style={{
                    height: '52px',
                    minHeight: '52px',
                    width: '100%',
                    backgroundColor: 'transparent',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--accent-blue)',
                    fontSize: '1rem',
                    fontWeight: 600,
                  }}
                >
                  <UserPlus size={20} />
                  <span>{isLoading ? 'Creating Account...' : 'Sign Up'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Standby Engine Status Card */}
          <div className="card" style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span className="status-dot offline" />
              <strong style={{ fontSize: '0.88rem', color: 'var(--accent-amber)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Offline Engine Active
              </strong>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              You can log workouts, create Snippets, and view history completely offline without an account.
              Signing in connects PowerSync to replicate your gym history across all your devices securely.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
