import { NextResponse, NextRequest } from 'next/server';
import { AuthService } from '@/lib/auth';

export async function GET(request: NextRequest) {
  // Check if user is in demo mode
  try {
    const authService = new AuthService();
    const userSession = request.cookies.get('user_session')?.value;
    
    if (userSession) {
      const user = await authService.getUser(userSession);
      if (user?.isDemo) {
        return NextResponse.json(
          { error: 'Whoop connection is not available in demo mode' },
          { status: 403 }
        );
      }
    }
  } catch (error) {
    // Continue with normal flow if user check fails
  }
  const clientId = process.env.WHOOP_CLIENT_ID;
  
  // Use production URL by default, localhost only for local development
  const isLocal = process.env.NODE_ENV === 'development';
  const redirectUri = isLocal 
    ? 'http://localhost:3000/api/auth/whoop/callback'
    : 'https://v0-whoop-data-dashboard.vercel.app/api/auth/whoop/callback';
  
  console.log('Redirect URI being sent to Whoop:', redirectUri);
  
  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: 'Missing Whoop API configuration' },
      { status: 500 }
    );
  }

  // Generate a random state parameter for security
  const state = Math.random().toString(36).substring(2, 10);
  
  const authUrl = new URL('https://api.prod.whoop.com/oauth/oauth2/auth');
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('client_id', clientId);
  authUrl.searchParams.append('redirect_uri', redirectUri);
  authUrl.searchParams.append('scope', 'read:recovery read:sleep read:workout read:profile');
  authUrl.searchParams.append('state', state);

  // Store state in a cookie for validation
  const response = NextResponse.redirect(authUrl.toString());
  response.cookies.set('whoop_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
  });

  return response;
}