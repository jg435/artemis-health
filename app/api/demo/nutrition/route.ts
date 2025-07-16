import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Generate demo meals with hardcoded data
    const demoMeals = [];
    const now = new Date();

    const sampleFoods = [
      // Breakfast
      { name: "Greek Yogurt with Berries", calories: 180, protein: 15, carbs: 20, fat: 5, meal: "breakfast" },
      { name: "Oatmeal with Banana", calories: 220, protein: 8, carbs: 45, fat: 4, meal: "breakfast" },
      { name: "Scrambled Eggs with Toast", calories: 320, protein: 20, carbs: 25, fat: 15, meal: "breakfast" },
      { name: "Smoothie Bowl", calories: 280, protein: 12, carbs: 35, fat: 8, meal: "breakfast" },
      
      // Lunch
      { name: "Grilled Chicken Salad", calories: 350, protein: 35, carbs: 15, fat: 18, meal: "lunch" },
      { name: "Turkey Sandwich", calories: 420, protein: 25, carbs: 40, fat: 16, meal: "lunch" },
      { name: "Quinoa Buddha Bowl", calories: 380, protein: 18, carbs: 45, fat: 14, meal: "lunch" },
      { name: "Salmon with Rice", calories: 450, protein: 30, carbs: 35, fat: 20, meal: "lunch" },
      
      // Dinner
      { name: "Grilled Steak with Vegetables", calories: 520, protein: 40, carbs: 20, fat: 28, meal: "dinner" },
      { name: "Pasta with Marinara", calories: 480, protein: 18, carbs: 65, fat: 12, meal: "dinner" },
      { name: "Baked Cod with Sweet Potato", calories: 380, protein: 35, carbs: 30, fat: 8, meal: "dinner" },
      { name: "Chicken Stir Fry", calories: 420, protein: 32, carbs: 25, fat: 20, meal: "dinner" },
      
      // Snacks
      { name: "Apple with Peanut Butter", calories: 190, protein: 8, carbs: 20, fat: 12, meal: "snack" },
      { name: "Protein Shake", calories: 150, protein: 25, carbs: 8, fat: 3, meal: "snack" },
      { name: "Mixed Nuts", calories: 170, protein: 6, carbs: 6, fat: 15, meal: "snack" },
      { name: "Greek Yogurt", calories: 120, protein: 15, carbs: 8, fat: 3, meal: "snack" }
    ];

    const repeatedFoods = [...sampleFoods, ...sampleFoods];

    repeatedFoods.forEach((food, index) => {
      const daysAgo = Math.floor(Math.random() * 7);
      const date = new Date(now);
      date.setDate(now.getDate() - daysAgo);

      const baseHour = food.meal === "breakfast" ? 8 :
                      food.meal === "lunch" ? 13 :
                      food.meal === "dinner" ? 19 : 15;
      date.setHours(baseHour + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60), 0, 0);

      const variation = 0.8 + (Math.random() * 0.4); // 80–120%

      demoMeals.push({
        id: `demo-${index}`,
        user_id: `demo-user-${Date.now()}`,
        meal_type: food.meal,
        food_name: food.name,
        quantity: 1,
        unit: "serving",
        calories: Math.round(food.calories * variation),
        protein_g: Math.round(food.protein * variation * 10) / 10,
        carbs_g: Math.round(food.carbs * variation * 10) / 10,
        fat_g: Math.round(food.fat * variation * 10) / 10,
        fiber_g: Math.round((2 + Math.random() * 8) * 10) / 10,
        sugar_g: Math.round((5 + Math.random() * 15) * 10) / 10,
        sodium_mg: Math.round(200 + Math.random() * 800),
        meal_time: date.toTimeString().split(' ')[0].substring(0, 5),
        logged_at: date.toISOString(),
        created_at: date.toISOString()
      });
    });

    demoMeals.sort((a, b) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime());

    return NextResponse.json({
      meals: demoMeals,
      totalCount: demoMeals.length
    });

  } catch (error) {
    console.error('Demo nutrition endpoint error:', error);
    return NextResponse.json(
      { error: 'Failed to generate demo data' },
      { status: 500 }
    );
  }
}
