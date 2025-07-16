import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // Test if users table exists
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    // Test if whoop_tokens table exists
    const { data: tokens, error: tokensError } = await supabase
      .from('whoop_tokens')
      .select('id')
      .limit(1);

    return NextResponse.json({
      database_connected: true,
      users_table_exists: !usersError,
      whoop_tokens_table_exists: !tokensError,
      users_error: usersError?.message,
      tokens_error: tokensError?.message,
      supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      has_service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    });
  } catch (error) {
    return NextResponse.json({
      database_connected: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}