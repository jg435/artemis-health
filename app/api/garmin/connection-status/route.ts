import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { garminAuthService } from '@/lib/garmin-auth';

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

    // Get connection status
    const status = await garminAuthService.getConnectionStatus(user.id);

    return NextResponse.json(status);
  } catch (error) {
    console.error('Error checking Garmin connection status:', error);
    return NextResponse.json(
      { connected: false, connectedAt: null, lastSync: null },
      { status: 200 }
    );
  }
}