import { NextRequest, NextResponse } from 'next/server';
import { fitbitAuthService } from '@/lib/fitbit-auth';
import { AuthService } from '@/lib/auth';

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
    
    console.log('Disconnecting Fitbit for user:', user.id);
    
    // Disconnect user
    await fitbitAuthService.disconnectUser(user.id);
    
    console.log('Fitbit disconnected successfully for user:', user.id);
    
    return NextResponse.json({
      success: true,
      message: 'Fitbit disconnected successfully'
    });
    
  } catch (error) {
    console.error('Error disconnecting Fitbit:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect Fitbit' },
      { status: 500 }
    );
  }
}