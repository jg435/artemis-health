import { NextRequest, NextResponse } from 'next/server';
import { ouraAPI } from '@/lib/oura';
import { AuthService } from '@/lib/auth';
import { ouraAuthService } from '@/lib/oura-auth';

function getDateDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}

function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
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
    const startDate = searchParams.get('start_date') || getDateDaysAgo(100); // Default to 100 days ago
    const endDate = searchParams.get('end_date') || getTodayDate(); // Default to today

    const readiness = await ouraAPI.getReadiness(ouraAccessToken, startDate, endDate);
    
    // Update last sync time
    await ouraAuthService.updateLastSync(user.id);
    
    return NextResponse.json(readiness);
  } catch (error) {
    console.error('Failed to fetch Oura readiness:', error);
    
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