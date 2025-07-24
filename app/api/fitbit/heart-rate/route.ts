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
    const includeIntraday = searchParams.get('intraday') === 'true';
    
    // Get valid access token
    const accessToken = await fitbitAuthService.getValidTokenForUser(user.id);
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Fitbit not connected or token expired' },
        { status: 403 }
      );
    }
    
    let heartRateData;
    
    if (date) {
      // Get heart rate data for specific date
      const rawData = await fitbitAPI.getHeartRateData(accessToken, date);
      let intradayData = null;
      
      if (includeIntraday) {
        try {
          intradayData = await fitbitAPI.getIntradayHeartRate(accessToken, date);
        } catch (error) {
          console.warn('Failed to fetch intraday heart rate data:', error);
          // Continue without intraday data
        }
      }
      
      heartRateData = {
        date,
        heartRate: rawData['activities-heart'][0]?.value,
        intraday: intradayData?.['activities-heart-intraday']
      };
    } else {
      // Get heart rate data for multiple days
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000)
        .toISOString().split('T')[0];
      
      const multiDayData = await fitbitAPI.getMultipleDaysData(
        accessToken,
        startDate,
        endDate,
        ['heartrate']
      );
      
      heartRateData = {
        startDate,
        endDate,
        days,
        recovery: multiDayData.recovery // Heart rate data is transformed into recovery format
      };
    }
    
    // Update last sync
    await fitbitAuthService.updateLastSync(user.id);
    
    return NextResponse.json(heartRateData);
    
  } catch (error) {
    console.error('Error fetching Fitbit heart rate data:', error);
    
    // Handle rate limiting specifically
    if (error instanceof Error && error.message.includes('Rate limit')) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch heart rate data' },
      { status: 500 }
    );
  }
}