import { NextRequest, NextResponse } from 'next/server';
import { ouraAPI } from '@/lib/oura';
import { AuthService } from '@/lib/auth';
import { ouraAuthService } from '@/lib/oura-auth';

function getDateDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

function getTodayDate(): string {
  return new Date().toISOString();
}

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

    // Try to get valid Oura token from database
    let ouraAccessToken = await ouraAuthService.getValidTokenForUser(user.id);
    
    if (!ouraAccessToken) {
      // Fallback to cookie (for immediate post-auth requests)
      ouraAccessToken = request.cookies.get('oura_access_token')?.value;
    }

    if (!ouraAccessToken) {
      return NextResponse.json(
        { error: 'Oura not connected' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const startDatetime = searchParams.get('start_datetime') || getDateDaysAgo(7); // Last 7 days
    const endDatetime = searchParams.get('end_datetime') || getTodayDate();

    const heartrate = await ouraAPI.getHeartRate(ouraAccessToken, startDatetime, endDatetime);
    
    console.log('Oura heart rate endpoint response:', JSON.stringify(heartrate, null, 2));
    console.log('Heart rate data count:', heartrate?.data?.length || 0);
    if (heartrate?.data?.length > 0) {
      console.log('First few heart rate entries:', heartrate.data.slice(0, 3));
    }
    
    // Update last sync time
    await ouraAuthService.updateLastSync(user.id);
    
    return NextResponse.json(heartrate);
  } catch (error) {
    console.error('Failed to fetch Oura heart rate:', error);
    
    // If API call fails, the token might be invalid
    const authService = new AuthService();
    const userSession = request.cookies.get('user_session')?.value;
    
    if (userSession) {
      const user = await authService.getUser(userSession);
      if (user) {
        await ouraAuthService.disconnectUser(user.id);
      }
    }
    
    return NextResponse.json(
      { error: 'Oura connection expired' },
      { status: 401 }
    );
  }
}