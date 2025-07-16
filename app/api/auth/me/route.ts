import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const userSession = request.cookies.get('user_session')?.value

    if (!userSession) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Check if this is a demo user (demo user IDs start with "demo-user-")
    const isDemo = userSession.startsWith('demo-user-')

    if (isDemo) {
      // Return demo user object
      return NextResponse.json({
        user: {
          id: userSession,
          email: `demo-${Date.now()}@healthapp.com`,
          name: 'Demo User',
          whoop_connected: true,
          isDemo: true
        }
      })
    }

    // Get user by ID from database
    const { user, error } = await AuthService.getUserById(userSession)

    if (error || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 401 }
      )
    }

    return NextResponse.json({ 
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        whoop_connected: user.whoop_connected,
        isDemo: false
      }
    })
  } catch (error) {
    console.error('Get user error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}