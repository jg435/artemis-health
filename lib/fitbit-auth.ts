import { createClient } from '@supabase/supabase-js';
import { fitbitAPI, type FitbitTokens } from './fitbit-service';

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

export class FitbitAuthService {
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
        console.error('user_integrations table needs to be created manually in Supabase dashboard');
      }
    } catch (error) {
      console.error('Error checking user_integrations table:', error);
    }
  }

  async saveUserTokens(
    userId: string, 
    tokens: FitbitTokens, 
    fitbitUserId: string
  ): Promise<void> {
    await this.ensureTableExists();
    
    try {
      console.log('Saving Fitbit tokens for user:', userId);
      console.log('Tokens object:', { 
        hasAccessToken: !!tokens.access_token,
        hasRefreshToken: !!tokens.refresh_token,
        expiresIn: tokens.expires_in 
      });
      
      // Calculate expiration time (default to 8 hours if not provided)
      const expiresIn = tokens.expires_in || 28800; // Fitbit tokens typically last 8 hours
      const expiresAt = new Date(Date.now() + (expiresIn * 1000));

      // Deactivate any existing Fitbit connections for this user
      await this.supabase
        .from('user_integrations')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('provider', 'fitbit');

      // Insert new connection
      const { error } = await this.supabase
        .from('user_integrations')
        .insert({
          user_id: userId,
          provider: 'fitbit',
          provider_user_id: fitbitUserId,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: expiresAt.toISOString(),
          is_active: true
        });

      if (error) {
        console.error('Error saving Fitbit tokens:', error);
        console.error('Full error details:', JSON.stringify(error, null, 2));
        throw new Error(`Failed to save Fitbit connection: ${error.message}`);
      }
      
      console.log('Fitbit tokens saved successfully to database');
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
      // Get the active Fitbit integration for this user
      const { data, error } = await this.supabase
        .from('user_integrations')
        .select('*')
        .eq('user_id', userId)
        .eq('provider', 'fitbit')
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
          const newTokens = await fitbitAPI.refreshToken(integration.refresh_token);
          
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
      // Get the current integration to revoke the token
      const { data } = await this.supabase
        .from('user_integrations')
        .select('access_token')
        .eq('user_id', userId)
        .eq('provider', 'fitbit')
        .eq('is_active', true)
        .single();

      // Revoke the token with Fitbit
      if (data?.access_token) {
        try {
          await fitbitAPI.revokeToken(data.access_token);
        } catch (error) {
          console.error('Error revoking Fitbit token:', error);
          // Continue with database cleanup even if revocation fails
        }
      }

      // Mark as inactive in database
      const { error } = await this.supabase
        .from('user_integrations')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('provider', 'fitbit');

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
        .eq('provider', 'fitbit')
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
        .eq('provider', 'fitbit')
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
        .eq('provider', 'fitbit')
        .eq('is_active', true);
    } catch (error) {
      console.error('Error updating last sync:', error);
    }
  }

  async getUserIntegration(userId: string): Promise<UserIntegration | null> {
    try {
      const { data, error } = await this.supabase
        .from('user_integrations')
        .select('*')
        .eq('user_id', userId)
        .eq('provider', 'fitbit')
        .eq('is_active', true)
        .single();

      if (error || !data) {
        return null;
      }

      return data as UserIntegration;
    } catch (error) {
      console.error('Error getting user integration:', error);
      return null;
    }
  }

  /**
   * Get Fitbit user profile using stored tokens
   */
  async getUserProfile(userId: string) {
    try {
      const accessToken = await this.getValidTokenForUser(userId);
      if (!accessToken) {
        throw new Error('No valid Fitbit connection found');
      }

      return await fitbitAPI.getUserProfile(accessToken);
    } catch (error) {
      console.error('Error getting Fitbit user profile:', error);
      throw error;
    }
  }

  /**
   * Test the connection by making a simple API call
   */
  async testConnection(userId: string): Promise<boolean> {
    try {
      await this.getUserProfile(userId);
      return true;
    } catch (error) {
      console.error('Fitbit connection test failed:', error);
      return false;
    }
  }
}

export const fitbitAuthService = new FitbitAuthService();