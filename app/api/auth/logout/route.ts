import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const response = NextResponse.json({ 
      message: 'Logged out successfully' 
    })

    // Clear session cookie
    response.cookies.delete('user_session')
    
    // Also clear Whoop tokens if they exist
    response.cookies.delete('whoop_access_token')
    response.cookies.delete('whoop_refresh_token')

    return response
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}