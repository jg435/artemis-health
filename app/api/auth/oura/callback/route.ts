import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { ouraAuthService } from '@/lib/oura-auth';
import { ouraAPI } from '@/lib/oura';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // Get host and protocol for consistent redirects
  const host = request.headers.get('host');
  const protocol = request.headers.get('x-forwarded-proto') || (host?.includes('localhost') ? 'http' : 'https');
  const baseUrl = `${protocol}://${host}`;

  if (error) {
    return NextResponse.redirect(new URL('/?error=oura_auth_denied', baseUrl));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL('/?error=oura_auth_failed', baseUrl));
  }

  // Verify state parameter
  const storedState = request.cookies.get('oura_oauth_state')?.value;
  if (!storedState || storedState !== state) {
    return NextResponse.redirect(new URL('/?error=oura_auth_invalid_state', baseUrl));
  }

  try {
    // Get the authenticated user
    const authService = new AuthService();
    const userSession = request.cookies.get('user_session')?.value;
    
    if (!userSession) {
      return NextResponse.redirect(new URL('/?error=not_authenticated', baseUrl));
    }

    const user = await authService.getUser(userSession);
    if (!user) {
      return NextResponse.redirect(new URL('/?error=invalid_session', baseUrl));
    }

    // Use production URL by default, localhost only for local development
    const isLocal = process.env.NODE_ENV === 'development';
    const redirectUri = isLocal 
      ? 'http://localhost:3000/api/auth/oura/callback'
      : 'https://v0-whoop-data-dashboard.vercel.app/api/auth/oura/callback';

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://api.ouraring.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.OURA_CLIENT_ID!,
        client_secret: process.env.OURA_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        code,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange code for token');
    }

    const tokens = await tokenResponse.json();

    // Get Oura user info
    const ouraUser = await ouraAPI.getUser(tokens.access_token);

    console.log('Oura OAuth successful, saving tokens for user:', user.id);
    console.log('Oura user ID:', ouraUser.id);
    console.log('Token expires_in:', tokens.expires_in);
    
    try {
      // Save tokens to database
      await ouraAuthService.saveUserTokens(user.id, tokens, ouraUser.id);
      console.log('Tokens saved successfully');
    } catch (saveError) {
      console.error('Failed to save tokens to database:', saveError);
      // Continue anyway and set cookie - tokens can be saved later
    }

    // Set up response
    const response = NextResponse.redirect(new URL('/?oura_connected=true', baseUrl));
    
    // Set short-term cookie for immediate use
    response.cookies.set('oura_access_token', tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600, // 1 hour
    });

    // Clear the state cookie
    response.cookies.delete('oura_oauth_state');

    return response;
  } catch (error) {
    console.error('Oura OAuth error:', error);
    return NextResponse.redirect(new URL('/?error=oura_auth_failed', baseUrl));
  }
}