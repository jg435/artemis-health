import { NextRequest, NextResponse } from 'next/server';
import { whoopAuthService } from '@/lib/whoop-auth';
import { AuthService } from '@/lib/auth';
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
      } else {
        return NextResponse.json(
          { error: 'No permission to view this client\'s data' },
          { status: 403 }
        );
      }
    }

    // Get connection info for the effective user
    const connectionInfo = await whoopAuthService.getConnectionInfo(effectiveUserId);
    
    return NextResponse.json(connectionInfo);
  } catch (error) {
    console.error('Failed to get Whoop connection status:', error);
    return NextResponse.json(
      { error: 'Failed to get connection status' },
      { status: 500 }
    );
  }
}