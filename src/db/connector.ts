import { UpdateType } from '@powersync/web';
import type { PowerSyncBackendConnector, PowerSyncCredentials } from '@powersync/web';
import { supabase } from './supabase';

export class SupabaseConnector implements PowerSyncBackendConnector {
  powersyncUrl: string;

  constructor() {
    this.powersyncUrl = import.meta.env.VITE_POWERSYNC_URL || '';
  }

  isConfigured(): boolean {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
    return Boolean(supabaseUrl && supabaseAnonKey && this.powersyncUrl);
  }

  async fetchCredentials(): Promise<PowerSyncCredentials | null> {
    if (!this.powersyncUrl) {
      return null;
    }

    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) {
        return null;
      }

      return {
        endpoint: this.powersyncUrl,
        token: session.access_token,
        expiresAt: session.expires_at ? new Date(session.expires_at * 1000) : undefined,
      };
    } catch (err) {
      console.warn('PowerSync fetchCredentials error:', err);
      return null;
    }
  }

  async uploadData(database: any): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      // Not logged in or no session, cannot upload to Supabase RLS-protected tables
      return;
    }

    const transactions = database.getCrudTransactions ? database.getCrudTransactions() : [];

    for await (const transaction of transactions) {
      try {
        for (const op of transaction.crud) {
          const table = op.table;
          const data = { ...op.opData, id: op.id };

          // Skip uploading public catalog exercises (they are read-only from the server)
          if (table === 'exercises' && (data.is_custom === 0 || data.user_id === null)) {
            continue;
          }

          // Automatically reassign offline/guest rows to the authenticated user on upload
          if (data.user_id === '00000000-0000-0000-0000-000000000001' || data.user_id === 'default_user') {
            data.user_id = session.user.id;
          }

          // Strip null timestamps to prevent Supabase NOT NULL constraint errors
          if (data.created_at === null) delete data.created_at;
          if (data.updated_at === null) delete data.updated_at;

          if (op.op === UpdateType.PATCH || op.op === 'PATCH') {
            // PATCH operations only contain changed columns. 
            // Using upsert would fail NOT NULL constraints for omitted columns, so we use update()
            const { error } = await supabase.from(table).update(data).eq('id', op.id);
            if (error) throw error;
          } else if (op.op === UpdateType.PUT || op.op === 'PUT') {
            // PUT operations contain the full row, so upsert is safe
            const { error } = await supabase.from(table).upsert(data);
            if (error) throw error;
          } else if (op.op === UpdateType.DELETE || op.op === 'DELETE') {
            const { error } = await supabase.from(table).delete().eq('id', op.id);
            if (error) throw error;
          }
        }
        await transaction.complete();
      } catch (ex: any) {
        console.error('Failed to sync transaction to Supabase:', ex);
        alert('Sync Error: ' + (ex.message || JSON.stringify(ex)));
        throw ex;
      }
    }
  }
}

export const connector = new SupabaseConnector();
