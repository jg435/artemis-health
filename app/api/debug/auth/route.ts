import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { whoopAuthService } from '@/lib/whoop-auth';

export async function GET(request: NextRequest) {
  try {
    console.log('=== DEBUG AUTH ENDPOINT ===');
    
    // Check cookies
    const userSession = request.cookies.get('user_session')?.value;
    const whoopAccessToken = request.cookies.get('whoop_access_token')?.value;
    
    console.log('Cookies:', {
      hasUserSession: !!userSession,
      hasWhoopToken: !!whoopAccessToken,
      userSession: userSession?.substring(0, 8) + '...' || 'none'
    });

    if (!userSession) {
      return NextResponse.json({
        error: 'No user session found',
        cookies: request.headers.get('cookie')
      });
    }

    // Try to get user
    const authService = new AuthService();
    const user = await authService.getUser(userSession);
    
    console.log('User lookup result:', {
      found: !!user,
      userId: user?.id,
      email: user?.email
    });

    if (!user) {
      return NextResponse.json({
        error: 'User not found',
        userSession: userSession.substring(0, 8) + '...'
      });
    }

    // Check if user_integrations table exists
    let tableExists = false;
    let tableError = null;
    try {
      const connected = await whoopAuthService.isUserConnected(user.id);
      tableExists = true;
      console.log('Table exists, user connected:', connected);
    } catch (error) {
      tableError = error instanceof Error ? error.message : 'Unknown error';
      console.log('Table check failed:', tableError);
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      cookies: {
        hasUserSession: !!userSession,
        hasWhoopToken: !!whoopAccessToken
      },
      database: {
        tableExists,
        tableError
      }
    });

  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json({
      error: 'Debug endpoint failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}