import { NextRequest, NextResponse } from 'next/server';
import { WearableService } from '@/lib/wearable-service';
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

    // Get aggregated activity data from all connected wearables
    const aggregatedData = await WearableService.getAllWearableActivityData();
    
    return NextResponse.json({ data: aggregatedData });
  } catch (error) {
    console.error('Failed to fetch aggregated activity data:', error);
    
    return NextResponse.json(
      { error: 'Failed to fetch aggregated activity data' },
      { status: 500 }
    );
  }
}