import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { garminAuthService } from '@/lib/garmin-auth';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // Check for OAuth errors
  if (error) {
    console.error('Garmin OAuth error:', error);
    return NextResponse.redirect(new URL('/?error=garmin_auth_failed', request.url));
  }

  if (!code || !state) {
    console.error('Missing code or state parameter');
    return NextResponse.redirect(new URL('/?error=garmin_auth_failed', request.url));
  }

  // Verify state parameter
  const storedState = request.cookies.get('garmin_oauth_state')?.value;
  if (state !== storedState) {
    console.error('State parameter mismatch');
    return NextResponse.redirect(new URL('/?error=garmin_auth_failed', request.url));
  }

  try {
    // Get the authenticated user
    const authService = new AuthService();
    const userSession = request.cookies.get('user_session')?.value;
    
    if (!userSession) {
      console.error('No user session found');
      return NextResponse.redirect(new URL('/?error=not_authenticated', request.url));
    }

    const user = await authService.getUser(userSession);
    if (!user) {
      console.error('Invalid user session');
      return NextResponse.redirect(new URL('/?error=invalid_session', request.url));
    }

    // Exchange code for tokens
    const clientId = process.env.GARMIN_CLIENT_ID;
    const clientSecret = process.env.GARMIN_CLIENT_SECRET;
    
    const isLocal = process.env.NODE_ENV === 'development';
    const redirectUri = isLocal 
      ? 'http://localhost:3000/api/auth/garmin/callback'
      : 'https://v0-whoop-data-dashboard.vercel.app/api/auth/garmin/callback';

    const tokenResponse = await fetch('https://connect.garmin.com/oauth-service/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Failed to exchange code for tokens:', tokenResponse.status, errorText);
      return NextResponse.redirect(new URL('/?error=garmin_token_exchange_failed', request.url));
    }

    const tokens = await tokenResponse.json();
    console.log('Garmin tokens received successfully');

    // Save tokens to database
    await garminAuthService.saveUserTokens(user.id, tokens);

    // Clean up state cookie
    const response = NextResponse.redirect(new URL('/?garmin_connected=true', request.url));
    response.cookies.delete('garmin_oauth_state');
    
    // Set temporary access token cookie for immediate use
    response.cookies.set('garmin_access_token', tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 3600, // 1 hour
    });

    return response;
  } catch (error) {
    console.error('Error in Garmin OAuth callback:', error);
    return NextResponse.redirect(new URL('/?error=garmin_auth_failed', request.url));
  }
}