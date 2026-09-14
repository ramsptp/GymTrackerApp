import { UpdateType } from '@powersync/web';
import type { PowerSyncBackendConnector, PowerSyncCredentials } from '@powersync/web';
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

export class SupabaseConnector implements PowerSyncBackendConnector {
  client: SupabaseClient | null = null;
  supabaseUrl: string;
  supabaseAnonKey: string;
  powersyncUrl: string;

  constructor() {
    this.supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    this.supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
    this.powersyncUrl = import.meta.env.VITE_POWERSYNC_URL || '';

    if (this.supabaseUrl && this.supabaseAnonKey) {
      this.client = createClient(this.supabaseUrl, this.supabaseAnonKey);
    }
  }

  isConfigured(): boolean {
    return Boolean(this.client && this.powersyncUrl);
  }

  async fetchCredentials(): Promise<PowerSyncCredentials | null> {
    if (!this.client || !this.powersyncUrl) {
      // Local standalone mode: PowerSync continues offline with local SQLite
      return null;
    }

    try {
      const { data: { session }, error } = await this.client.auth.getSession();
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
    if (!this.client) {
      return;
    }

    const transactions = database.getCrudTransactions ? database.getCrudTransactions() : [];

    for await (const transaction of transactions) {
      try {
        for (const op of transaction.crud) {
          const table = op.table;
          const data = { ...op.opData, id: op.id };

          if (op.op === UpdateType.PUT || op.op === UpdateType.PATCH || op.op === 'PUT' || op.op === 'PATCH') {
            const { error } = await this.client.from(table).upsert(data);
            if (error) throw error;
          } else if (op.op === UpdateType.DELETE || op.op === 'DELETE') {
            const { error } = await this.client.from(table).delete().eq('id', op.id);
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
