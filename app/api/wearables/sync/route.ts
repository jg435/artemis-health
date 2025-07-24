import { NextRequest, NextResponse } from 'next/server'
import { WearableDataSyncService } from '@/lib/wearable-sync'

// POST /api/wearables/sync - Sync wearable data for authenticated user
export async function POST(req: NextRequest) {
  try {
    const userSession = req.cookies.get('user_session')?.value
    
    if (!userSession) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Check for demo users - skip sync for demos
    const isDemo = userSession.startsWith('demo-user-')
    if (isDemo) {
      return NextResponse.json({ 
        message: 'Demo mode - sync skipped',
        results: {}
      })
    }

    const syncService = new WearableDataSyncService()
    const results = await syncService.syncAllDataForUser(userSession)

    return NextResponse.json({
      message: 'Wearable data sync completed',
      results
    })
  } catch (error) {
    console.error('Error in wearable sync:', error)
    return NextResponse.json(
      { error: 'Failed to sync wearable data' },
      { status: 500 }
    )
  }
}

// GET /api/wearables/sync/status - Get sync status for user
export async function GET(req: NextRequest) {
  try {
    const userSession = req.cookies.get('user_session')?.value
    
    if (!userSession) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Check for demo users
    const isDemo = userSession.startsWith('demo-user-')
    if (isDemo) {
      return NextResponse.json({ 
        syncStatus: [],
        isDemo: true
      })
    }

    const { supabase } = await import('@/lib/supabase')
    
    const { data: syncStatus, error } = await supabase
      .from('wearable_sync_status')
      .select('*')
      .eq('user_id', userSession)
      .order('last_sync_at', { ascending: false })

    if (error) {
      console.error('Error fetching sync status:', error)
      return NextResponse.json({ error: 'Failed to fetch sync status' }, { status: 500 })
    }

    return NextResponse.json({
      syncStatus: syncStatus || [],
      isDemo: false
    })
  } catch (error) {
    console.error('Error in sync status:', error)
    return NextResponse.json(
      { error: 'Failed to get sync status' },
      { status: 500 }
    )
  }
}