import { NextResponse, NextRequest } from 'next/server';
import { AuthService } from '@/lib/auth';

export async function GET(request: NextRequest) {
  // Check if user is in demo mode and validate no conflicting connections
  try {
    const authService = new AuthService();
    const userSession = request.cookies.get('user_session')?.value;
    
    if (userSession) {
      const user = await authService.getUser(userSession);
      if (user?.isDemo) {
        return NextResponse.json(
          { error: 'Oura connection is not available in demo mode' },
          { status: 403 }
        );
      }

      // Check if user already has Whoop or Garmin connected
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(process.env.SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
      
      const { data: existingConnections } = await supabase
        .from('user_integrations')
        .select('*')
        .eq('user_id', user.id)
        .in('integration_type', ['whoop', 'garmin']);

      if (existingConnections && existingConnections.length > 0) {
        const connectedDevice = existingConnections[0].integration_type;
        return NextResponse.redirect(new URL(`/?error=${connectedDevice}_already_connected`, request.url));
      }
    }
  } catch (error) {
    // Continue with normal flow if user check fails
  }
  
  const clientId = process.env.OURA_CLIENT_ID;
  
  // Use production URL by default, localhost only for local development
  const isLocal = process.env.NODE_ENV === 'development';
  const redirectUri = isLocal 
    ? 'http://localhost:3000/api/auth/oura/callback'
    : 'https://v0-whoop-data-dashboard.vercel.app/api/auth/oura/callback';
  
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('isLocal:', isLocal);
  console.log('Redirect URI being sent to Oura:', redirectUri);
  
  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: 'Missing Oura API configuration' },
      { status: 500 }
    );
  }

  // Generate a random state parameter for security
  const state = Math.random().toString(36).substring(2, 10);
  
  const authUrl = new URL('https://cloud.ouraring.com/oauth/authorize');
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('client_id', clientId);
  authUrl.searchParams.append('redirect_uri', redirectUri);
  authUrl.searchParams.append('scope', 'personal daily session heartrate');
  authUrl.searchParams.append('state', state);

  // Store state in a cookie for validation
  const response = NextResponse.redirect(authUrl.toString());
  response.cookies.set('oura_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
  });

  return response;
}