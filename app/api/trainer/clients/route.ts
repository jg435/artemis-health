import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/trainer/clients - Get all clients for a trainer
export async function GET(req: NextRequest) {
  try {
    const userSession = req.cookies.get('user_session')?.value
    
    if (!userSession) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get trainer info
    const { data: trainer, error: trainerError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userSession)
      .eq('user_type', 'trainer')
      .single()

    if (trainerError || !trainer) {
      return NextResponse.json({ error: 'Not authorized as trainer' }, { status: 403 })
    }

    // Get all active client relationships for this trainer
    const { data: relationships, error: relationshipsError } = await supabase
      .from('active_trainer_client_relationships')
      .select('*')
      .eq('trainer_id', trainer.id)

    if (relationshipsError) {
      console.error('Error fetching client relationships:', relationshipsError)
      return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 })
    }

    return NextResponse.json({ clients: relationships || [] })
  } catch (error) {
    console.error('Error in GET /api/trainer/clients:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}