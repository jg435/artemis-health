-- Add nutrition tables to complement existing health tracking schema

-- Food logs table (matches your existing naming conventions, no foreign key constraints)
CREATE TABLE IF NOT EXISTS public.food_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "Cycle start time" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "Cycle end time" TIMESTAMP WITH TIME ZONE NULL,
  "Cycle timezone" TEXT DEFAULT 'UTC',
  "Meal type" TEXT CHECK ("Meal type" IN ('breakfast', 'lunch', 'dinner', 'snack', 'pre-workout', 'post-workout')),
  "Food name" TEXT NOT NULL,
  "Description" TEXT,
  "Quantity" DOUBLE PRECISION DEFAULT 1,
  "Unit" TEXT DEFAULT 'serving',
  "Meal time" TIME,
  "Photo URL" TEXT,
  "Calories" BIGINT,
  "Protein (g)" DOUBLE PRECISION,
  "Carbs (g)" DOUBLE PRECISION,
  "Fat (g)" DOUBLE PRECISION,
  "Fiber (g)" DOUBLE PRECISION,
  "Sugar (g)" DOUBLE PRECISION,
  "Sodium (mg)" DOUBLE PRECISION,
  "Potassium (mg)" DOUBLE PRECISION,
  "Calcium (mg)" DOUBLE PRECISION,
  "Iron (mg)" DOUBLE PRECISION,
  "Vitamin C (mg)" DOUBLE PRECISION,
  "Location" TEXT,
  "Social context" TEXT,
  "Hunger level" BIGINT CHECK ("Hunger level" BETWEEN 1 AND 10),
  "Mood before" TEXT,
  "Mood after" TEXT,
  "Portion size" TEXT,
  "Preparation method" TEXT,
  "Health score" BIGINT CHECK ("Health score" BETWEEN 0 AND 100),
  "AI recommendations" JSONB,
  "Analysis metadata" JSONB,
  "Notes" TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
) TABLESPACE pg_default;

-- Nutrition goals table (no foreign key constraints)
CREATE TABLE IF NOT EXISTS public.nutrition_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "Goal type" TEXT NOT NULL, -- 'daily', 'weekly', 'custom'
  "Target calories" BIGINT,
  "Target protein (g)" DOUBLE PRECISION,
  "Target carbs (g)" DOUBLE PRECISION,
  "Target fat (g)" DOUBLE PRECISION,
  "Target fiber (g)" DOUBLE PRECISION,
  "Target sodium (mg)" DOUBLE PRECISION,
  "Activity level" TEXT CHECK ("Activity level" IN ('sedentary', 'lightly_active', 'moderately_active', 'very_active')),
  "Health goals" TEXT[],
  "Start date" DATE DEFAULT CURRENT_DATE,
  "End date" DATE,
  "Is active" BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
) TABLESPACE pg_default;

-- Health recommendations table (no foreign key constraints)
CREATE TABLE IF NOT EXISTS public.health_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "Cycle start time" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "Category" TEXT CHECK ("Category" IN ('nutrition', 'fitness', 'medical', 'sleep', 'recovery', 'general')),
  "Recommendation text" TEXT NOT NULL,
  "Priority" TEXT CHECK ("Priority" IN ('low', 'medium', 'high', 'urgent')),
  "Is active" BOOLEAN DEFAULT TRUE,
  "Context data" JSONB,
  "User feedback" TEXT,
  "Feedback rating" BIGINT CHECK ("Feedback rating" BETWEEN 1 AND 5),
  "Expires at" TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
) TABLESPACE pg_default;

-- Chat conversations table (no foreign key constraints)
CREATE TABLE IF NOT EXISTS public.chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "Cycle start time" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "Message" TEXT NOT NULL,
  "Is user message" BOOLEAN NOT NULL,
  "Context data" JSONB,
  "Response metadata" JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
) TABLESPACE pg_default;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_food_logs_cycle_start ON food_logs("Cycle start time");
CREATE INDEX IF NOT EXISTS idx_food_logs_meal_type ON food_logs("Meal type");
CREATE INDEX IF NOT EXISTS idx_nutrition_goals_active ON nutrition_goals("Is active");
CREATE INDEX IF NOT EXISTS idx_health_recommendations_active ON health_recommendations("Is active");
CREATE INDEX IF NOT EXISTS idx_health_recommendations_category ON health_recommendations("Category");
CREATE INDEX IF NOT EXISTS idx_chat_conversations_cycle_start ON chat_conversations("Cycle start time");

-- Insert default nutrition goals
INSERT INTO nutrition_goals (
  "Goal type",
  "Target calories",
  "Target protein (g)",
  "Target carbs (g)",
  "Target fat (g)",
  "Target fiber (g)",
  "Target sodium (mg)",
  "Activity level",
  "Health goals"
) VALUES (
  'daily',
  2200,
  140,
  220,
  75,
  25,
  2300,
  'moderately_active',
  ARRAY['maintain_weight', 'improve_energy', 'optimize_recovery']
) ON CONFLICT DO NOTHING;
