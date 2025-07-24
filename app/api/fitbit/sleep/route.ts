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
    
    let sleepData;
    
    if (date) {
      // Get sleep data for specific date
      const rawData = await fitbitAPI.getSleepData(accessToken, date);
      const sleep = fitbitAPI.transformSleepData(rawData, date);
      
      sleepData = {
        date,
        sleep,
        rawData: rawData.sleep[0] || null,
        summary: rawData.summary
      };
    } else {
      // Get sleep data for multiple days
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000)
        .toISOString().split('T')[0];
      
      const multiDayData = await fitbitAPI.getMultipleDaysData(
        accessToken,
        startDate,
        endDate,
        ['sleep']
      );
      
      sleepData = {
        startDate,
        endDate,
        days,
        sleep: multiDayData.sleep
      };
    }
    
    // Update last sync
    await fitbitAuthService.updateLastSync(user.id);
    
    return NextResponse.json(sleepData);
    
  } catch (error) {
    console.error('Error fetching Fitbit sleep data:', error);
    
    // Handle rate limiting specifically
    if (error instanceof Error && error.message.includes('Rate limit')) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch sleep data' },
      { status: 500 }
    );
  }
}