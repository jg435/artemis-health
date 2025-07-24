import { NextRequest, NextResponse } from 'next/server';
import { fitbitAuthService } from '@/lib/fitbit-auth';
import { fitbitAPI } from '@/lib/fitbit-service';
import { AuthService } from '@/lib/auth';

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
    const { searchParams } = new URL(request.url);
    
    // Get query parameters
    const days = parseInt(searchParams.get('days') || '60', 10);
    const date = searchParams.get('date');
    
    // Get valid access token
    const accessToken = await fitbitAuthService.getValidTokenForUser(user.id);
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Fitbit not connected or token expired' },
        { status: 403 }
      );
    }
    
    let activityData;
    
    if (date) {
      // Get activity data for specific date
      const rawData = await fitbitAPI.getActivitySummary(accessToken, date);
      const activities = fitbitAPI.transformActivityData(rawData, date);
      
      activityData = {
        date,
        activities,
        summary: rawData.summary,
        goals: rawData.goals
      };
    } else {
      // Get activity data for multiple days
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000)
        .toISOString().split('T')[0];
      
      const multiDayData = await fitbitAPI.getMultipleDaysData(
        accessToken,
        startDate,
        endDate,
        ['activity']
      );
      
      activityData = {
        startDate,
        endDate,
        days,
        activities: multiDayData.activities
      };
    }
    
    // Update last sync
    await fitbitAuthService.updateLastSync(user.id);
    
    return NextResponse.json(activityData);
    
  } catch (error) {
    console.error('Error fetching Fitbit activity data:', error);
    
    // Handle rate limiting specifically
    if (error instanceof Error && error.message.includes('Rate limit')) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch activity data' },
      { status: 500 }
    );
  }
}