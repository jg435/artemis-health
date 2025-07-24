import { NextRequest, NextResponse } from 'next/server';
import { whoopAPI } from '@/lib/whoop';
import { AuthService } from '@/lib/auth';
import { whoopAuthService } from '@/lib/whoop-auth';
import { WearableDataSyncService } from '@/lib/wearable-sync';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // Get the authenticated user
    const authService = new AuthService();
    const userSession = request.cookies.get('user_session')?.value;
    
    if (!userSession) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const user = await authService.getUser(userSession);
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      );
    }

    // Determine effective user ID (client if trainer is viewing, otherwise authenticated user)
    const viewingClientId = request.headers.get('x-viewing-client-id')
    let effectiveUserId = user.id
    let isTrainerViewing = false

    if (user.user_type === 'trainer' && viewingClientId) {
      // Verify trainer has permission to view this client
      const { data: relationship } = await supabase
        .from('trainer_clients')
        .select('id')
        .eq('trainer_id', user.id)
        .eq('client_id', viewingClientId)
        .eq('is_active', true)
        .single()

      if (relationship) {
        effectiveUserId = viewingClientId
        isTrainerViewing = true
      } else {
        return NextResponse.json(
          { error: 'No permission to view this client\'s data' },
          { status: 403 }
        );
      }
    }

    const syncService = new WearableDataSyncService()

    if (isTrainerViewing) {
      // TRAINER MODE: Pull data from Supabase only
      const searchParams = request.nextUrl.searchParams;
      const days = parseInt(searchParams.get('days') || '30');
      
      const storedData = await syncService.getStoredSleepData(effectiveUserId, days)
      
      // Transform stored data to match Whoop API format
      const sleep = {
        records: storedData
          .filter(d => d.provider === 'whoop')
          .map(d => ({
            id: `stored_${d.id}`,
            start: d.sleep_start,
            end: d.sleep_end,
            created_at: d.data_date,
            updated_at: d.synced_at,
            score: {
              stage_summary: {
                total_in_bed_time_milli: (d.total_sleep_duration || 0) * 60000,
                total_slow_wave_sleep_time_milli: (d.deep_sleep_duration || 0) * 60000,
                total_rem_sleep_time_milli: (d.rem_sleep_duration || 0) * 60000,
                total_light_sleep_time_milli: (d.light_sleep_duration || 0) * 60000,
                total_awake_time_milli: (d.awake_duration || 0) * 60000
              },
              sleep_performance_percentage: d.sleep_efficiency,
              sleep_consistency_percentage: d.sleep_score
            },
            // Include original raw data if available
            ...d.raw_data
          })),
        next_token: null
      }
      
      return NextResponse.json(sleep);
    } else {
      // CLIENT MODE: Sync fresh data from Whoop API and store in Supabase
      let whoopAccessToken = await whoopAuthService.getValidTokenForUser(effectiveUserId);
      
      if (!whoopAccessToken) {
        // Fallback to cookie (for immediate post-auth requests)
        whoopAccessToken = request.cookies.get('whoop_access_token')?.value;
      }

      if (!whoopAccessToken) {
        return NextResponse.json(
          { error: 'Whoop not connected' },
          { status: 401 }
        );
      }

      const searchParams = request.nextUrl.searchParams;
      const start = searchParams.get('start') || undefined;
      const end = searchParams.get('end') || undefined;
      const limit = parseInt(searchParams.get('limit') || '25');

      // Get fresh data from Whoop API
      const sleep = await whoopAPI.getSleep(whoopAccessToken, start, end, limit);
      
      // Sync sleep data to Supabase in background (don't wait)
      syncService.syncAllDataForUser(effectiveUserId).catch(error => {
        console.error('Background sync failed:', error)
      })
      
      // Update last sync time
      await whoopAuthService.updateLastSync(effectiveUserId);
      
      return NextResponse.json(sleep);
    }
  } catch (error) {
    console.error('Failed to fetch Whoop sleep:', error);
    
    // If API call fails, the token might be invalid
    const authService = new AuthService();
    const userSession = request.cookies.get('user_session')?.value;
    
    if (userSession) {
      const user = await authService.getUser(userSession);
      if (user) {
        await whoopAuthService.disconnectUser(user.id);
      }
    }
    
    return NextResponse.json(
      { error: 'Whoop connection expired' },
      { status: 401 }
    );
  }
}