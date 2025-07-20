import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { whoopAuthService } from '@/lib/whoop-auth';
import { whoopAPI } from '@/lib/whoop';

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
    return NextResponse.redirect(new URL('/?error=whoop_auth_denied', baseUrl));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL('/?error=whoop_auth_failed', baseUrl));
  }

  // Verify state parameter
  const storedState = request.cookies.get('whoop_oauth_state')?.value;
  if (!storedState || storedState !== state) {
    return NextResponse.redirect(new URL('/?error=whoop_auth_invalid_state', baseUrl));
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
      ? 'http://localhost:3000/api/auth/whoop/callback'
      : 'https://v0-whoop-data-dashboard.vercel.app/api/auth/whoop/callback';

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://api.prod.whoop.com/oauth/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.WHOOP_CLIENT_ID!,
        client_secret: process.env.WHOOP_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        code,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange code for token');
    }

    const tokens = await tokenResponse.json();

    // Get Whoop user info
    const whoopUser = await whoopAPI.getUser(tokens.access_token);

    console.log('Whoop OAuth successful, saving tokens for user:', user.id);
    console.log('Whoop user ID:', whoopUser.user_id);
    console.log('Token expires_in:', tokens.expires_in);
    
    try {
      // Save tokens to database
      await whoopAuthService.saveUserTokens(user.id, tokens, whoopUser.user_id.toString());
      console.log('Tokens saved successfully');
    } catch (saveError) {
      console.error('Failed to save tokens to database:', saveError);
      // Continue anyway and set cookie - tokens can be saved later
    }

    // Set up response
    const response = NextResponse.redirect(new URL('/?whoop_connected=true', baseUrl));
    
    // Set short-term cookie for immediate use
    response.cookies.set('whoop_access_token', tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600, // 1 hour
    });

    // Clear the state cookie
    response.cookies.delete('whoop_oauth_state');

    return response;
  } catch (error) {
    console.error('Whoop OAuth error:', error);
    return NextResponse.redirect(new URL('/?error=whoop_auth_failed', baseUrl));
  }
}