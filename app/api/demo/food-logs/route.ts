import { AuthService } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    // Get the authenticated user
    const authService = new AuthService();
    const cookies = request.headers.get('cookie') || '';
    const userSessionMatch = cookies.match(/user_session=([^;]*)/);
    const userSession = userSessionMatch ? userSessionMatch[1] : null;

    if (!userSession) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await authService.getUser(userSession);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Generate demo food logs
    const demoData = generateDemoFoodLogs(user.id);
    
    return Response.json(demoData);
  } catch (error) {
    console.error('Error in demo food-logs endpoint:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function generateDemoFoodLogs(userId: string) {
  const data = [];
  const now = new Date();
  
  const demoMeals = [
    {
      meal_type: "breakfast",
      food_name: "Greek Yogurt with Berries",
      calories: 320,
      protein_g: 18,
      carbs_g: 35,
      fat_g: 12,
      fiber_g: 6,
      description: "Plain Greek yogurt with mixed berries and honey",
      time_offset: 0, // today
      meal_time: "07:30:00"
    },
    {
      meal_type: "lunch", 
      food_name: "Grilled Chicken Salad",
      calories: 485,
      protein_g: 38,
      carbs_g: 22,
      fat_g: 28,
      fiber_g: 8,
      description: "Mixed greens with grilled chicken, avocado, and olive oil dressing",
      time_offset: 0,
      meal_time: "12:45:00"
    },
    {
      meal_type: "snack",
      food_name: "Apple with Almond Butter",
      calories: 195,
      protein_g: 4,
      carbs_g: 25,
      fat_g: 11,
      fiber_g: 5,
      description: "Medium apple sliced with 1 tbsp natural almond butter",
      time_offset: 0,
      meal_time: "15:20:00"
    },
    {
      meal_type: "dinner",
      food_name: "Salmon with Sweet Potato",
      calories: 620,
      protein_g: 42,
      carbs_g: 35,
      fat_g: 32,
      fiber_g: 4,
      description: "Baked salmon fillet with roasted sweet potato and broccoli",
      time_offset: 0,
      meal_time: "19:15:00"
    },
    {
      meal_type: "breakfast",
      food_name: "Oatmeal with Banana",
      calories: 380,
      protein_g: 12,
      carbs_g: 68,
      fat_g: 8,
      fiber_g: 10,
      description: "Steel-cut oats with sliced banana and walnuts",
      time_offset: 1, // yesterday
      meal_time: "07:15:00"
    },
    {
      meal_type: "lunch",
      food_name: "Turkey Sandwich",
      calories: 520,
      protein_g: 32,
      carbs_g: 48,
      fat_g: 22,
      fiber_g: 6,
      description: "Whole grain bread with turkey, lettuce, tomato, and avocado",
      time_offset: 1,
      meal_time: "13:00:00"
    },
    {
      meal_type: "dinner",
      food_name: "Quinoa Bowl",
      calories: 580,
      protein_g: 22,
      carbs_g: 75,
      fat_g: 18,
      fiber_g: 12,
      description: "Quinoa with black beans, roasted vegetables, and tahini dressing",
      time_offset: 1,
      meal_time: "18:45:00"
    },
    {
      meal_type: "breakfast",
      food_name: "Smoothie Bowl",
      calories: 420,
      protein_g: 15,
      carbs_g: 58,
      fat_g: 14,
      fiber_g: 11,
      description: "Acai smoothie bowl with granola, coconut, and fresh fruit",
      time_offset: 2, // 2 days ago
      meal_time: "08:00:00"
    }
  ];
  
  demoMeals.forEach((meal, index) => {
    const date = new Date(now);
    date.setDate(date.getDate() - meal.time_offset);
    date.setHours(parseInt(meal.meal_time.split(':')[0]), parseInt(meal.meal_time.split(':')[1]), 0, 0);
    
    data.push({
      id: `demo-food-${userId}-${index}`,
      user_id: userId,
      logged_at: date.toISOString(),
      meal_type: meal.meal_type,
      food_name: meal.food_name,
      description: meal.description,
      quantity: 1,
      unit: "serving",
      meal_time: meal.meal_time,
      calories: meal.calories,
      protein_g: meal.protein_g,
      carbs_g: meal.carbs_g,
      fat_g: meal.fat_g,
      fiber_g: meal.fiber_g,
      sugar_g: Math.round(meal.carbs_g * 0.3), // Estimate
      sodium_mg: Math.round(meal.calories * 2), // Rough estimate
      potassium_mg: Math.round(meal.calories * 3),
      calcium_mg: Math.round(meal.protein_g * 8),
      iron_mg: Math.round(meal.calories * 0.02),
      vitamin_c_mg: Math.round(meal.fiber_g * 2),
      location: index % 3 === 0 ? "Home" : index % 3 === 1 ? "Office" : "Restaurant",
      social_context: index % 4 === 0 ? "alone" : index % 4 === 1 ? "family" : index % 4 === 2 ? "friends" : "colleagues",
      hunger_level: 5 + Math.round(Math.random() * 4),
      mood_before: ["relaxed", "excited", "neutral", "tired"][index % 4],
      mood_after: ["satisfied", "energetic", "content", "full"][index % 4],
      portion_size: ["normal", "large", "small"][index % 3],
      preparation_method: meal.description.includes("baked") ? "Baked" : 
                         meal.description.includes("grilled") ? "Grilled" :
                         meal.description.includes("roasted") ? "Roasted" : "Fresh",
      health_score: 70 + Math.round(Math.random() * 25),
      ai_recommendations: [
        "Great protein content for muscle recovery",
        "Good balance of macronutrients",
        "Consider adding more vegetables for fiber"
      ],
      analysis_metadata: {
        healthAssessment: {
          score: 70 + Math.round(Math.random() * 25),
          category: "good",
          concerns: [],
          positives: ["Balanced nutrition", "Good portion size"]
        },
        contextualInsights: ["Meal timing aligns well with your daily schedule"],
        improvementSuggestions: ["Try to include more colorful vegetables"]
      },
      notes: "Demo meal entry - nutritionally balanced",
      photo_url: null,
      created_at: date.toISOString(),
      updated_at: date.toISOString()
    });
  });
  
  return data;
}