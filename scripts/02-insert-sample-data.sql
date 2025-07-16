-- Insert sample user
INSERT INTO users (id, email, name, age, gender, height_cm, weight_kg, activity_level, health_goals) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'john.doe@example.com', 'John Doe', 32, 'male', 175, 75.5, 'moderately_active', 
 ARRAY['lose_weight', 'improve_cardiovascular_health', 'build_muscle']);

-- Insert sample food logs (last 7 days)
INSERT INTO food_logs (user_id, meal_type, food_name, quantity, unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, logged_at) VALUES
-- Day 1 (Today)
('550e8400-e29b-41d4-a716-446655440000', 'breakfast', 'Oatmeal with berries', 1, 'bowl', 320, 12, 58, 6, 8, 12, 180, NOW() - INTERVAL '0 days'),
('550e8400-e29b-41d4-a716-446655440000', 'lunch', 'Grilled chicken salad', 1, 'serving', 450, 35, 15, 28, 5, 8, 890, NOW() - INTERVAL '0 days'),
('550e8400-e29b-41d4-a716-446655440000', 'dinner', 'Salmon with quinoa', 1, 'serving', 580, 42, 45, 22, 6, 3, 420, NOW() - INTERVAL '0 days'),
('550e8400-e29b-41d4-a716-446655440000', 'snack', 'Greek yogurt', 1, 'cup', 150, 20, 9, 0, 0, 9, 65, NOW() - INTERVAL '0 days'),

-- Day 2 (Yesterday)
('550e8400-e29b-41d4-a716-446655440000', 'breakfast', 'Scrambled eggs with toast', 1, 'serving', 380, 22, 28, 18, 3, 2, 520, NOW() - INTERVAL '1 day'),
('550e8400-e29b-41d4-a716-446655440000', 'lunch', 'Turkey sandwich', 1, 'sandwich', 420, 28, 45, 12, 4, 6, 1200, NOW() - INTERVAL '1 day'),
('550e8400-e29b-41d4-a716-446655440000', 'dinner', 'Pasta with marinara', 1, 'serving', 520, 18, 78, 12, 6, 12, 680, NOW() - INTERVAL '1 day'),
('550e8400-e29b-41d4-a716-446655440000', 'snack', 'Apple with peanut butter', 1, 'serving', 280, 8, 25, 16, 5, 18, 150, NOW() - INTERVAL '1 day'),

-- Day 3-7 (Previous days with varying patterns)
('550e8400-e29b-41d4-a716-446655440000', 'breakfast', 'Protein smoothie', 1, 'glass', 290, 25, 35, 8, 6, 28, 120, NOW() - INTERVAL '2 days'),
('550e8400-e29b-41d4-a716-446655440000', 'lunch', 'Quinoa bowl', 1, 'bowl', 480, 18, 65, 15, 8, 5, 450, NOW() - INTERVAL '2 days'),
('550e8400-e29b-41d4-a716-446655440000', 'dinner', 'Grilled steak with vegetables', 1, 'serving', 620, 45, 20, 35, 4, 8, 580, NOW() - INTERVAL '2 days'),

-- Continue with more varied data for analysis
('550e8400-e29b-41d4-a716-446655440000', 'breakfast', 'Pancakes with syrup', 1, 'serving', 520, 8, 78, 18, 2, 45, 890, NOW() - INTERVAL '3 days'),
('550e8400-e29b-41d4-a716-446655440000', 'lunch', 'Fast food burger', 1, 'burger', 680, 25, 45, 42, 3, 8, 1450, NOW() - INTERVAL '3 days'),
('550e8400-e29b-41d4-a716-446655440000', 'dinner', 'Pizza', 2, 'slices', 580, 24, 58, 26, 4, 6, 1200, NOW() - INTERVAL '3 days');

-- Insert sample fitness data
INSERT INTO fitness_data (user_id, activity_type, duration_minutes, calories_burned, steps, distance_km, heart_rate_avg, heart_rate_max, intensity_level, recorded_at) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'Running', 30, 420, 4200, 5.2, 145, 165, 'high', NOW() - INTERVAL '0 days'),
('550e8400-e29b-41d4-a716-446655440000', 'Weight Training', 45, 280, 800, 0, 120, 140, 'moderate', NOW() - INTERVAL '1 day'),
('550e8400-e29b-41d4-a716-446655440000', 'Walking', 60, 220, 7500, 6.0, 95, 110, 'low', NOW() - INTERVAL '2 days'),
('550e8400-e29b-41d4-a716-446655440000', 'Cycling', 40, 380, 0, 15.5, 135, 155, 'moderate', NOW() - INTERVAL '3 days'),
('550e8400-e29b-41d4-a716-446655440000', 'Yoga', 30, 150, 200, 0, 85, 95, 'low', NOW() - INTERVAL '4 days'),
('550e8400-e29b-41d4-a716-446655440000', 'Swimming', 35, 450, 0, 1.2, 140, 160, 'high', NOW() - INTERVAL '5 days'),
('550e8400-e29b-41d4-a716-446655440000', 'Rest Day', 0, 0, 3200, 2.5, 0, 0, 'low', NOW() - INTERVAL '6 days');

-- Insert sample medical checkup data
INSERT INTO medical_checkups (user_id, checkup_type, doctor_name, blood_pressure_systolic, blood_pressure_diastolic, heart_rate_resting, weight_kg, bmi, cholesterol_total, cholesterol_ldl, cholesterol_hdl, blood_glucose, checkup_date, next_appointment) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'Annual Physical', 'Dr. Sarah Johnson', 125, 82, 68, 75.5, 24.7, 195, 120, 55, 92, NOW() - INTERVAL '30 days', NOW() + INTERVAL '335 days'),
('550e8400-e29b-41d4-a716-446655440000', 'Blood Work', 'Dr. Sarah Johnson', 120, 78, 65, 74.8, 24.4, 188, 115, 58, 88, NOW() - INTERVAL '90 days', NOW() + INTERVAL '275 days');

-- Insert sample sleep data
INSERT INTO sleep_data (user_id, sleep_date, bedtime, wake_time, total_sleep_hours, deep_sleep_hours, rem_sleep_hours, sleep_quality_score) VALUES
('550e8400-e29b-41d4-a716-446655440000', CURRENT_DATE - 1, '23:30', '07:00', 7.5, 2.1, 1.8, 8),
('550e8400-e29b-41d4-a716-446655440000', CURRENT_DATE - 2, '23:45', '06:45', 7.0, 1.9, 1.6, 7),
('550e8400-e29b-41d4-a716-446655440000', CURRENT_DATE - 3, '00:15', '07:30', 7.25, 2.0, 1.7, 7),
('550e8400-e29b-41d4-a716-446655440000', CURRENT_DATE - 4, '23:00', '06:30', 7.5, 2.2, 1.9, 9),
('550e8400-e29b-41d4-a716-446655440000', CURRENT_DATE - 5, '01:00', '08:00', 7.0, 1.8, 1.5, 6),
('550e8400-e29b-41d4-a716-446655440000', CURRENT_DATE - 6, '23:15', '06:45', 7.5, 2.1, 1.8, 8),
('550e8400-e29b-41d4-a716-446655440000', CURRENT_DATE - 7, '22:45', '06:15', 7.5, 2.3, 2.0, 9);

-- Insert sample health recommendations
INSERT INTO health_recommendations (user_id, category, recommendation_text, priority, context_data, generated_at) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'nutrition', 'Your protein intake has been excellent this week, averaging 28g per meal. Consider maintaining this pattern to support your muscle-building goals.', 'low', '{"avg_protein_per_meal": 28, "goal": "build_muscle"}', NOW() - INTERVAL '1 day'),
('550e8400-e29b-41d4-a716-446655440000', 'fitness', 'Great job on your running consistency! Your average heart rate during cardio sessions shows good cardiovascular fitness. Try adding one more high-intensity session this week.', 'medium', '{"avg_cardio_hr": 145, "sessions_this_week": 3}', NOW() - INTERVAL '2 days'),
('550e8400-e29b-41d4-a716-446655440000', 'medical', 'Your recent blood pressure readings (125/82) are in the normal range but trending slightly higher. Consider reducing sodium intake - you averaged 750mg per meal this week.', 'medium', '{"bp_systolic": 125, "bp_diastolic": 82, "avg_sodium_mg": 750}', NOW() - INTERVAL '3 days');
