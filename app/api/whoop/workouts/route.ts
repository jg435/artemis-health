import { NextRequest, NextResponse } from 'next/server';
import { whoopAPI } from '@/lib/whoop';
import { whoopAuthService } from '@/lib/whoop-auth';
import { AuthService } from '@/lib/auth';
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
      
      const storedData = await syncService.getStoredActivityData(effectiveUserId, days)
      
      // Transform stored data to match Whoop API format
      const workouts = {
        records: storedData
          .filter(d => d.provider === 'whoop')
          .map(d => ({
            id: d.activity_id || `stored_${d.id}`,
            start: d.start_time,
            end: d.end_time,
            created_at: d.data_date,
            updated_at: d.synced_at,
            sport_name: d.sport_type,
            score: {
              strain: d.strain,
              average_heart_rate: d.average_heart_rate,
              max_heart_rate: d.max_heart_rate,
              kilojoule: d.kilojoules
            },
            // Include original raw data if available
            ...d.raw_data
          })),
        next_token: null
      }
      
      return NextResponse.json(workouts);
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
      const workouts = await whoopAPI.getWorkouts(whoopAccessToken, start, end, limit);
      
      // Sync workout data to Supabase in background (don't wait)
      syncService.syncAllDataForUser(effectiveUserId).catch(error => {
        console.error('Background sync failed:', error)
      })
      
      // Update last sync time
      await whoopAuthService.updateLastSync(effectiveUserId);
      
      return NextResponse.json(workouts);
    }
  } catch (error) {
    console.error('Failed to fetch Whoop workouts:', error);
    
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