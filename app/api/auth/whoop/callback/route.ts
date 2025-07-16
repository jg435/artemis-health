import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { whoopAuthService } from '@/lib/whoop-auth';
import { whoopAPI } from '@/lib/whoop';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(new URL('/?error=whoop_auth_denied', request.url));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL('/?error=whoop_auth_failed', request.url));
  }

  // Verify state parameter
  const storedState = request.cookies.get('whoop_oauth_state')?.value;
  if (!storedState || storedState !== state) {
    return NextResponse.redirect(new URL('/?error=whoop_auth_invalid_state', request.url));
  }

  try {
    // Get the authenticated user
    const authService = new AuthService();
    const userSession = request.cookies.get('user_session')?.value;
    
    if (!userSession) {
      return NextResponse.redirect(new URL('/?error=not_authenticated', request.url));
    }

    const user = await authService.getUser(userSession);
    if (!user) {
      return NextResponse.redirect(new URL('/?error=invalid_session', request.url));
    }

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
        redirect_uri: process.env.WHOOP_REDIRECT_URI!,
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
    const response = NextResponse.redirect(new URL('/?whoop_connected=true', request.url));
    
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
    return NextResponse.redirect(new URL('/?error=whoop_auth_failed', request.url));
  }
}