import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export class GarminAuthService {
  private supabase = createClient(supabaseUrl, supabaseServiceKey);

  async saveUserTokens(userId: string, tokens: any, userInfo?: any) {
    try {
      // Delete any existing Garmin integration for this user
      await this.supabase
        .from('user_integrations')
        .delete()
        .eq('user_id', userId)
        .eq('integration_type', 'garmin');

      // Insert new integration
      const { data, error } = await this.supabase
        .from('user_integrations')
        .insert({
          user_id: userId,
          integration_type: 'garmin',
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: tokens.expires_in 
            ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
            : null,
          integration_data: userInfo ? {
            userId: userInfo.userId,
            email: userInfo.email,
            displayName: userInfo.displayName
          } : null,
          connected_at: new Date().toISOString(),
          last_sync_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error saving Garmin tokens:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Failed to save Garmin user tokens:', error);
      throw error;
    }
  }

  async getValidTokenForUser(userId: string): Promise<string | null> {
    try {
      const { data, error } = await this.supabase
        .from('user_integrations')
        .select('*')
        .eq('user_id', userId)
        .eq('integration_type', 'garmin')
        .single();

      if (error || !data) {
        console.log('No Garmin integration found for user:', userId);
        return null;
      }

      // Check if token is expired
      if (data.token_expires_at) {
        const expiresAt = new Date(data.token_expires_at);
        const now = new Date();
        
        if (now >= expiresAt) {
          console.log('Garmin token expired, attempting refresh...');
          
          if (data.refresh_token) {
            try {
              const { garminAPI } = await import('./garmin');
              const newTokens = await garminAPI.refreshToken(data.refresh_token);
              
              // Update tokens in database
              await this.updateTokens(userId, newTokens);
              return newTokens.access_token;
            } catch (refreshError) {
              console.error('Failed to refresh Garmin token:', refreshError);
              // Delete invalid integration
              await this.disconnectUser(userId);
              return null;
            }
          } else {
            console.log('No refresh token available');
            await this.disconnectUser(userId);
            return null;
          }
        }
      }

      return data.access_token;
    } catch (error) {
      console.error('Error getting Garmin token:', error);
      return null;
    }
  }

  async updateTokens(userId: string, tokens: any) {
    try {
      const { error } = await this.supabase
        .from('user_integrations')
        .update({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: tokens.expires_in 
            ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
            : null,
          last_sync_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('integration_type', 'garmin');

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Failed to update Garmin tokens:', error);
      throw error;
    }
  }

  async updateLastSync(userId: string) {
    try {
      const { error } = await this.supabase
        .from('user_integrations')
        .update({
          last_sync_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('integration_type', 'garmin');

      if (error) {
        console.error('Error updating Garmin last sync:', error);
      }
    } catch (error) {
      console.error('Failed to update Garmin last sync:', error);
    }
  }

  async disconnectUser(userId: string) {
    try {
      const { error } = await this.supabase
        .from('user_integrations')
        .delete()
        .eq('user_id', userId)
        .eq('integration_type', 'garmin');

      if (error) {
        console.error('Error disconnecting Garmin user:', error);
        throw error;
      }

      console.log('Garmin user disconnected successfully');
    } catch (error) {
      console.error('Failed to disconnect Garmin user:', error);
      throw error;
    }
  }

  async getConnectionStatus(userId: string) {
    try {
      const { data, error } = await this.supabase
        .from('user_integrations')
        .select('connected_at, last_sync_at')
        .eq('user_id', userId)
        .eq('integration_type', 'garmin')
        .single();

      if (error || !data) {
        return {
          connected: false,
          connectedAt: null,
          lastSync: null
        };
      }

      return {
        connected: true,
        connectedAt: data.connected_at,
        lastSync: data.last_sync_at
      };
    } catch (error) {
      console.error('Error getting Garmin connection status:', error);
      return {
        connected: false,
        connectedAt: null,
        lastSync: null
      };
    }
  }
}

export const garminAuthService = new GarminAuthService();