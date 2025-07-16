-- Create user_integrations table for storing third-party service connections
CREATE TABLE IF NOT EXISTS user_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL, -- 'whoop', 'fitbit', etc.
  provider_user_id VARCHAR(255),
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_sync_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  
  -- Ensure one active connection per user per provider
  UNIQUE(user_id, provider, is_active) WHERE is_active = true
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_integrations_user_provider 
ON user_integrations(user_id, provider, is_active);

-- Index for cleanup of expired tokens
CREATE INDEX IF NOT EXISTS idx_user_integrations_expires 
ON user_integrations(token_expires_at, is_active);