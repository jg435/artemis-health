-- Add wearable data storage tables for trainer-client data sharing
-- Migration: 003_add_wearable_data_tables.sql

-- Create wearable_recovery_data table for Whoop/Oura recovery data
CREATE TABLE wearable_recovery_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(20) NOT NULL CHECK (provider IN ('whoop', 'oura', 'garmin')),
  date DATE NOT NULL,
  recovery_score DECIMAL(5,2),
  hrv_rmssd DECIMAL(8,2),
  resting_heart_rate INTEGER,
  body_temperature DECIMAL(5,2),
  skin_temp DECIMAL(5,2),
  spo2 DECIMAL(5,2),
  sleep_performance DECIMAL(5,2),
  strain DECIMAL(5,2),
  raw_data JSONB, -- Store complete API response for flexibility
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data_date TIMESTAMP WITH TIME ZONE NOT NULL, -- Original data timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one record per user/provider/date
  UNIQUE(user_id, provider, date)
);

-- Create wearable_sleep_data table
CREATE TABLE wearable_sleep_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(20) NOT NULL CHECK (provider IN ('whoop', 'oura', 'garmin')),
  date DATE NOT NULL,
  sleep_start TIMESTAMP WITH TIME ZONE,
  sleep_end TIMESTAMP WITH TIME ZONE,
  total_sleep_duration INTEGER, -- minutes
  deep_sleep_duration INTEGER, -- minutes
  rem_sleep_duration INTEGER, -- minutes
  light_sleep_duration INTEGER, -- minutes
  awake_duration INTEGER, -- minutes
  sleep_efficiency DECIMAL(5,2), -- percentage
  sleep_score DECIMAL(5,2),
  sleep_onset_latency INTEGER, -- minutes
  wake_count INTEGER,
  average_heart_rate DECIMAL(5,2),
  lowest_heart_rate DECIMAL(5,2),
  average_hrv DECIMAL(8,2),
  raw_data JSONB,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, provider, date)
);

-- Create wearable_activity_data table for workouts and activities
CREATE TABLE wearable_activity_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(20) NOT NULL CHECK (provider IN ('whoop', 'oura', 'garmin')),
  activity_id VARCHAR(255), -- Provider's activity ID
  activity_type VARCHAR(100),
  sport_type VARCHAR(100),
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  duration INTEGER, -- seconds
  distance DECIMAL(10,2), -- meters
  calories INTEGER,
  average_heart_rate DECIMAL(5,2),
  max_heart_rate DECIMAL(5,2),
  strain DECIMAL(5,2),
  kilojoules DECIMAL(10,2),
  altitude_gain DECIMAL(8,2), -- meters
  altitude_loss DECIMAL(8,2), -- meters
  zones JSONB, -- Heart rate zones breakdown
  raw_data JSONB,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Allow multiple activities per day but unique provider activity IDs
  UNIQUE(user_id, provider, activity_id)
);

-- Create wearable_heart_rate_data table for detailed HR data
CREATE TABLE wearable_heart_rate_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(20) NOT NULL CHECK (provider IN ('whoop', 'oura', 'garmin')),
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  heart_rate INTEGER NOT NULL,
  source VARCHAR(50), -- 'resting', 'activity', 'continuous', etc.
  raw_data JSONB,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Index for time-series queries
  UNIQUE(user_id, provider, timestamp)
);

-- Create indexes for performance
CREATE INDEX idx_recovery_data_user_date ON wearable_recovery_data(user_id, date DESC);
CREATE INDEX idx_recovery_data_provider ON wearable_recovery_data(provider);
CREATE INDEX idx_recovery_data_synced ON wearable_recovery_data(synced_at DESC);

CREATE INDEX idx_sleep_data_user_date ON wearable_sleep_data(user_id, date DESC);
CREATE INDEX idx_sleep_data_provider ON wearable_sleep_data(provider);
CREATE INDEX idx_sleep_data_synced ON wearable_sleep_data(synced_at DESC);

CREATE INDEX idx_activity_data_user_date ON wearable_activity_data(user_id, data_date DESC);
CREATE INDEX idx_activity_data_provider ON wearable_activity_data(provider);
CREATE INDEX idx_activity_data_type ON wearable_activity_data(activity_type);
CREATE INDEX idx_activity_data_synced ON wearable_activity_data(synced_at DESC);

CREATE INDEX idx_heart_rate_user_time ON wearable_heart_rate_data(user_id, timestamp DESC);
CREATE INDEX idx_heart_rate_provider ON wearable_heart_rate_data(provider);

-- Create data sync status tracking table
CREATE TABLE wearable_sync_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(20) NOT NULL CHECK (provider IN ('whoop', 'oura', 'garmin')),
  data_type VARCHAR(50) NOT NULL CHECK (data_type IN ('recovery', 'sleep', 'activity', 'heart_rate')),
  last_sync_at TIMESTAMP WITH TIME ZONE,
  last_successful_sync_at TIMESTAMP WITH TIME ZONE,
  last_sync_error TEXT,
  sync_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, provider, data_type)
);

CREATE INDEX idx_sync_status_user ON wearable_sync_status(user_id);
CREATE INDEX idx_sync_status_provider ON wearable_sync_status(provider);
CREATE INDEX idx_sync_status_last_sync ON wearable_sync_status(last_sync_at DESC);

-- Create updated_at triggers for all tables
CREATE TRIGGER update_wearable_recovery_data_updated_at
  BEFORE UPDATE ON wearable_recovery_data
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wearable_sleep_data_updated_at
  BEFORE UPDATE ON wearable_sleep_data
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wearable_activity_data_updated_at
  BEFORE UPDATE ON wearable_activity_data
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wearable_sync_status_updated_at
  BEFORE UPDATE ON wearable_sync_status
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create views for easy data access
CREATE VIEW latest_recovery_data AS
SELECT DISTINCT ON (user_id, provider) 
  user_id, provider, date, recovery_score, hrv_rmssd, resting_heart_rate, 
  body_temperature, strain, synced_at
FROM wearable_recovery_data
ORDER BY user_id, provider, date DESC;

CREATE VIEW latest_sleep_data AS
SELECT DISTINCT ON (user_id, provider)
  user_id, provider, date, total_sleep_duration, sleep_efficiency, 
  sleep_score, deep_sleep_duration, rem_sleep_duration, synced_at
FROM wearable_sleep_data
ORDER BY user_id, provider, date DESC;

-- Create function to clean up old data (optional retention policy)
CREATE OR REPLACE FUNCTION cleanup_old_wearable_data(retention_days INTEGER DEFAULT 365)
RETURNS void AS $$
BEGIN
  -- Keep last year of data by default
  DELETE FROM wearable_heart_rate_data 
  WHERE timestamp < NOW() - INTERVAL '1 day' * retention_days;
  
  DELETE FROM wearable_activity_data 
  WHERE data_date < NOW() - INTERVAL '1 day' * retention_days;
  
  DELETE FROM wearable_sleep_data 
  WHERE date < CURRENT_DATE - INTERVAL '1 day' * retention_days;
  
  DELETE FROM wearable_recovery_data 
  WHERE date < CURRENT_DATE - INTERVAL '1 day' * retention_days;
END;
$$ LANGUAGE plpgsql;