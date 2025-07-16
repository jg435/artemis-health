import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST() {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Check if table exists first
    const { data: existingTable } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_name', 'user_integrations')
      .single();

    if (existingTable) {
      return NextResponse.json({ 
        success: true, 
        message: 'User integrations table already exists' 
      });
    }

    // Create the table using INSERT approach since SQL templates might not work
    const createTableSQL = `
      CREATE TABLE user_integrations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        provider VARCHAR(50) NOT NULL,
        provider_user_id VARCHAR(255),
        access_token TEXT,
        refresh_token TEXT,
        token_expires_at TIMESTAMP WITH TIME ZONE,
        connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_sync_at TIMESTAMP WITH TIME ZONE,
        is_active BOOLEAN DEFAULT true
      );
      
      CREATE INDEX idx_user_integrations_user_provider 
      ON user_integrations(user_id, provider, is_active);
      
      CREATE INDEX idx_user_integrations_expires 
      ON user_integrations(token_expires_at, is_active);
    `;

    // Use RPC to execute SQL if available
    const { data, error } = await supabase.rpc('exec_sql', { sql: createTableSQL });

    if (error) {
      console.error('Table creation error:', error);
      
      // Fallback: Try creating manually by inserting a test record and letting the table be created
      try {
        // First insert a dummy user if needed
        const { data: testUser } = await supabase
          .from('users')
          .select('id')
          .limit(1)
          .single();

        if (testUser) {
          // Try to insert into user_integrations - this will fail but might create the table structure
          await supabase
            .from('user_integrations')
            .insert({
              user_id: testUser.id,
              provider: 'test',
              provider_user_id: 'test',
              access_token: 'test',
              is_active: false
            });

          // Delete the test record
          await supabase
            .from('user_integrations')
            .delete()
            .eq('provider', 'test');
        }
      } catch (fallbackError) {
        console.log('Fallback method also failed:', fallbackError);
      }

      return NextResponse.json({ 
        error: 'Failed to create table via SQL. Table might need manual creation.',
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'User integrations table created successfully',
      data 
    });
  } catch (error) {
    console.error('Setup error:', error);
    return NextResponse.json({ 
      error: 'Failed to create table', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}