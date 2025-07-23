import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { garminAuthService } from '@/lib/garmin-auth';

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

    // Disconnect the user's Garmin integration
    await garminAuthService.disconnectUser(user.id);

    // Clear any temporary tokens
    const response = NextResponse.json({ success: true });
    response.cookies.delete('garmin_access_token');

    return response;
  } catch (error) {
    console.error('Error disconnecting Garmin:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect Garmin' },
      { status: 500 }
    );
  }
}