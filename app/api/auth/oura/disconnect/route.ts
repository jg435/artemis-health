import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { ouraAuthService } from '@/lib/oura-auth';

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
        { error: 'Oura disconnection is not available in demo mode' },
        { status: 403 }
      );
    }

    // Disconnect user from Oura
    await ouraAuthService.disconnectUser(user.id);
    
    // Clear any oura cookies
    const response = NextResponse.json({ success: true });
    response.cookies.delete('oura_access_token');
    response.cookies.delete('oura_refresh_token');
    
    return response;
  } catch (error) {
    console.error('Failed to disconnect Oura:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect' },
      { status: 500 }
    );
  }
}