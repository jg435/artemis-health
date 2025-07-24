-- Add trainer functionality to existing users table and create trainer-client relationships
-- Migration: 002_add_trainer_functionality.sql

-- Add user_type column to existing users table
ALTER TABLE users ADD COLUMN user_type VARCHAR(20) DEFAULT 'client' CHECK (user_type IN ('client', 'trainer'));

-- Create trainer_clients table for managing trainer-client relationships
CREATE TABLE trainer_clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trainer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  granted_by UUID REFERENCES users(id), -- Who granted access (could be client or admin)
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure a trainer can only have one relationship record per client
  UNIQUE(trainer_id, client_id),
  
  -- Ensure trainer and client are different users
  CHECK (trainer_id != client_id)
);

-- Create indexes for performance
CREATE INDEX idx_trainer_clients_trainer_id ON trainer_clients(trainer_id);
CREATE INDEX idx_trainer_clients_client_id ON trainer_clients(client_id);
CREATE INDEX idx_trainer_clients_active ON trainer_clients(is_active);

-- Create client_access_requests table for managing access requests
CREATE TABLE client_access_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trainer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_email VARCHAR(255) NOT NULL,
  trainer_message TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  responded_at TIMESTAMP WITH TIME ZONE,
  responded_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Prevent duplicate pending requests
  UNIQUE(trainer_id, client_email, status) WHERE status = 'pending'
);

-- Create indexes for client access requests
CREATE INDEX idx_client_access_requests_trainer_id ON client_access_requests(trainer_id);
CREATE INDEX idx_client_access_requests_client_email ON client_access_requests(client_email);
CREATE INDEX idx_client_access_requests_status ON client_access_requests(status);

-- Function to automatically clean up expired requests
CREATE OR REPLACE FUNCTION cleanup_expired_requests()
RETURNS void AS $$
BEGIN
  UPDATE client_access_requests 
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'pending' AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_trainer_clients_updated_at
  BEFORE UPDATE ON trainer_clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_client_access_requests_updated_at
  BEFORE UPDATE ON client_access_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create view for active trainer-client relationships
CREATE VIEW active_trainer_client_relationships AS
SELECT 
  tc.id,
  tc.trainer_id,
  tc.client_id,
  t.name as trainer_name,
  t.email as trainer_email,
  c.name as client_name,
  c.email as client_email,
  tc.granted_at,
  tc.granted_by
FROM trainer_clients tc
JOIN users t ON tc.trainer_id = t.id
JOIN users c ON tc.client_id = c.id
WHERE tc.is_active = true;

-- Grant appropriate permissions (adjust based on your RLS setup)
-- Note: This assumes you might implement Row Level Security later
-- GRANT SELECT ON active_trainer_client_relationships TO authenticated;
-- GRANT ALL ON trainer_clients TO authenticated;
-- GRANT ALL ON client_access_requests TO authenticated;