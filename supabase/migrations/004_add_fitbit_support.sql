-- Add Fitbit support to existing wearable data infrastructure
-- Migration: 004_add_fitbit_support.sql

-- First, create user_integrations table if it doesn't exist (for storing all wearable tokens)
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
  is_active BOOLEAN DEFAULT true,
  integration_type VARCHAR(50), -- For backward compatibility with existing Garmin integration
  integration_data JSONB -- For storing additional provider-specific data
);

-- Create indexes for better performance if they don't exist
CREATE INDEX IF NOT EXISTS idx_user_integrations_user_provider 
ON user_integrations(user_id, provider, is_active);

CREATE INDEX IF NOT EXISTS idx_user_integrations_expires 
ON user_integrations(token_expires_at, is_active);

CREATE INDEX IF NOT EXISTS idx_user_integrations_type 
ON user_integrations(integration_type, is_active);

-- Add 'fitbit' to the provider enum constraints in wearable data tables
-- Note: Using a transaction to ensure atomicity

BEGIN;

-- Update wearable_recovery_data provider constraint
ALTER TABLE wearable_recovery_data 
DROP CONSTRAINT IF EXISTS wearable_recovery_data_provider_check;

ALTER TABLE wearable_recovery_data 
ADD CONSTRAINT wearable_recovery_data_provider_check 
CHECK (provider IN ('whoop', 'oura', 'garmin', 'fitbit'));

-- Update wearable_sleep_data provider constraint  
ALTER TABLE wearable_sleep_data 
DROP CONSTRAINT IF EXISTS wearable_sleep_data_provider_check;

ALTER TABLE wearable_sleep_data 
ADD CONSTRAINT wearable_sleep_data_provider_check 
CHECK (provider IN ('whoop', 'oura', 'garmin', 'fitbit'));

-- Update wearable_activity_data provider constraint
ALTER TABLE wearable_activity_data 
DROP CONSTRAINT IF EXISTS wearable_activity_data_provider_check;

ALTER TABLE wearable_activity_data 
ADD CONSTRAINT wearable_activity_data_provider_check 
CHECK (provider IN ('whoop', 'oura', 'garmin', 'fitbit'));

-- Update wearable_heart_rate_data provider constraint
ALTER TABLE wearable_heart_rate_data 
DROP CONSTRAINT IF EXISTS wearable_heart_rate_data_provider_check;

ALTER TABLE wearable_heart_rate_data 
ADD CONSTRAINT wearable_heart_rate_data_provider_check 
CHECK (provider IN ('whoop', 'oura', 'garmin', 'fitbit'));

-- Update wearable_sync_status provider constraint
ALTER TABLE wearable_sync_status 
DROP CONSTRAINT IF EXISTS wearable_sync_status_provider_check;

ALTER TABLE wearable_sync_status 
ADD CONSTRAINT wearable_sync_status_provider_check 
CHECK (provider IN ('whoop', 'oura', 'garmin', 'fitbit'));

COMMIT;

-- Add trigger for user_integrations updated_at if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_user_integrations_updated_at'
  ) THEN
    -- Add updated_at column if it doesn't exist
    ALTER TABLE user_integrations 
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    
    -- Create the trigger
    CREATE TRIGGER update_user_integrations_updated_at
      BEFORE UPDATE ON user_integrations
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END
$$;

-- Update existing views to include fitbit data (recreate them)
DROP VIEW IF EXISTS latest_recovery_data;
CREATE VIEW latest_recovery_data AS
SELECT DISTINCT ON (user_id, provider) 
  user_id, provider, date, recovery_score, hrv_rmssd, resting_heart_rate, 
  body_temperature, strain, synced_at
FROM wearable_recovery_data
ORDER BY user_id, provider, date DESC;

DROP VIEW IF EXISTS latest_sleep_data;
CREATE VIEW latest_sleep_data AS
SELECT DISTINCT ON (user_id, provider)
  user_id, provider, date, total_sleep_duration, sleep_efficiency, 
  sleep_score, deep_sleep_duration, rem_sleep_duration, synced_at
FROM wearable_sleep_data
ORDER BY user_id, provider, date DESC;

-- Add index for Fitbit-specific queries
CREATE INDEX IF NOT EXISTS idx_recovery_data_fitbit ON wearable_recovery_data(user_id, date DESC) WHERE provider = 'fitbit';
CREATE INDEX IF NOT EXISTS idx_sleep_data_fitbit ON wearable_sleep_data(user_id, date DESC) WHERE provider = 'fitbit';
CREATE INDEX IF NOT EXISTS idx_activity_data_fitbit ON wearable_activity_data(user_id, data_date DESC) WHERE provider = 'fitbit';
CREATE INDEX IF NOT EXISTS idx_heart_rate_fitbit ON wearable_heart_rate_data(user_id, timestamp DESC) WHERE provider = 'fitbit';

-- Create a view for easy access to active integrations
CREATE OR REPLACE VIEW active_user_integrations AS
SELECT 
  id,
  user_id,
  provider,
  provider_user_id,
  connected_at,
  last_sync_at,
  CASE 
    WHEN token_expires_at IS NULL THEN true
    WHEN token_expires_at > NOW() THEN true 
    ELSE false 
  END as token_valid
FROM user_integrations
WHERE is_active = true;

-- Grant necessary permissions
-- Note: Adjust based on your specific RLS requirements
-- GRANT SELECT, INSERT, UPDATE, DELETE ON user_integrations TO authenticated;
-- GRANT SELECT ON active_user_integrations TO authenticated;