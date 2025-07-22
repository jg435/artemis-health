import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { ouraAuthService } from '@/lib/oura-auth';

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

    // Check if user has Oura connected
    const connectionInfo = await ouraAuthService.getConnectionInfo(user.id);
    
    return NextResponse.json(connectionInfo);
  } catch (error) {
    console.error('Failed to check Oura connection status:', error);
    return NextResponse.json(
      { error: 'Failed to check connection status' },
      { status: 500 }
    );
  }
}