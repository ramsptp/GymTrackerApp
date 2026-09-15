import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../db/supabase';
import { powersync } from '../db/powersync';
import { Dumbbell, User as UserIcon, LogIn, UserPlus, AlertCircle, CheckCircle2 } from 'lucide-react';

export const LandingView: React.FC<{
  profileUsername: string | null;
}> = ({ profileUsername }) => {
  const { user, signIn, signUp } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showUsernameConfirm, setShowUsernameConfirm] = useState(false);

  // If user is authenticated, but hasn't set their username yet
  const isSettingUsername = user && !profileUsername;

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

  const confirmUsername = async () => {
    if (!user || !usernameInput.trim()) return;
    if (!navigator.onLine) {
      setErrorMsg('You must be online to set your username.');
      setShowUsernameConfirm(false);
      return;
    }
    
    setIsLoading(true);
    setErrorMsg(null);
    try {
      // Direct Supabase client call to avoid local-first race conditions
      const { error } = await supabase
        .from('profiles')
        .update({ username: usernameInput.trim() })
        .eq('id', user.id);
        
      if (error) {
        if (error.code === '23505') {
          setErrorMsg('This username is already taken. Please choose another.');
        } else {
          setErrorMsg('Failed to set username: ' + error.message);
        }
      } else {
        // Force atomic update locally to unlock the main app immediately
        await powersync.execute(
          `INSERT OR REPLACE INTO profiles (id, username, updated_at) VALUES (?, ?, ?)`,
          [user.id, usernameInput.trim(), new Date().toISOString()]
        );
        setSuccessMsg('Welcome to Gym Tracker!');
      }
    } catch (e) {
      console.error(e);
      setErrorMsg('An unexpected error occurred while setting username.');
    }
    setIsLoading(false);
    setShowUsernameConfirm(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', maxWidth: '488px', margin: '0 auto', padding: '24px 16px', justifyContent: 'center' }}>
      
      {/* Brand & Hero */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <div className="brand-icon" style={{ width: '72px', height: '72px', margin: '0 auto 20px auto', backgroundColor: 'var(--accent-green)', color: '#000' }}>
          <Dumbbell size={36} />
        </div>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.04em', color: 'var(--text-primary)', marginBottom: '12px' }}>
          Gym Tracker
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', lineHeight: 1.5, maxWidth: '85%', margin: '0 auto' }}>
          {isSettingUsername 
            ? "You're almost there! Choose your unique athlete tag to start logging workouts."
            : "The premium, local-first workout tracker. Sign in to seamlessly sync your gains."}
        </p>
      </div>

      <div className="card" style={{ padding: '24px' }}>
        {/* Alerts */}
        {errorMsg && (
          <div style={{ backgroundColor: 'rgba(244, 63, 94, 0.12)', border: '1px solid var(--accent-rose)', borderRadius: '10px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', color: 'var(--accent-rose)', fontSize: '0.9rem' }}>
            <AlertCircle size={20} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.12)', border: '1px solid var(--accent-green)', borderRadius: '10px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', color: 'var(--accent-green)', fontSize: '0.9rem' }}>
            <CheckCircle2 size={20} style={{ flexShrink: 0 }} />
            <span>{successMsg}</span>
          </div>
        )}

        {isSettingUsername ? (
          /* ==================== SET USERNAME FORM ==================== */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '12px', backgroundColor: 'var(--bg-surface-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-green)' }}>
                <UserIcon size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>Set Athlete Tag</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>This cannot be changed later</p>
              </div>
            </div>

            <div>
              <label htmlFor="username-input" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Username
              </label>
              <input
                id="username-input"
                type="text"
                placeholder="@athlete"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                disabled={isLoading}
                style={{ width: '100%', height: '54px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface-elevated)', color: 'var(--text-primary)', fontSize: '1.1rem', padding: '0 16px', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <button
              onClick={() => setShowUsernameConfirm(true)}
              disabled={isLoading || !usernameInput.trim()}
              className="btn btn-primary"
              style={{ height: '54px', minHeight: '54px', width: '100%', fontSize: '1.05rem', fontWeight: 600, marginTop: '8px' }}
            >
              Continue
            </button>
          </div>
        ) : (
          /* ==================== LOGIN/REGISTER FORM ==================== */
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '12px', backgroundColor: 'var(--bg-surface-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-green)' }}>
                <LogIn size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>Sign In / Register</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Secure Cloud Engine</p>
              </div>
            </div>

            <div>
              <label htmlFor="auth-email" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '8px' }}>Email Address</label>
              <input
                id="auth-email"
                type="email"
                required
                autoComplete="email"
                placeholder="athlete@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                style={{ width: '100%', height: '54px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface-elevated)', color: 'var(--text-primary)', fontSize: '1.05rem', padding: '0 16px', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label htmlFor="auth-password" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '8px' }}>Password</label>
              <input
                id="auth-password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                style={{ width: '100%', height: '54px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface-elevated)', color: 'var(--text-primary)', fontSize: '1.05rem', padding: '0 16px', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
              <button
                type="submit"
                disabled={isLoading}
                className="btn btn-primary"
                style={{ height: '54px', minHeight: '54px', width: '100%', fontSize: '1.05rem', fontWeight: 600 }}
              >
                <LogIn size={20} />
                <span>{isLoading ? 'Logging In...' : 'Log In'}</span>
              </button>

              <button
                type="button"
                disabled={isLoading}
                onClick={handleSignUp}
                className="btn"
                style={{ height: '54px', minHeight: '54px', width: '100%', backgroundColor: 'transparent', border: '1px solid var(--border-subtle)', color: 'var(--accent-blue)', fontSize: '1.05rem', fontWeight: 600 }}
              >
                <UserPlus size={20} />
                <span>{isLoading ? 'Creating Account...' : 'Sign Up'}</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Username Confirmation Modal */}
      {showUsernameConfirm && (
        <div className="modal-backdrop" style={{ zIndex: 200, alignItems: 'center' }}>
          <div className="modal-sheet" style={{ borderRadius: 'var(--radius-xl)', padding: '24px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '12px' }}>Confirm Username</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '1rem', lineHeight: 1.5 }}>
              Are you sure you want to set your username to <strong style={{ color: 'var(--text-primary)' }}>{usernameInput}</strong>? 
              This <strong style={{ color: 'var(--accent-rose)' }}>cannot be changed</strong> later.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setShowUsernameConfirm(false)} className="btn btn-secondary" style={{ flex: 1, height: '48px' }}>
                Cancel
              </button>
              <button onClick={confirmUsername} className="btn btn-primary" style={{ flex: 1, height: '48px' }} disabled={isLoading}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
