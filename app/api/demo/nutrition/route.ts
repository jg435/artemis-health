import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Check if a specific date is requested
    const { searchParams } = new URL(request.url);
    const requestedDate = searchParams.get('date');
    
    // Generate demo meals with hardcoded data
    const demoMeals = [];
    const now = new Date();

    // Generate meals for the past 7 days with specific calorie targets
    const dailyCalorieTargets = [1800, 2200, 2800, 2500, 3000, 2300, 2600]; // Today (1800) to 6 days ago
    
    dailyCalorieTargets.forEach((targetCalories, dayIndex) => {
      const date = new Date();
      date.setDate(date.getDate() - dayIndex);
      // Keep the original time for meals, don't reset to 0
      
      // Distribute calories across meals: breakfast 25%, lunch 35%, dinner 35%, snack 5%
      const breakfastCals = Math.round(targetCalories * 0.25);
      const lunchCals = Math.round(targetCalories * 0.35);
      const dinnerCals = Math.round(targetCalories * 0.35);
      const snackCals = targetCalories - breakfastCals - lunchCals - dinnerCals;
      
      const meals = [
        { name: "Greek Yogurt with Berries", calories: breakfastCals, meal: "breakfast", hour: 8 },
        { name: "Grilled Chicken Salad", calories: lunchCals, meal: "lunch", hour: 13 },
        { name: "Grilled Steak with Vegetables", calories: dinnerCals, meal: "dinner", hour: 19 },
        { name: "Protein Shake", calories: snackCals, meal: "snack", hour: 15 }
      ];
      
      meals.forEach((food, mealIndex) => {
        const mealDate = new Date(date);
        mealDate.setHours(food.hour, Math.floor(Math.random() * 60), 0, 0);
        
        // Calculate macros based on calories (roughly 4 cal/g protein/carbs, 9 cal/g fat)
        const protein = Math.round(food.calories * 0.25 / 4); // 25% protein
        const carbs = Math.round(food.calories * 0.45 / 4);   // 45% carbs  
        const fat = Math.round(food.calories * 0.30 / 9);     // 30% fat

        demoMeals.push({
          id: `demo-${dayIndex}-${mealIndex}`,
          user_id: `demo-user-${Date.now()}`,
          meal_type: food.meal,
          food_name: food.name,
          quantity: 1,
          unit: "serving",
          calories: food.calories,
          protein_g: protein,
          carbs_g: carbs,
          fat_g: fat,
          fiber_g: Math.round((2 + Math.random() * 8) * 10) / 10,
          sugar_g: Math.round((5 + Math.random() * 15) * 10) / 10,
          sodium_mg: Math.round(200 + Math.random() * 800),
          meal_time: mealDate.toTimeString().split(' ')[0].substring(0, 5),
          logged_at: mealDate.toISOString(),
          created_at: mealDate.toISOString()
        });
      });
    });

    demoMeals.sort((a, b) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime());

    // Filter by requested date if provided
    let filteredMeals = demoMeals;
    if (requestedDate) {
      filteredMeals = demoMeals.filter(meal => {
        const mealDate = new Date(meal.logged_at).toISOString().split('T')[0];
        return mealDate === requestedDate;
      });
    }

    return NextResponse.json({
      meals: filteredMeals,
      totalCount: filteredMeals.length
    });

  } catch (error) {
    console.error('Demo nutrition endpoint error:', error);
    return NextResponse.json(
      { error: 'Failed to generate demo data' },
      { status: 500 }
    );
  }
}
