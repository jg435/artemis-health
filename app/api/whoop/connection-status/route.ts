import { NextRequest, NextResponse } from 'next/server';
import { whoopAuthService } from '@/lib/whoop-auth';
import { AuthService } from '@/lib/auth';

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

    // Get connection info
    const connectionInfo = await whoopAuthService.getConnectionInfo(user.id);
    
    return NextResponse.json(connectionInfo);
  } catch (error) {
    console.error('Failed to get Whoop connection status:', error);
    return NextResponse.json(
      { error: 'Failed to get connection status' },
      { status: 500 }
    );
  }
}