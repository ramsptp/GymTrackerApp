import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../db/supabase';
import { connectSync, disconnectAndClearData, migrateGuestDataToUser, powersync } from '../db/powersync';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null; data?: unknown }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchAndSyncProfile = async (userId: string) => {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
          
        if (profile) {
          await powersync.execute(
            `INSERT OR REPLACE INTO profiles (id, username, age, weight_kg, height_cm, updated_at) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              profile.id,
              profile.username || null,
              profile.age || null,
              profile.weight_kg || null,
              profile.height_cm || null,
              profile.updated_at || new Date().toISOString()
            ]
          );
        }
      } catch (e) {
        console.warn('Fallback profile fetch failed:', e);
      }
    };

    // Retrieve initial session from Supabase
    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      if (!isMounted) return;
      setSession(initialSession);
      setUser(initialSession?.user ?? null);

      if (initialSession?.user?.id) {
        await migrateGuestDataToUser(initialSession.user.id);
        await fetchAndSyncProfile(initialSession.user.id);
        await connectSync();
      }
      
      if (isMounted) setLoading(false);
    }).catch((err) => {
      console.warn('Error fetching Supabase session on mount:', err);
      if (isMounted) setLoading(false);
    });

    // Listen to real-time auth events (sign in, sign out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (!isMounted) return;

      if (event === 'SIGNED_IN') {
        setLoading(true);
      }

      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && currentSession?.user?.id) {
        // Atomically reassign offline/guest records to newly authenticated user before sync connects
        await migrateGuestDataToUser(currentSession.user.id);
        await fetchAndSyncProfile(currentSession.user.id);
        await connectSync();
      } else if (event === 'SIGNED_OUT') {
        await disconnectAndClearData();
      }

      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        if (isMounted) setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error && data.session?.user?.id) {
      await migrateGuestDataToUser(data.session.user.id);
      await connectSync();
    }
    return { error: error ? new Error(error.message) : null };
  };

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (!error && data.session?.user?.id) {
      await migrateGuestDataToUser(data.session.user.id);
      await connectSync();
    }
    return { data, error: error ? new Error(error.message) : null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    await disconnectAndClearData();
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
