import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useStatus, useQuery } from '@powersync/react';
import {
  LogOut,
  Database,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Save,
  Users,
  Search,
  UserPlus,
  UserCheck,
  UserX
} from 'lucide-react';
import { connectSync, powersync } from '../db/powersync';
import { supabase } from '../db/supabase';
import { v4 as uuidv4 } from 'uuid';

export const ProfileView: React.FC = () => {
  const { user, signOut } = useAuth();
  const status = useStatus();

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSyncingManual, setIsSyncingManual] = useState(false);

  // Profile Form State
  const { data: profileData } = useQuery('SELECT * FROM profiles WHERE id = ?', [user?.id || '']);
  const profile = profileData?.[0];
  const [ageInput, setAgeInput] = useState('');
  const [weightInput, setWeightInput] = useState('');
  const [heightInput, setHeightInput] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      if (profile.age && !ageInput) setAgeInput(profile.age.toString());
      if (profile.weight_kg && !weightInput) setWeightInput(profile.weight_kg.toString());
      if (profile.height_cm && !heightInput) setHeightInput(profile.height_cm.toString());
    }
  }, [profile]);

  // Friends System State
  const [friendSearchInput, setFriendSearchInput] = useState('');
  const [friendSearchResult, setFriendSearchResult] = useState<{ id: string; username: string } | null>(null);
  const [friendSearchLoading, setFriendSearchLoading] = useState(false);
  const [friendSearchError, setFriendSearchError] = useState<string | null>(null);

  const { data: pendingRequests } = useQuery(
    `SELECT f.*, p.username 
     FROM friendships f 
     JOIN profiles p ON f.requester_id = p.id 
     WHERE f.addressee_id = ? AND f.status = 'pending'`, 
    [user?.id || '']
  );

  const { data: friendsList } = useQuery(
    `SELECT f.*, p.username, p.id as friend_id
     FROM friendships f 
     JOIN profiles p ON (f.requester_id = p.id OR f.addressee_id = p.id) 
     WHERE (f.requester_id = ? OR f.addressee_id = ?) 
     AND f.status = 'accepted' 
     AND p.id != ?`, 
    [user?.id || '', user?.id || '', user?.id || '']
  );

  const handleSearchFriend = async () => {
    if (!friendSearchInput.trim() || !user) return;
    setFriendSearchLoading(true);
    setFriendSearchError(null);
    setFriendSearchResult(null);
    try {
      // Strip any @ they might have typed by habit
      let cleanSearch = friendSearchInput.trim();
      if (cleanSearch.startsWith('@')) {
        cleanSearch = cleanSearch.substring(1);
      }
      
      // Also strip @ from the current user's profile just in case
      let myCleanUsername = profile?.username || '';
      if (myCleanUsername.startsWith('@')) {
        myCleanUsername = myCleanUsername.substring(1);
      }
      
      if (cleanSearch.toLowerCase() === myCleanUsername.toLowerCase()) {
        setFriendSearchError("You cannot add yourself.");
        return;
      }

      // Case-insensitive exact match query
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username')
        .ilike('username', cleanSearch)
        .limit(1)
        .maybeSingle();
        
      if (error || !data) {
        setFriendSearchError("User not found.");
      } else {
        setFriendSearchResult(data);
      }
    } catch (e) {
      setFriendSearchError("Error searching user.");
    } finally {
      setFriendSearchLoading(false);
    }
  };

  const handleSendFriendRequest = async () => {
    if (!user || !friendSearchResult) return;
    try {
      await powersync.execute(
        `INSERT OR REPLACE INTO friendships (id, requester_id, addressee_id, status, created_at) 
         VALUES (?, ?, ?, 'pending', ?)`,
        [uuidv4(), user.id, friendSearchResult.id, new Date().toISOString()]
      );
      setSuccessMsg(`Friend request sent to ${friendSearchResult.username}!`);
      setTimeout(() => setSuccessMsg(null), 3000);
      setFriendSearchResult(null);
      setFriendSearchInput('');
    } catch (e) {
      setErrorMsg("Failed to send request.");
      setTimeout(() => setErrorMsg(null), 3000);
    }
  };

  const handleAcceptRequest = async (friendshipId: string) => {
    try {
      await powersync.execute(
        `UPDATE friendships SET status = 'accepted' WHERE id = ?`,
        [friendshipId]
      );
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeclineRequest = async (friendshipId: string) => {
    try {
      await powersync.execute(
        `UPDATE friendships SET status = 'declined' WHERE id = ?`,
        [friendshipId]
      );
    } catch (e) {
      console.error(e);
    }
  };

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

  const saveProfileStats = async () => {
    if (!user) return;
    setProfileSaving(true);
    try {
      await powersync.execute(
        `UPDATE profiles SET age = ?, weight_kg = ?, height_cm = ?, updated_at = ? WHERE id = ?`,
        [
          ageInput ? parseInt(ageInput) : null,
          weightInput ? parseFloat(weightInput) : null,
          heightInput ? parseFloat(heightInput) : null,
          new Date().toISOString(),
          user.id
        ]
      );
      setSuccessMsg('Profile stats saved locally (syncs automatically).');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (e) {
      console.error('Save profile error', e);
      setErrorMsg('Failed to save profile stats.');
    }
    setProfileSaving(false);
  };

  // If somehow the user is not loaded (should be handled by App.tsx), return null
  if (!user) return null;

  return (
    <div style={{ maxWidth: '488px', margin: '0 auto' }}>
      {/* View Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>
          Profile{profile?.username ? ` - ${profile.username}` : ''}
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
          Cloud sync and device telemetry active
        </p>
      </div>

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

        {/* Profile Details Form */}
        <div className="card" style={{ marginBottom: 0 }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>Profile Details</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Username (Athlete Tag)
              </label>
              <input
                type="text"
                value={profile?.username || ''}
                disabled={true}
                style={{
                  width: '100%',
                  height: '44px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-muted)',
                  fontSize: '1rem',
                  padding: '0 16px',
                  outline: 'none',
                  cursor: 'not-allowed',
                  opacity: 0.6,
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Age
                </label>
                <input
                  type="number"
                  placeholder="25"
                  value={ageInput}
                  onChange={(e) => setAgeInput(e.target.value)}
                  style={{
                    width: '100%',
                    height: '44px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--bg-surface-elevated)',
                    color: 'var(--text-primary)',
                    fontSize: '1rem',
                    padding: '0 12px',
                    outline: 'none'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Weight (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="75.5"
                  value={weightInput}
                  onChange={(e) => setWeightInput(e.target.value)}
                  style={{
                    width: '100%',
                    height: '44px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--bg-surface-elevated)',
                    color: 'var(--text-primary)',
                    fontSize: '1rem',
                    padding: '0 12px',
                    outline: 'none'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Height (cm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="180"
                  value={heightInput}
                  onChange={(e) => setHeightInput(e.target.value)}
                  style={{
                    width: '100%',
                    height: '44px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--bg-surface-elevated)',
                    color: 'var(--text-primary)',
                    fontSize: '1rem',
                    padding: '0 12px',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <button
              onClick={saveProfileStats}
              disabled={profileSaving}
              className="btn btn-secondary"
              style={{ width: '100%', height: '44px', minHeight: '44px', marginTop: '4px' }}
            >
              <Save size={18} />
              Save Stats
            </button>
          </div>
        </div>

        {/* Friends Management Section */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Users size={20} color="var(--accent-blue)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Friends</h3>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <input
              type="text"
              placeholder="Search by username..."
              value={friendSearchInput}
              onChange={(e) => setFriendSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchFriend()}
              style={{
                flex: 1,
                height: '44px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-surface-elevated)',
                color: 'var(--text-primary)',
                padding: '0 12px',
                outline: 'none'
              }}
            />
            <button 
              className="btn btn-secondary" 
              onClick={handleSearchFriend}
              disabled={friendSearchLoading}
              style={{ minHeight: '44px', height: '44px', padding: '0 16px' }}
            >
              <Search size={18} />
            </button>
          </div>

          {friendSearchError && (
            <p style={{ color: 'var(--accent-rose)', fontSize: '0.85rem', marginTop: '-8px', marginBottom: '12px' }}>
              {friendSearchError}
            </p>
          )}

          {friendSearchResult && (
            <div style={{ 
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
              padding: '12px', backgroundColor: 'var(--bg-surface-elevated)', 
              borderRadius: '8px', marginBottom: '16px', border: '1px solid var(--border-subtle)' 
            }}>
              <div style={{ fontWeight: 600 }}>{friendSearchResult.username}</div>
              <button 
                className="btn btn-primary" 
                onClick={handleSendFriendRequest}
                style={{ minHeight: '36px', height: '36px', padding: '0 12px', fontSize: '0.85rem' }}
              >
                <UserPlus size={16} /> Add Friend
              </button>
            </div>
          )}

          {pendingRequests && pendingRequests.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Pending Requests</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {pendingRequests.map(req => (
                  <div key={req.id} style={{ 
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                    padding: '12px', backgroundColor: 'var(--bg-surface-elevated)', borderRadius: '8px' 
                  }}>
                    <div style={{ fontWeight: 600 }}>{req.username}</div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        className="btn btn-primary" 
                        onClick={() => handleAcceptRequest(req.id)}
                        style={{ minHeight: '32px', height: '32px', padding: '0 10px' }}
                      >
                        <UserCheck size={16} />
                      </button>
                      <button 
                        className="btn btn-secondary" 
                        onClick={() => handleDeclineRequest(req.id)}
                        style={{ minHeight: '32px', height: '32px', padding: '0 10px', color: 'var(--accent-rose)' }}
                      >
                        <UserX size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>My Friends</h4>
            {friendsList && friendsList.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {friendsList.map(friend => (
                  <div key={friend.id} style={{ 
                    display: 'flex', alignItems: 'center', 
                    padding: '12px', backgroundColor: 'var(--bg-surface-elevated)', borderRadius: '8px' 
                  }}>
                    <div style={{ fontWeight: 600 }}>{friend.username}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No friends added yet.</p>
            )}
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

        {/* Success / Error Messages for Profile */}
        {errorMsg && (
          <div style={{ backgroundColor: 'rgba(244, 63, 94, 0.12)', border: '1px solid var(--accent-rose)', borderRadius: '10px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent-rose)', fontSize: '0.85rem' }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.12)', border: '1px solid var(--accent-green)', borderRadius: '10px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent-green)', fontSize: '0.85rem' }}>
            <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
            <span>{successMsg}</span>
          </div>
        )}

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
    </div>
  );
};
