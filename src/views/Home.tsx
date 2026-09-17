import React, { useState, useEffect } from 'react';
import { Play, Plus, Layers, Bolt, MoreVertical, Edit3, Trash2, ChevronDown } from 'lucide-react';
import { powersync, deleteSnippet } from '../db/powersync';
import type { SnippetRecord, WorkoutRecord, SetRecord } from '../db/schema';
import { useAuth } from '../context/AuthContext';
import { useQuery } from '@powersync/react';
import { Check, X } from 'lucide-react';

interface HomeViewProps {
  onStartSnippetWorkout: (snippet: SnippetRecord, partnerId?: string) => void;
  onStartFreestyleWorkout: (partnerId?: string) => void;
  onNavigateToBuilder: (snippetId?: string) => void;
}

const UserAvatar = ({ profile, color, fallbackLetter }: { profile: any, color: string, fallbackLetter: string }) => {
  if (profile?.avatar_url) {
    return (
      <img 
        src={profile.avatar_url} 
        alt="avatar" 
        style={{ width: 24, height: 24, minWidth: 24, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${color}` }} 
      />
    );
  }
  return (
    <div style={{ width: 24, height: 24, minWidth: 24, borderRadius: '50%', backgroundColor: color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '10px', fontWeight: 'bold' }}>
      {fallbackLetter}
    </div>
  );
};

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
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>('');
  const [isPartnerDropdownOpen, setIsPartnerDropdownOpen] = useState(false);

  const { user } = useAuth();
  const { data: profileData } = useQuery('SELECT username FROM profiles WHERE id = ?', [user?.id || '']);
  const profile = profileData?.[0];

  const { data: friendsList } = useQuery(
    `SELECT f.*, p.username, p.id as friend_id, p.avatar_url
     FROM friendships f 
     JOIN profiles p ON (f.requester_id = p.id OR f.addressee_id = p.id) 
     WHERE (f.requester_id = ? OR f.addressee_id = ?) 
     AND f.status = 'accepted' 
     AND p.id != ?`, 
    [user?.id || '', user?.id || '', user?.id || '']
  );

  const { data: pendingInvitations } = useQuery(
    `SELECT wp.id as invite_id, wp.workout_id, w.start_time, p.username as owner_username
     FROM workout_participants wp
     JOIN workouts w ON wp.workout_id = w.id
     JOIN workout_participants owner_wp ON wp.workout_id = owner_wp.workout_id AND owner_wp.role = 'owner'
     JOIN profiles p ON owner_wp.user_id = p.id
     WHERE wp.user_id = ? AND wp.status = 'pending'`,
    [user?.id || '']
  );

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
        `SELECT count(*) as count 
         FROM workouts w 
         WHERE w.end_time IS NOT NULL AND w.start_time >= ?
         AND (
           w.user_id = ? OR 
           EXISTS (SELECT 1 FROM workout_participants wp WHERE wp.workout_id = w.id AND wp.user_id = ? AND wp.status = 'confirmed')
         )`,
        [oneWeekAgo, user?.id || '', user?.id || '']
      );
      setWeeklyCount(weekWorkouts[0]?.count || 0);

      const monthWorkouts = await powersync.getAll<WorkoutRecord>(
        `SELECT id 
         FROM workouts w 
         WHERE w.end_time IS NOT NULL AND w.start_time >= ?
         AND (
           w.user_id = ? OR 
           EXISTS (SELECT 1 FROM workout_participants wp WHERE wp.workout_id = w.id AND wp.user_id = ? AND wp.status = 'confirmed')
         )`,
        [oneMonthAgo, user?.id || '', user?.id || '']
      );
      setMonthlySessions(monthWorkouts.length);

      // Calculate total volume for the month
      let totalVol = 0;
      for (const w of monthWorkouts) {
        const sets = await powersync.getAll<SetRecord>(
          "SELECT weight, reps FROM sets WHERE workout_id = ? AND set_type != 'Warmup' AND user_id = ?",
          [w.id, user?.id || '']
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
    if (confirm('Delete this workout routine?')) {
      setSnippets((prev) => prev.filter(s => s.id !== id));
      await deleteSnippet(id);
      loadData();
    }
  };

  const handleAcceptInvite = async (inviteId: string) => {
    try {
      await powersync.execute(`UPDATE workout_participants SET status = 'confirmed' WHERE id = ?`, [inviteId]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeclineInvite = async (inviteId: string) => {
    try {
      await powersync.execute(`UPDATE workout_participants SET status = 'declined' WHERE id = ?`, [inviteId]);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} onClick={() => setOpenMenuId(null)}>
      {/* Pending Workout Invitations Banner */}
      {pendingInvitations && pendingInvitations.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {pendingInvitations.map((inv) => (
            <div key={inv.invite_id} style={{
              backgroundColor: 'rgba(59, 130, 246, 0.15)',
              border: '1px solid var(--accent-blue)',
              borderRadius: '12px',
              padding: '16px',
            }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                Shared Workout Invite
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                <strong>{inv.owner_username}</strong> tagged you in a workout on {new Date(inv.start_time).toLocaleDateString()}.
              </p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  className="btn btn-primary"
                  style={{ flex: 1, minHeight: '38px', height: '38px', fontSize: '0.85rem' }}
                  onClick={() => handleAcceptInvite(inv.invite_id)}
                >
                  <Check size={16} /> Accept
                </button>
                <button
                  className="btn btn-secondary"
                  style={{ flex: 1, minHeight: '38px', height: '38px', fontSize: '0.85rem', color: 'var(--accent-rose)' }}
                  onClick={() => handleDeclineInvite(inv.invite_id)}
                >
                  <X size={16} /> Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

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
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-green)' }}>
            {weeklyCount} {weeklyCount === 1 ? 'Workout' : 'Workouts'} This Week
          </span>
        </div>
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            backgroundColor: 'var(--bg-surface-elevated)',
            color: 'var(--text-secondary)',
            padding: '4px 10px',
            borderRadius: '12px',
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
          borderRadius: '16px',
          padding: '24px 20px',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Ready to Train{profile?.username ? `, ${profile.username}` : ''}?
            </h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
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
            style={{ minHeight: '52px', height: '52px', fontSize: '1rem', fontWeight: 600 }}
            onClick={() => onStartFreestyleWorkout(selectedPartnerId || undefined)}
            id="btn-empty-workout"
          >
            <Plus size={22} strokeWidth={3} />
            <span>Start Empty Workout</span>
          </button>

          {/* Workout Partner Selector */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setIsPartnerDropdownOpen(!isPartnerDropdownOpen)}
              style={{
                width: '100%',
                height: '52px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-surface-elevated)',
                color: 'var(--text-primary)',
                padding: '0 16px',
                outline: 'none',
                fontSize: '1rem',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {selectedPartnerId ? (
                  <>
                    <UserAvatar 
                      profile={friendsList?.find(f => f.friend_id === selectedPartnerId)} 
                      color="#8b5cf6" 
                      fallbackLetter={friendsList?.find(f => f.friend_id === selectedPartnerId)?.username?.substring(0, 2).toUpperCase() || 'P'} 
                    />
                    <span>{friendsList?.find(f => f.friend_id === selectedPartnerId)?.username}</span>
                  </>
                ) : (
                  <>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                      👤
                    </div>
                    <span>Select a friend to work out with</span>
                  </>
                )}
              </div>
              <ChevronDown size={20} color="var(--text-secondary)" />
            </button>

            {isPartnerDropdownOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '56px',
                  left: 0,
                  right: 0,
                  backgroundColor: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                  padding: '6px',
                  boxShadow: '0 12px 28px rgba(0, 0, 0, 0.6)',
                  zIndex: 50,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <button
                  onClick={() => { setSelectedPartnerId(''); setIsPartnerDropdownOpen(false); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px 14px',
                    background: selectedPartnerId === '' ? 'var(--bg-surface)' : 'none',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                  }}
                >
                  <div style={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    👤
                  </div>
                  <span>Solo Workout</span>
                </button>

                {friendsList?.map((f) => (
                  <button
                    key={f.friend_id}
                    onClick={() => { setSelectedPartnerId(f.friend_id); setIsPartnerDropdownOpen(false); }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '12px 14px',
                      background: selectedPartnerId === f.friend_id ? 'var(--bg-surface)' : 'none',
                      border: 'none',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'left',
                      width: '100%',
                    }}
                  >
                    <UserAvatar 
                      profile={f} 
                      color="#8b5cf6" 
                      fallbackLetter={f.username?.substring(0, 2).toUpperCase() || 'P'} 
                    />
                    <span>{f.username}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
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
          <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
            Monthly Output
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '2px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.3rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {monthlySessions}
            </span>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>sessions</span>
          </div>
        </div>

        <div style={{ width: '1px', height: '36px', backgroundColor: 'var(--border-subtle)' }} />

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
            Volume Load
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '2px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.3rem', fontWeight: 600, color: 'var(--accent-green)' }}>
              {monthlyVolume.toLocaleString()}
            </span>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>kg</span>
          </div>
        </div>
      </div>

      {/* My Routines Section */}
      <div id="my-snippets-section" style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              My Routines
            </h3>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, background: 'var(--bg-surface-elevated)', color: 'var(--text-secondary)', padding: '2px 8px', borderRadius: '10px' }}>
              {snippets.length}
            </span>
          </div>

          {/* + NEW ROUTINE button navigating directly to /snippet-builder */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNavigateToBuilder();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'var(--bg-surface-elevated)',
              border: 'none',
              color: 'var(--accent-blue)',
              fontSize: '0.85rem',
              fontWeight: 500,
              cursor: 'pointer',
              padding: '6px 12px',
              borderRadius: '8px',
              minHeight: '36px',
            }}
            id="btn-new-snippet-header"
          >
            <Plus size={16} strokeWidth={3} />
            <span>+ New Routine</span>
          </button>
        </div>

        {/* Routines Stack */}
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
                <h4 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {snippet.name}
                </h4>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  Routine ID: {snippet.id.slice(0, 8)}...
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
                    title="Routine options"
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
                        <span>Edit Routine</span>
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
                        <span>Delete Routine</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* 1-Tap Start Workout */}
                <button
                  className="btn btn-primary"
                  style={{ minHeight: '44px', height: '44px', padding: '0 16px', fontSize: '0.9rem', fontWeight: 600, borderRadius: '12px' }}
                  onClick={() => onStartSnippetWorkout(snippet, selectedPartnerId || undefined)}
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
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>No routines saved yet.</p>
              <button
                className="btn btn-primary"
                style={{ marginTop: '12px', minHeight: '48px' }}
                onClick={() => onNavigateToBuilder()}
              >
                + Create First Routine
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomeView;
