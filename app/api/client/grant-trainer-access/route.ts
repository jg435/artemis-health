import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// POST /api/client/grant-trainer-access - Client grants access to a trainer
export async function POST(req: NextRequest) {
  try {
    const userSession = req.cookies.get('user_session')?.value
    
    if (!userSession) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await req.json()
    const { trainerEmail } = body

    if (!trainerEmail) {
      return NextResponse.json({ error: 'Trainer email is required' }, { status: 400 })
    }

    // Get client info
    const { data: client, error: clientError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userSession)
      .eq('user_type', 'client')
      .single()

    if (clientError || !client) {
      return NextResponse.json({ error: 'Not authorized as client' }, { status: 403 })
    }

    // Check if trainer exists
    const { data: trainer, error: trainerError } = await supabase
      .from('users')
      .select('id, email, name')
      .eq('email', trainerEmail)
      .eq('user_type', 'trainer')
      .single()

    if (trainerError || !trainer) {
      return NextResponse.json({ error: 'Trainer not found or not a trainer account' }, { status: 404 })
    }

    // Check if relationship already exists
    const { data: existingRelationship } = await supabase
      .from('trainer_clients')
      .select('*')
      .eq('trainer_id', trainer.id)
      .eq('client_id', client.id)
      .single()

    if (existingRelationship?.is_active) {
      return NextResponse.json({ error: 'Trainer already has access' }, { status: 409 })
    }

    // If relationship exists but is inactive, reactivate it
    if (existingRelationship && !existingRelationship.is_active) {
      const { data: updatedRelationship, error: updateError } = await supabase
        .from('trainer_clients')
        .update({ 
          is_active: true, 
          granted_by: client.id,
          granted_at: new Date().toISOString()
        })
        .eq('id', existingRelationship.id)
        .select()
        .single()

      if (updateError) {
        console.error('Error reactivating relationship:', updateError)
        return NextResponse.json({ error: 'Failed to grant access' }, { status: 500 })
      }

      return NextResponse.json({ 
        message: 'Trainer access granted successfully',
        relationship: updatedRelationship
      })
    }

    // Create new trainer-client relationship
    const { data: relationship, error: relationshipError } = await supabase
      .from('trainer_clients')
      .insert({
        trainer_id: trainer.id,
        client_id: client.id,
        granted_by: client.id,
        is_active: true
      })
      .select()
      .single()

    if (relationshipError) {
      console.error('Error creating trainer-client relationship:', relationshipError)
      return NextResponse.json({ error: 'Failed to grant access' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'Trainer access granted successfully',
      relationship: relationship,
      trainer: {
        name: trainer.name,
        email: trainer.email
      }
    })
  } catch (error) {
    console.error('Error in POST /api/client/grant-trainer-access:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/client/grant-trainer-access - Get trainers with access to this client
export async function GET(req: NextRequest) {
  try {
    const userSession = req.cookies.get('user_session')?.value
    
    if (!userSession) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get client info
    const { data: client, error: clientError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userSession)
      .eq('user_type', 'client')
      .single()

    if (clientError || !client) {
      return NextResponse.json({ error: 'Not authorized as client' }, { status: 403 })
    }

    // Get all active trainers for this client
    const { data: trainers, error: trainersError } = await supabase
      .from('active_trainer_client_relationships')
      .select('*')
      .eq('client_id', client.id)

    if (trainersError) {
      console.error('Error fetching trainers:', trainersError)
      return NextResponse.json({ error: 'Failed to fetch trainers' }, { status: 500 })
    }

    return NextResponse.json({ trainers: trainers || [] })
  } catch (error) {
    console.error('Error in GET /api/client/grant-trainer-access:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/client/grant-trainer-access - Revoke trainer access
export async function DELETE(req: NextRequest) {
  try {
    const userSession = req.cookies.get('user_session')?.value
    
    if (!userSession) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await req.json()
    const { trainerId } = body

    if (!trainerId) {
      return NextResponse.json({ error: 'Trainer ID is required' }, { status: 400 })
    }

    // Get client info
    const { data: client, error: clientError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userSession)
      .eq('user_type', 'client')
      .single()

    if (clientError || !client) {
      return NextResponse.json({ error: 'Not authorized as client' }, { status: 403 })
    }

    // Deactivate the relationship
    const { error: updateError } = await supabase
      .from('trainer_clients')
      .update({ is_active: false })
      .eq('trainer_id', trainerId)
      .eq('client_id', client.id)

    if (updateError) {
      console.error('Error revoking trainer access:', updateError)
      return NextResponse.json({ error: 'Failed to revoke access' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Trainer access revoked successfully' })
  } catch (error) {
    console.error('Error in DELETE /api/client/grant-trainer-access:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}