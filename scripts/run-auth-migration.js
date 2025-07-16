const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: '.env' })

async function runMigration() {
  // Create Supabase client with service role key for admin access
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // Read the migration file
  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '001_create_user_auth_tables.sql')
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

  console.log('Running authentication migration...')

  try {
    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL })
    
    if (error) {
      console.error('Migration failed:', error)
      return
    }

    console.log('Migration completed successfully!')
    console.log('✅ Users table created')
    console.log('✅ Whoop tokens table created')
    console.log('✅ Indexes created')
    console.log('✅ Triggers created')
    
  } catch (error) {
    console.error('Error running migration:', error)
  }
}

runMigration()