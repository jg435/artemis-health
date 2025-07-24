import { NextRequest, NextResponse } from 'next/server';
import { fitbitAPI } from '@/lib/fitbit-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Generate state parameter for security (include userId)
    const state = `${userId}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    
    // Generate authorization URL
    const authUrl = fitbitAPI.getAuthorizationUrl(state);
    
    console.log('Generated Fitbit authorization URL for user:', userId);
    
    return NextResponse.json({
      authUrl,
      state
    });
    
  } catch (error) {
    console.error('Error generating Fitbit auth URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate authorization URL' },
      { status: 500 }
    );
  }
}