import { NextRequest, NextResponse } from 'next/server';
import { fitbitAuthService } from '@/lib/fitbit-auth';
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
    
    // Check if user is connected to Fitbit
    const connectionInfo = await fitbitAuthService.getConnectionInfo(user.id);
    
    // If connected, test the connection
    let connectionHealth = 'unknown';
    if (connectionInfo.connected) {
      const isHealthy = await fitbitAuthService.testConnection(user.id);
      connectionHealth = isHealthy ? 'healthy' : 'unhealthy';
    }
    
    return NextResponse.json({
      connected: connectionInfo.connected,
      connectedAt: connectionInfo.connectedAt,
      lastSync: connectionInfo.lastSync,
      health: connectionHealth,
      provider: 'fitbit'
    });
    
  } catch (error) {
    console.error('Error checking Fitbit connection status:', error);
    return NextResponse.json(
      { error: 'Failed to check connection status' },
      { status: 500 }
    );
  }
}