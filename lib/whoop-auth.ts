import { createClient } from '@supabase/supabase-js';
import { whoopAPI, type WhoopTokens } from './whoop';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface UserIntegration {
  id: string;
  user_id: string;
  provider: string;
  provider_user_id: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  connected_at: string;
  last_sync_at?: string;
  is_active: boolean;
}

export class WhoopAuthService {
  private supabase = createClient(supabaseUrl, supabaseServiceKey);
  private tableInitialized = false;

  private async ensureTableExists(): Promise<void> {
    if (this.tableInitialized) return;

    try {
      // Test if table exists by trying a simple query
      const { error } = await this.supabase
        .from('user_integrations')
        .select('id')
        .limit(1);

      if (!error) {
        this.tableInitialized = true;
        return;
      }

      console.log('user_integrations table does not exist, attempting to create...');
      
      // If error suggests table doesn't exist, try to create it
      if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
        // For now, just log the error - the table will need to be created manually
        console.error('user_integrations table needs to be created manually in Supabase dashboard');
      }
    } catch (error) {
      console.error('Error checking user_integrations table:', error);
    }
  }

  async saveUserTokens(
    userId: string, 
    tokens: WhoopTokens, 
    whoopUserId: string
  ): Promise<void> {
    await this.ensureTableExists();
    
    try {
      console.log('Saving Whoop tokens for user:', userId);
      console.log('Tokens object:', { 
        hasAccessToken: !!tokens.access_token,
        hasRefreshToken: !!tokens.refresh_token,
        expiresIn: tokens.expires_in 
      });
      // Calculate expiration time (default to 1 hour if not provided)
      const expiresIn = tokens.expires_in || 3600;
      const expiresAt = new Date(Date.now() + (expiresIn * 1000));

      // Deactivate any existing Whoop connections for this user
      await this.supabase
        .from('user_integrations')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('provider', 'whoop');

      // Insert new connection
      const { error } = await this.supabase
        .from('user_integrations')
        .insert({
          user_id: userId,
          provider: 'whoop',
          provider_user_id: whoopUserId,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: expiresAt.toISOString(),
          is_active: true
        });

      if (error) {
        console.error('Error saving Whoop tokens:', error);
        console.error('Full error details:', JSON.stringify(error, null, 2));
        throw new Error(`Failed to save Whoop connection: ${error.message}`);
      }
      
      console.log('Whoop tokens saved successfully to database');
    } catch (error) {
      console.error('Error in saveUserTokens:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      throw error;
    }
  }

  async getValidTokenForUser(userId: string): Promise<string | null> {
    try {
      // Get the active Whoop integration for this user
      const { data, error } = await this.supabase
        .from('user_integrations')
        .select('*')
        .eq('user_id', userId)
        .eq('provider', 'whoop')
        .eq('is_active', true)
        .single();

      if (error || !data) {
        return null;
      }

      const integration = data as UserIntegration;

      // Check if token is expired (with 5 minute buffer)
      const expirationTime = new Date(integration.token_expires_at);
      const now = new Date();
      const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds

      if (now.getTime() >= (expirationTime.getTime() - bufferTime)) {
        // Token is expired or about to expire, try to refresh
        try {
          console.log('Token expired, attempting refresh for user:', userId);
          const newTokens = await whoopAPI.refreshToken(integration.refresh_token);
          
          // Save the new tokens
          await this.saveUserTokens(userId, newTokens, integration.provider_user_id);
          
          return newTokens.access_token;
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
          // Refresh failed, mark as inactive
          await this.disconnectUser(userId);
          return null;
        }
      }

      // Token is still valid
      return integration.access_token;
    } catch (error) {
      console.error('Error in getValidTokenForUser:', error);
      return null;
    }
  }

  async disconnectUser(userId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('user_integrations')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('provider', 'whoop');

      if (error) {
        console.error('Error disconnecting user:', error);
      }
    } catch (error) {
      console.error('Error in disconnectUser:', error);
    }
  }

  async isUserConnected(userId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('user_integrations')
        .select('id')
        .eq('user_id', userId)
        .eq('provider', 'whoop')
        .eq('is_active', true)
        .single();

      return !error && !!data;
    } catch (error) {
      return false;
    }
  }

  async getConnectionInfo(userId: string): Promise<{
    connected: boolean;
    connectedAt?: string;
    lastSync?: string;
  }> {
    try {
      const { data, error } = await this.supabase
        .from('user_integrations')
        .select('connected_at, last_sync_at')
        .eq('user_id', userId)
        .eq('provider', 'whoop')
        .eq('is_active', true)
        .single();

      if (error || !data) {
        return { connected: false };
      }

      return {
        connected: true,
        connectedAt: data.connected_at,
        lastSync: data.last_sync_at
      };
    } catch (error) {
      return { connected: false };
    }
  }

  async updateLastSync(userId: string): Promise<void> {
    try {
      await this.supabase
        .from('user_integrations')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('provider', 'whoop')
        .eq('is_active', true);
    } catch (error) {
      console.error('Error updating last sync:', error);
    }
  }
}

export const whoopAuthService = new WhoopAuthService();