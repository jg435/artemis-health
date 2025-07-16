import { supabase, isSupabaseConfigured } from "./supabase"

// Fetch recent workouts data (updated to match your schema)
export async function getWorkoutsData(limit = 10) {
  try {
    if (!isSupabaseConfigured() || !supabase) {
      return []
    }

    const { data, error } = await supabase
      .from("workouts")
      .select("*")
      .order("Workout start time", { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  } catch (error) {
    console.error("Error fetching workouts:", error)
    return []
  }
}

// Fetch recent sleep data (updated to match your schema)
export async function getSleepData(limit = 7) {
  try {
    if (!isSupabaseConfigured() || !supabase) {
      return []
    }

    const { data, error } = await supabase
      .from("sleep")
      .select("*")
      .order("Cycle start time", { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  } catch (error) {
    console.error("Error fetching sleep data:", error)
    return []
  }
}

// Fetch physiological cycles (recovery data) - updated to match your schema
export async function getPhysiologicalData(limit = 7) {
  try {
    if (!isSupabaseConfigured() || !supabase) {
      return []
    }

    const { data, error } = await supabase
      .from("physiological_cycles")
      .select("*")
      .order("Cycle start time", { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  } catch (error) {
    console.error("Error fetching physiological data:", error)
    return []
  }
}

// Fetch medical lab results (updated to match your schema)
export async function getMedicalLabResults() {
  try {
    if (!isSupabaseConfigured() || !supabase) {
      return []
    }

    const { data, error } = await supabase.from("medical_lab_results").select("*")

    if (error) throw error
    return data || []
  } catch (error) {
    console.error("Error fetching lab results:", error)
    return []
  }
}

// Fetch recent journal entries (updated to match your schema)
export async function getJournalEntries(limit = 10) {
  try {
    if (!isSupabaseConfigured() || !supabase) {
      return []
    }

    const { data, error } = await supabase
      .from("journal_entries")
      .select("*")
      .order("Cycle start time", { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  } catch (error) {
    console.error("Error fetching journal entries:", error)
    return []
  }
}

// NEW: Fetch recent food logs
export async function getFoodLogs(limit = 10, date?: string) {
  try {
    if (!isSupabaseConfigured() || !supabase) {
      return []
    }

    let query = supabase.from("food_logs").select("*").order("Cycle start time", { ascending: false })

    if (date) {
      const startOfDay = `${date}T00:00:00Z`
      const endOfDay = `${date}T23:59:59Z`
      query = query.gte("Cycle start time", startOfDay).lte("Cycle start time", endOfDay)
    }

    const { data, error } = await query.limit(limit)

    if (error) throw error
    return data || []
  } catch (error) {
    console.error("Error fetching food logs:", error)
    return []
  }
}

// NEW: Fetch nutrition goals
export async function getNutritionGoals() {
  try {
    if (!isSupabaseConfigured() || !supabase) {
      return null
    }

    const { data, error } = await supabase
      .from("nutrition_goals")
      .select("*")
      .eq("Is active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error("Error fetching nutrition goals:", error)
    return null
  }
}

// NEW: Get comprehensive health summary (updated for your schema)
export async function getHealthSummary() {
  try {
    const [workouts, sleep, physiological, labResults, journal, foodLogs, nutritionGoals] = await Promise.all([
      getWorkoutsData(7),
      getSleepData(7),
      getPhysiologicalData(7),
      getMedicalLabResults(),
      getJournalEntries(7),
      getFoodLogs(10),
      getNutritionGoals(),
    ])

    return {
      workouts,
      sleep,
      physiological,
      labResults,
      journal,
      foodLogs,
      nutritionGoals,
    }
  } catch (error) {
    console.error("Error fetching health summary:", error)
    return {
      workouts: [],
      sleep: [],
      physiological: [],
      labResults: [],
      journal: [],
      foodLogs: [],
      nutritionGoals: null,
    }
  }
}

// NEW: Calculate daily nutrition summary
export async function getDailyNutritionSummary(date: string = new Date().toISOString().split("T")[0]) {
  try {
    const foodLogs = await getFoodLogs(50, date)
    const nutritionGoals = await getNutritionGoals()

    const summary = {
      totalCalories: 0,
      totalProtein: 0,
      totalCarbs: 0,
      totalFat: 0,
      totalFiber: 0,
      totalSodium: 0,
      mealCount: foodLogs.length,
      goals: nutritionGoals,
      meals: foodLogs.map((log) => ({
        type: log["Meal type"],
        name: log["Food name"],
        calories: log["Calories"] || 0,
        time: log["Meal time"],
        healthScore: log["Health score"],
      })),
    }

    // Calculate totals
    foodLogs.forEach((log) => {
      summary.totalCalories += log["Calories"] || 0
      summary.totalProtein += log["Protein (g)"] || 0
      summary.totalCarbs += log["Carbs (g)"] || 0
      summary.totalFat += log["Fat (g)"] || 0
      summary.totalFiber += log["Fiber (g)"] || 0
      summary.totalSodium += log["Sodium (mg)"] || 0
    })

    return summary
  } catch (error) {
    console.error("Error calculating daily nutrition summary:", error)
    return null
  }
}
