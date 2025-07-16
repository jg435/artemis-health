import { NextRequest, NextResponse } from 'next/server';
import { whoopAPI } from '@/lib/whoop';
import { AuthService } from '@/lib/auth';
import { whoopAuthService } from '@/lib/whoop-auth';

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

    // Try to get valid Whoop token from database
    let whoopAccessToken = await whoopAuthService.getValidTokenForUser(user.id);
    
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

    const recovery = await whoopAPI.getRecovery(whoopAccessToken, start, end, limit);
    
    // Update last sync time
    await whoopAuthService.updateLastSync(user.id);
    
    return NextResponse.json(recovery);
  } catch (error) {
    console.error('Failed to fetch Whoop recovery:', error);
    
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