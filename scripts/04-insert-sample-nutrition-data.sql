-- Insert sample nutrition data to test the system

-- Sample food logs with rich metadata
INSERT INTO food_logs (
  "Cycle start time",
  "Meal type",
  "Food name",
  "Description",
  "Quantity",
  "Unit",
  "Meal time",
  "Calories",
  "Protein (g)",
  "Carbs (g)",
  "Fat (g)",
  "Fiber (g)",
  "Sugar (g)",
  "Sodium (mg)",
  "Location",
  "Social context",
  "Hunger level",
  "Mood before",
  "Portion size",
  "Preparation method",
  "Health score",
  "Notes"
) VALUES
-- Today's meals
(NOW() - INTERVAL '8 hours', 'breakfast', 'Oatmeal with berries and almonds', 'Steel-cut oats with fresh blueberries, sliced almonds, and honey', 1, 'bowl', '07:30', 380, 12, 58, 14, 8, 12, 180, 'Home', 'alone', 7, 'tired', 'normal', 'cooked', 85, 'Great start to the day'),

(NOW() - INTERVAL '4 hours', 'lunch', 'Grilled chicken salad', 'Mixed greens with grilled chicken breast, cherry tomatoes, cucumber, avocado', 1, 'large bowl', '12:45', 450, 35, 15, 28, 8, 6, 890, 'Office', 'colleagues', 6, 'focused', 'normal', 'grilled', 90, 'Very satisfying and healthy'),

(NOW() - INTERVAL '1 hour', 'snack', 'Greek yogurt with nuts', 'Plain Greek yogurt with mixed nuts and a drizzle of honey', 1, 'cup', '15:30', 220, 18, 12, 12, 2, 10, 65, 'Office', 'alone', 4, 'energetic', 'small', 'raw', 80, 'Perfect afternoon snack'),

-- Yesterday's meals
(NOW() - INTERVAL '1 day 8 hours', 'breakfast', 'Scrambled eggs with toast', 'Two eggs scrambled with whole grain toast and avocado', 1, 'serving', '07:15', 420, 22, 28, 24, 6, 3, 520, 'Home', 'family', 8, 'hungry', 'normal', 'scrambled', 75, 'Classic breakfast'),

(NOW() - INTERVAL '1 day 4 hours', 'lunch', 'Quinoa power bowl', 'Quinoa with roasted vegetables, chickpeas, and tahini dressing', 1, 'bowl', '13:00', 520, 18, 65, 18, 12, 8, 450, 'Restaurant', 'friends', 7, 'happy', 'large', 'roasted', 95, 'Amazing flavors and very filling'),

(NOW() - INTERVAL '1 day', 'dinner', 'Salmon with sweet potato', 'Baked salmon with roasted sweet potato and steamed broccoli', 1, 'plate', '19:30', 580, 42, 45, 22, 8, 12, 420, 'Home', 'family', 8, 'relaxed', 'normal', 'baked', 92, 'Perfect recovery meal after workout');

-- Sample health recommendations
INSERT INTO health_recommendations (
  "Category",
  "Recommendation text",
  "Priority",
  "Context data"
) VALUES
('nutrition', 'Your protein intake has been excellent this week, averaging 28g per meal. This supports your recovery and muscle-building goals perfectly. Keep up the great work!', 'low', '{"avg_protein_per_meal": 28, "goal": "muscle_building", "trend": "positive"}'),

('nutrition', 'Consider adding more omega-3 rich foods like salmon or walnuts to support recovery. Your recent high-strain workouts would benefit from anti-inflammatory nutrients.', 'medium', '{"recent_strain": 15.2, "omega3_intake": "low", "recovery_score": 68}'),

('nutrition', 'Your meal timing around workouts is optimal! Eating within 2 hours post-workout helps maximize recovery. Your protein intake post-exercise has been consistent.', 'low', '{"post_workout_timing": "excellent", "protein_timing": "optimal"}'),

('general', 'Your sleep quality (85% avg) and nutrition choices are working well together. The magnesium from your evening meals may be contributing to better sleep onset.', 'low', '{"sleep_quality": 85, "magnesium_sources": ["almonds", "spinach"], "correlation": "positive"}');

-- Sample chat conversations
INSERT INTO chat_conversations (
  "Message",
  "Is user message",
  "Context data"
) VALUES
('Hi! I just had a great salmon dinner. How does this support my recovery?', true, '{"meal_context": "post_workout", "food_type": "salmon", "timing": "evening"}'),

('Excellent choice! Salmon is rich in omega-3 fatty acids and high-quality protein, which are perfect for recovery. The omega-3s help reduce inflammation from your workout, while the protein (about 42g) supports muscle repair. Eating this 2 hours post-workout is ideal timing for nutrient uptake. Your recovery score should benefit from this meal! 🐟💪', false, '{"nutrition_analysis": true, "recovery_benefits": ["omega3", "protein", "timing"], "estimated_recovery_impact": "positive"}'),

('What should I eat before my morning workout tomorrow?', true, '{"workout_timing": "morning", "meal_planning": true}'),

('For morning workouts, aim for something light but energizing 30-60 minutes before. Try a banana with a small amount of nut butter, or oatmeal with berries. This provides quick carbs for energy without being too heavy. Based on your recent meals, you respond well to oats, so that might be perfect! Stay hydrated too. 🌅🍌', false, '{"meal_timing": "pre_workout", "recommendations": ["banana", "oats", "hydration"], "personalized": true}');
