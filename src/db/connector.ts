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

          if (op.op === UpdateType.PUT || op.op === UpdateType.PATCH || op.op === 'PUT' || op.op === 'PATCH') {
            const { error } = await supabase.from(table).upsert(data);
            if (error) throw error;
          } else if (op.op === UpdateType.DELETE || op.op === 'DELETE') {
            const { error } = await supabase.from(table).delete().eq('id', op.id);
            if (error) throw error;
          }
        }
        await transaction.complete();
      } catch (ex) {
        console.error('Failed to sync transaction to Supabase:', ex);
        throw ex;
      }
    }
  }
}

export const connector = new SupabaseConnector();
