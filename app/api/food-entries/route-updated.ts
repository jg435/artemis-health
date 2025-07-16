import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase"

export async function POST(request: Request) {
  try {
    const foodEntry = await request.json()

    if (!isSupabaseConfigured() || !supabaseAdmin) {
      // In demo mode, just return success
      console.log("Demo mode - would save food entry:", {
        timestamp: foodEntry.timestamp,
        mealType: foodEntry.metadata.mealType,
        calories: foodEntry.analysis.nutritionalAnalysis.calories,
      })
      return Response.json({ success: true, id: Date.now().toString() })
    }

    // Save to food_logs table (updated to match your schema)
    const dbEntry = {
      "Cycle start time": foodEntry.timestamp,
      "Meal type": foodEntry.metadata.mealType,
      "Food name": `Photo meal - ${foodEntry.metadata.mealType}`,
      Description: foodEntry.metadata.notes,
      Quantity: 1,
      Unit: "serving",
      "Meal time": foodEntry.metadata.mealTime,
      "Photo URL": foodEntry.photo, // Image stored here (base64 or URL)
      Calories: foodEntry.analysis.nutritionalAnalysis.calories,
      "Protein (g)": foodEntry.analysis.nutritionalAnalysis.macros.protein,
      "Carbs (g)": foodEntry.analysis.nutritionalAnalysis.macros.carbs,
      "Fat (g)": foodEntry.analysis.nutritionalAnalysis.macros.fat,
      "Fiber (g)": foodEntry.analysis.nutritionalAnalysis.macros.fiber,
      "Sodium (mg)": foodEntry.analysis.nutritionalAnalysis.micronutrients.sodium_mg,
      "Potassium (mg)": foodEntry.analysis.nutritionalAnalysis.micronutrients.potassium_mg,
      "Calcium (mg)": foodEntry.analysis.nutritionalAnalysis.micronutrients.calcium_mg,
      "Iron (mg)": foodEntry.analysis.nutritionalAnalysis.micronutrients.iron_mg,
      "Vitamin C (mg)": foodEntry.analysis.nutritionalAnalysis.micronutrients.vitamin_c_mg,
      // Rich metadata stored in dedicated columns
      Location: foodEntry.metadata.location,
      "Social context": foodEntry.metadata.socialContext,
      "Hunger level": foodEntry.metadata.hungerLevel,
      "Mood before": foodEntry.metadata.moodBefore,
      "Mood after": foodEntry.metadata.moodAfter,
      "Portion size": foodEntry.metadata.portionSize,
      "Preparation method": foodEntry.metadata.preparationMethod,
      "Health score": foodEntry.analysis.healthAssessment.score,
      "AI recommendations": foodEntry.analysis.personalizedRecommendations,
      "Analysis metadata": {
        healthAssessment: foodEntry.analysis.healthAssessment,
        contextualInsights: foodEntry.analysis.contextualInsights,
        improvementSuggestions: foodEntry.analysis.improvementSuggestions,
      },
      Notes: foodEntry.metadata.notes,
    }

    const { data, error } = await supabaseAdmin.from("food_logs").insert(dbEntry).select().single()

    if (error) {
      throw error
    }

    return Response.json({ success: true, data })
  } catch (error) {
    console.error("Error saving food entry:", error)
    return Response.json({ error: "Failed to save food entry" }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Number.parseInt(searchParams.get("limit") || "10")
    const date = searchParams.get("date")

    if (!isSupabaseConfigured() || !supabaseAdmin) {
      // Return mock data in demo mode
      return Response.json({ foodEntries: [] })
    }

    let query = supabaseAdmin.from("food_logs").select("*").order("Cycle start time", { ascending: false })

    if (date) {
      const startOfDay = `${date}T00:00:00Z`
      const endOfDay = `${date}T23:59:59Z`
      query = query.gte("Cycle start time", startOfDay).lte("Cycle start time", endOfDay)
    }

    const { data: foodEntries, error } = await query.limit(limit)

    if (error) {
      throw error
    }

    // Transform data to match component expectations
    const transformedEntries =
      foodEntries?.map((entry) => ({
        id: entry.id,
        meal_type: entry["Meal type"],
        food_name: entry["Food name"],
        calories: entry["Calories"],
        logged_at: entry["Cycle start time"],
        photo_url: entry["Photo URL"],
        metadata: JSON.stringify({
          location: entry["Location"],
          socialContext: entry["Social context"],
          hungerLevel: entry["Hunger level"],
          moodBefore: entry["Mood before"],
          moodAfter: entry["Mood after"],
          portionSize: entry["Portion size"],
          preparationMethod: entry["Preparation method"],
          healthScore: entry["Health score"],
          recommendations: entry["AI recommendations"],
        }),
      })) || []

    return Response.json({ foodEntries: transformedEntries })
  } catch (error) {
    console.error("Error fetching food entries:", error)
    return Response.json({ error: "Failed to fetch food entries" }, { status: 500 })
  }
}
