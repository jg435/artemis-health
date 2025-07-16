import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { whoopAuthService } from '@/lib/whoop-auth';

export async function POST(request: NextRequest) {
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

    // Prevent disconnection in demo mode
    if (user.isDemo) {
      return NextResponse.json(
        { error: 'Whoop disconnection is not available in demo mode' },
        { status: 403 }
      );
    }

    // Disconnect user from Whoop
    await whoopAuthService.disconnectUser(user.id);
    
    // Clear any whoop cookies
    const response = NextResponse.json({ success: true });
    response.cookies.delete('whoop_access_token');
    response.cookies.delete('whoop_refresh_token');
    
    return response;
  } catch (error) {
    console.error('Failed to disconnect Whoop:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect' },
      { status: 500 }
    );
  }
}