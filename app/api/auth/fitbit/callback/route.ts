import { NextRequest, NextResponse } from 'next/server';
import { fitbitAPI } from '@/lib/fitbit-service';
import { fitbitAuthService } from '@/lib/fitbit-auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    
    // Handle OAuth errors
    if (error) {
      console.error('Fitbit OAuth error:', error);
      return NextResponse.redirect(
        new URL(`/?error=fitbit_auth_${error}`, request.url)
      );
    }
    
    if (!code || !state) {
      console.error('Missing code or state in callback');
      return NextResponse.redirect(
        new URL('/?error=fitbit_auth_invalid_callback', request.url)
      );
    }
    
    // Extract userId from state
    const userId = state.split('_')[0];
    if (!userId) {
      console.error('Invalid state parameter, cannot extract userId');
      return NextResponse.redirect(
        new URL('/?error=fitbit_auth_invalid_state', request.url)
      );
    }
    
    console.log('Processing Fitbit OAuth callback for user:', userId);
    
    // Exchange code for tokens
    const tokens = await fitbitAPI.exchangeCodeForTokens(code);
    
    // Get user profile to get Fitbit user ID
    const userProfile = await fitbitAPI.getUserProfile(tokens.access_token);
    
    // Save tokens to database
    await fitbitAuthService.saveUserTokens(userId, tokens, userProfile.encodedId);
    
    console.log('Fitbit connection successful for user:', userId);
    
    // Redirect to success page
    return NextResponse.redirect(
      new URL('/?connected=fitbit', request.url)
    );
    
  } catch (error) {
    console.error('Error in Fitbit OAuth callback:', error);
    
    // Redirect to error page
    return NextResponse.redirect(
      new URL('/?error=fitbit_auth_failed', request.url)
    );
  }
}