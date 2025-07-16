const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createUserIntegrationsTable() {
  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        -- Create user_integrations table for storing third-party service connections
        CREATE TABLE IF NOT EXISTS user_integrations (
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

        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_user_integrations_user_provider 
        ON user_integrations(user_id, provider, is_active);

        CREATE INDEX IF NOT EXISTS idx_user_integrations_expires 
        ON user_integrations(token_expires_at, is_active);
      `
    });

    if (error) {
      console.error('Error creating table:', error);
    } else {
      console.log('User integrations table created successfully');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

createUserIntegrationsTable();