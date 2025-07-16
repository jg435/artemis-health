-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  age INTEGER,
  gender TEXT,
  height_cm INTEGER,
  weight_kg DECIMAL(5,2),
  activity_level TEXT CHECK (activity_level IN ('sedentary', 'lightly_active', 'moderately_active', 'very_active')),
  health_goals TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Food logs table (UPDATED for photo storage)
CREATE TABLE IF NOT EXISTS food_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  meal_type TEXT CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack', 'pre-workout', 'post-workout')),
  food_name TEXT NOT NULL,
  description TEXT,
  quantity DECIMAL(8,2),
  unit TEXT,
  meal_time TIME,
  photo_url TEXT, -- For storing image URLs or base64
  calories INTEGER,
  protein_g DECIMAL(6,2),
  carbs_g DECIMAL(6,2),
  fat_g DECIMAL(6,2),
  fiber_g DECIMAL(6,2),
  sugar_g DECIMAL(6,2),
  sodium_mg DECIMAL(8,2),
  metadata JSONB, -- For storing rich context data
  logged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fitness data table
CREATE TABLE IF NOT EXISTS fitness_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  duration_minutes INTEGER,
  calories_burned INTEGER,
  steps INTEGER,
  distance_km DECIMAL(6,2),
  heart_rate_avg INTEGER,
  heart_rate_max INTEGER,
  intensity_level TEXT CHECK (intensity_level IN ('low', 'moderate', 'high', 'very_high')),
  notes TEXT,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Medical checkups table
CREATE TABLE IF NOT EXISTS medical_checkups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  checkup_type TEXT NOT NULL,
  doctor_name TEXT,
  blood_pressure_systolic INTEGER,
  blood_pressure_diastolic INTEGER,
  heart_rate_resting INTEGER,
  weight_kg DECIMAL(5,2),
  bmi DECIMAL(4,2),
  cholesterol_total INTEGER,
  cholesterol_ldl INTEGER,
  cholesterol_hdl INTEGER,
  blood_glucose INTEGER,
  notes TEXT,
  next_appointment DATE,
  checkup_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sleep data table
CREATE TABLE IF NOT EXISTS sleep_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  sleep_date DATE NOT NULL,
  bedtime TIME,
  wake_time TIME,
  total_sleep_hours DECIMAL(4,2),
  deep_sleep_hours DECIMAL(4,2),
  rem_sleep_hours DECIMAL(4,2),
  sleep_quality_score INTEGER CHECK (sleep_quality_score BETWEEN 1 AND 10),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Health coach recommendations table
CREATE TABLE IF NOT EXISTS health_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  category TEXT CHECK (category IN ('nutrition', 'fitness', 'medical', 'sleep', 'general')),
  recommendation_text TEXT NOT NULL,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  is_active BOOLEAN DEFAULT TRUE,
  context_data JSONB,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  user_feedback TEXT,
  feedback_rating INTEGER CHECK (feedback_rating BETWEEN 1 AND 5)
);

-- Chat conversations table
CREATE TABLE IF NOT EXISTS chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_user_message BOOLEAN NOT NULL,
  context_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Wearable device data tables (for recovery/sleep tracking)
CREATE TABLE IF NOT EXISTS physiological_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  "Cycle start time" TIMESTAMP WITH TIME ZONE,
  "Recovery score %" INTEGER,
  "Resting heart rate (bpm)" INTEGER,
  "Heart rate variability (ms)" DECIMAL(6,2),
  "Skin temp (celsius)" DECIMAL(4,2),
  "Blood oxygen %" DECIMAL(4,2),
  "Day Strain" DECIMAL(4,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sleep (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  "Cycle start time" TIMESTAMP WITH TIME ZONE,
  "Sleep onset" TIME,
  "Wake onset" TIME,
  "Sleep performance %" INTEGER,
  "Asleep duration (min)" INTEGER,
  "In bed duration (min)" INTEGER,
  "Light sleep duration (min)" INTEGER,
  "Deep (SWS) duration (min)" INTEGER,
  "REM duration (min)" INTEGER,
  "Awake duration (min)" INTEGER,
  "Sleep efficiency %" INTEGER,
  "Sleep debt (min)" INTEGER,
  "Respiratory rate (rpm)" DECIMAL(4,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  "Workout start time" TIMESTAMP WITH TIME ZONE,
  "Duration (min)" INTEGER,
  "Activity name" TEXT,
  "Activity Strain" DECIMAL(4,2),
  "Energy burned (cal)" INTEGER,
  "Max HR (bpm)" INTEGER,
  "Average HR (bpm)" INTEGER,
  "HR Zone 1 %" DECIMAL(4,2),
  "HR Zone 2 %" DECIMAL(4,2),
  "HR Zone 3 %" DECIMAL(4,2),
  "Distance (meters)" TEXT,
  "GPS enabled" BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS medical_lab_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  "Test Name" TEXT NOT NULL,
  "Result" DECIMAL(10,3),
  "Unit" TEXT,
  "Reference Range" TEXT,
  "Flag" TEXT,
  test_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  "Cycle start time" TIMESTAMP WITH TIME ZONE,
  entry_text TEXT,
  mood_rating INTEGER CHECK (mood_rating BETWEEN 1 AND 10),
  energy_level INTEGER CHECK (energy_level BETWEEN 1 AND 10),
  stress_level INTEGER CHECK (stress_level BETWEEN 1 AND 10),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_food_logs_user_date ON food_logs(user_id, logged_at);
CREATE INDEX IF NOT EXISTS idx_fitness_data_user_date ON fitness_data(user_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_medical_checkups_user_date ON medical_checkups(user_id, checkup_date);
CREATE INDEX IF NOT EXISTS idx_sleep_data_user_date ON sleep_data(user_id, sleep_date);
CREATE INDEX IF NOT EXISTS idx_health_recommendations_user_active ON health_recommendations(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_date ON chat_conversations(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_physiological_cycles_user_date ON physiological_cycles(user_id, "Cycle start time");
CREATE INDEX IF NOT EXISTS idx_sleep_user_date ON sleep(user_id, "Cycle start time");
CREATE INDEX IF NOT EXISTS idx_workouts_user_date ON workouts(user_id, "Workout start time");
