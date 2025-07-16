import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { AuthService } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const foodEntry = await request.json();

    if (!isSupabaseConfigured() || !supabaseAdmin) {
      console.log("Demo mode – would save food entry:", {
        timestamp: foodEntry.timestamp,
        mealType: foodEntry.metadata.mealType,
        calories: foodEntry.analysis.nutritionalAnalysis.calories,
      });
      return Response.json({ success: true, id: Date.now().toString() });
    }

    // Map incoming payload into your snake_case columns
    const dbEntry = {
      logged_at:              foodEntry.timestamp || new Date().toISOString(),  // ISO string
      user_id:                foodEntry.userId, // Use actual user ID from request

      meal_type:              foodEntry.metadata.mealType,
      food_name:              `Photo meal - ${foodEntry.metadata.mealType}`,
      description:            foodEntry.metadata.notes,
      quantity:               1,
      unit:                   "serving",
      meal_time:              foodEntry.metadata.mealTime,           // e.g. "12:34:00"

      photo_url:              foodEntry.photo,                       // public URL or base64

      calories:               foodEntry.analysis.nutritionalAnalysis.calories,
      protein_g:              foodEntry.analysis.nutritionalAnalysis.macros.protein,
      carbs_g:                foodEntry.analysis.nutritionalAnalysis.macros.carbs,
      fat_g:                  foodEntry.analysis.nutritionalAnalysis.macros.fat,
      fiber_g:                foodEntry.analysis.nutritionalAnalysis.macros.fiber,
      sugar_g:                foodEntry.analysis.nutritionalAnalysis.macros.sugar,

      sodium_mg:              foodEntry.analysis.nutritionalAnalysis.micronutrients.sodium_mg,
      potassium_mg:           foodEntry.analysis.nutritionalAnalysis.micronutrients.potassium_mg,
      calcium_mg:             foodEntry.analysis.nutritionalAnalysis.micronutrients.calcium_mg,
      iron_mg:                foodEntry.analysis.nutritionalAnalysis.micronutrients.iron_mg,
      vitamin_c_mg:           foodEntry.analysis.nutritionalAnalysis.micronutrients.vitamin_c_mg,

      location:               foodEntry.metadata.location,
      social_context:         foodEntry.metadata.socialContext,
      hunger_level:           foodEntry.metadata.hungerLevel,
      mood_before:            foodEntry.metadata.moodBefore,
      mood_after:             foodEntry.metadata.moodAfter,
      portion_size:           foodEntry.metadata.portionSize,
      preparation_method:     foodEntry.metadata.preparationMethod,

      health_score:           foodEntry.analysis.healthAssessment.score,

      ai_recommendations:     foodEntry.analysis.personalizedRecommendations,
      analysis_metadata:      {
        healthAssessment:        foodEntry.analysis.healthAssessment,
        contextualInsights:      foodEntry.analysis.contextualInsights,
        improvementSuggestions:  foodEntry.analysis.improvementSuggestions,
      },

      notes:                  foodEntry.metadata.notes,
    };

    const { data, error } = await supabaseAdmin
      .from("food_logs")
      .insert(dbEntry)
      .select()
      .single();

    if (error) {
      console.error("Supabase error:", error);
      throw error;
    }

    return Response.json({ success: true, data });
  } catch (err) {
    console.error("Error saving food entry:", err);
    return Response.json(
      { error: "Failed to save food entry" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    // Get the authenticated user
    const authService = new AuthService();
    const cookies = request.headers.get('cookie') || '';
    const userSessionMatch = cookies.match(/user_session=([^;]*)/);
    const userSession = userSessionMatch ? userSessionMatch[1] : null;

    if (!userSession) {
      return Response.json({ foodEntries: [] });
    }

    const user = await authService.getUser(userSession);
    if (!user) {
      return Response.json({ foodEntries: [] });
    }

    // If it's a demo user, return empty array (they use demo endpoints)
    if (user.isDemo) {
      return Response.json({ foodEntries: [] });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const date  = searchParams.get("date");

    if (!isSupabaseConfigured() || !supabaseAdmin) {
      return Response.json({ foodEntries: [] });
    }

    let query = supabaseAdmin
      .from("food_logs")
      .select("*")
      .eq("user_id", user.id) // Filter by user_id
      .order("logged_at", { ascending: false });

    if (date) {
      const startOfDay = `${date}T00:00:00Z`;
      const endOfDay   = `${date}T23:59:59Z`;
      query = query
        .gte("logged_at", startOfDay)
        .lte("logged_at", endOfDay);
    }

    const { data: rows, error } = await query.limit(limit);

    if (error) {
      console.error("Supabase error:", error);
      throw error;
    }

    const foodEntries = (rows || []).map((entry) => ({
      id:             entry.id,
      meal_type:      entry.meal_type,
      food_name:      entry.food_name,
      calories:       entry.calories,
      logged_at:      entry.logged_at,
      photo_url:      entry.photo_url,
      metadata: {
        location:            entry.location,
        socialContext:       entry.social_context,
        hungerLevel:         entry.hunger_level,
        moodBefore:          entry.mood_before,
        moodAfter:           entry.mood_after,
        portionSize:         entry.portion_size,
        preparationMethod:   entry.preparation_method,
        healthScore:         entry.health_score,
        recommendations:     entry.ai_recommendations,
      },
    }));

    return Response.json({ foodEntries });
  } catch (err) {
    console.error("Error fetching food entries:", err);
    return Response.json(
      { error: "Failed to fetch food entries" },
      { status: 500 }
    );
  }
}
