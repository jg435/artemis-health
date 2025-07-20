import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase"

export async function POST(request: Request) {
  try {
    if (!isSupabaseConfigured()) {
      return Response.json({ error: "Supabase not configured" }, { status: 500 })
    }

    const { userId } = await request.json()

    // Fetch comprehensive health data for the past week
    const healthData = await fetchWeeklyHealthData(userId, request)

    // Generate AI-powered weekly summary using OpenRouter
    const openrouterApiKey = process.env.OPENROUTER_API_KEY
    if (!openrouterApiKey) {
      throw new Error("OpenRouter API key missing")
    }

    const messages = [
      {
        role: "system",
        content: `You are an AI Health Coach creating a comprehensive weekly health summary. 

Create a structured summary that includes:
1. Overall health score (1-10)
2. Key achievements and positive trends
3. Areas for improvement
4. Specific actionable recommendations
5. Goals for next week

Be encouraging but honest about areas needing attention. Use data-driven insights and maintain a supportive tone.`,
      },
      {
        role: "user",
        content: `Generate a weekly health summary for this user based on their data:

User Profile:
- User ID: ${userId}

Weekly Health Data:
${formatWeeklyDataForAI(healthData)}

Please provide a comprehensive but concise weekly summary with specific insights and recommendations.`,
      },
    ]

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openrouterApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o",
        messages,
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenRouter error: ${response.status}`)
    }

    const data = await response.json()
    const summaryText = data?.choices?.[0]?.message?.content || "Unable to generate summary"

    // Store the summary as a recommendation
    if (supabaseAdmin) {
      await supabaseAdmin.from("health_recommendations").insert({
        user_id: userId,
        category: "general",
        recommendation_text: summaryText,
        priority: "medium",
        context_data: {
          type: "weekly_summary",
          week_ending: new Date().toISOString(),
          data_points: getWeeklyDataSummary(healthData),
        },
      })
    }

    return Response.json({
      summary: summaryText,
      dataPoints: getWeeklyDataSummary(healthData),
    })
  } catch (error) {
    console.error("Error generating weekly summary:", error)
    return Response.json({ error: "Failed to generate weekly summary" }, { status: 500 })
  }
}

async function fetchWeeklyHealthData(userId: string, request: Request) {
  // Get the origin from request headers
  const host = request.headers.get('host');
  const protocol = request.headers.get('x-forwarded-proto') || (host?.includes('localhost') ? 'http' : 'https');
  const origin = `${protocol}://${host}`;
  try {
    const healthData: any = {}

    // Fetch Whoop data from API endpoints (same as health coach)
    try {
      const recoveryResponse = await fetch(`${origin}/api/whoop/recovery?limit=14`)
      if (recoveryResponse.ok) {
        const recoveryData = await recoveryResponse.json()
        healthData.recovery = recoveryData.records || []
      }
    } catch (error) {
      console.log("Whoop recovery data not available")
      healthData.recovery = []
    }

    try {
      const sleepResponse = await fetch(`${origin}/api/whoop/sleep?limit=14`)
      if (sleepResponse.ok) {
        const sleepData = await sleepResponse.json()
        healthData.sleep = sleepData.records || []
      }
    } catch (error) {
      console.log("Whoop sleep data not available")
      healthData.sleep = []
    }

    try {
      const workoutResponse = await fetch(`${origin}/api/whoop/workouts?limit=20`)
      if (workoutResponse.ok) {
        const workoutData = await workoutResponse.json()
        healthData.workouts = workoutData.records || []
      }
    } catch (error) {
      console.log("Whoop workout data not available")
      healthData.workouts = []
    }

    // Fetch Supabase data (medical and nutrition)
    if (supabaseAdmin) {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

      // Fetch medical lab results
      const { data: labResults } = await supabaseAdmin
        .from("medical_lab_results")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10)
      healthData.labResults = labResults || []

      // Fetch nutrition data (food logs from last 7 days)
      const { data: foodLogs } = await supabaseAdmin
        .from("food_logs")
        .select("*")
        .eq("user_id", userId)
        .gte("logged_at", weekAgo.toISOString())
        .order("logged_at", { ascending: false })

      healthData.foodLogs = foodLogs || []
      healthData.nutrition = aggregateNutritionByDay(foodLogs || [])
    }

    return healthData
  } catch (error) {
    console.error("Error fetching weekly health data:", error)
    return {}
  }
}

function aggregateNutritionByDay(foodLogs: any[]) {
  const dayMap = new Map()
  
  foodLogs.forEach(log => {
    const date = new Date(log.logged_at).toDateString()
    
    if (!dayMap.has(date)) {
      dayMap.set(date, {
        date,
        totalCalories: 0,
        totalProtein: 0,
        totalCarbs: 0,
        totalFat: 0,
        totalFiber: 0,
        totalSodium: 0,
        mealCount: 0,
        foods: []
      })
    }
    
    const dayData = dayMap.get(date)
    dayData.totalCalories += log.calories || 0
    dayData.totalProtein += log.protein_g || 0
    dayData.totalCarbs += log.carbs_g || 0
    dayData.totalFat += log.fat_g || 0
    dayData.totalFiber += log.fiber_g || 0
    dayData.totalSodium += log.sodium_mg || 0
    dayData.mealCount += 1
    dayData.foods.push({
      name: log.food_name,
      meal_type: log.meal_type,
      calories: log.calories
    })
  })
  
  return Array.from(dayMap.values())
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 7) // Last 7 days
}

function formatWeeklyDataForAI(healthData: any): string {
  let summary = ""

  // Format Whoop recovery data
  if (healthData.recovery?.length > 0) {
    const avgRecovery = healthData.recovery.reduce((sum: number, day: any) => 
      sum + (day.score?.recovery_score || 0), 0) / healthData.recovery.length
    const latest = healthData.recovery[0]
    
    summary += `Recovery (last 7-14 days): Avg recovery ${Math.round(avgRecovery * 100)}%. Latest: ${Math.round((latest.score?.recovery_score || 0) * 100)}%, HRV: ${latest.score?.hrv_rmssd_milli || 'N/A'}ms, RHR: ${latest.score?.resting_heart_rate || 'N/A'}bpm. `
  }

  // Format Whoop sleep data
  if (healthData.sleep?.length > 0) {
    const avgSleepHours = healthData.sleep.reduce((sum: number, night: any) => {
      const sleepTime = (night.score?.stage_summary?.total_in_bed_time_milli - night.score?.stage_summary?.total_awake_time_milli) / 3600000
      return sum + sleepTime
    }, 0) / healthData.sleep.length

    const avgPerformance = healthData.sleep.reduce((sum: number, night: any) => 
      sum + (night.score?.sleep_performance_percentage || 0), 0) / healthData.sleep.length

    summary += `Sleep (last 7-14 nights): Avg ${avgSleepHours.toFixed(1)} hours, avg performance ${Math.round(avgPerformance * 100)}%. `
  }

  // Format Whoop workout data
  if (healthData.workouts?.length > 0) {
    const totalStrain = healthData.workouts.reduce((sum: number, workout: any) => 
      sum + (workout.score?.strain || 0), 0)
    const avgStrain = totalStrain / healthData.workouts.length
    const avgCalories = healthData.workouts.reduce((sum: number, workout: any) => 
      sum + (workout.score?.kilojoule * 0.239 || 0), 0) / healthData.workouts.length

    const activities = [...new Set(healthData.workouts.map((w: any) => w.sport?.name || 'Unknown'))]
    summary += `Workouts (past week): ${healthData.workouts.length} sessions, avg strain ${avgStrain.toFixed(1)}, avg ${Math.round(avgCalories)} cal. Activities: ${activities.slice(0, 5).join(", ")}. `
  }

  // Format nutrition data
  if (healthData.nutrition?.length > 0) {
    const avgCalories = healthData.nutrition.reduce((sum: number, day: any) => 
      sum + (day.totalCalories || 0), 0) / healthData.nutrition.length
    const avgProtein = healthData.nutrition.reduce((sum: number, day: any) => 
      sum + (day.totalProtein || 0), 0) / healthData.nutrition.length
    const totalMeals = healthData.nutrition.reduce((sum: number, day: any) => 
      sum + (day.mealCount || 0), 0)

    summary += `Nutrition (last 7 days): ${totalMeals} meals logged across ${healthData.nutrition.length} days. Avg daily: ${Math.round(avgCalories)} cal, ${Math.round(avgProtein)}g protein. `
  }

  // Format medical lab results
  if (healthData.labResults?.length > 0) {
    const abnormal = healthData.labResults.filter((result: any) => 
      result.Flag && result.Flag.toLowerCase() !== "normal")
    const recent = healthData.labResults.slice(0, 3)
    
    summary += `Lab Results: ${healthData.labResults.length} total tests, ${abnormal.length} abnormal findings. Recent: ${recent.map((r: any) => `${r["Test Name"]}: ${r.Result}${r.Unit} (${r.Flag || 'Normal'})`).join(", ")}. `
  }

  return summary || "Limited health data available for this week. Consider connecting Whoop device and logging nutrition data for more comprehensive insights."
}

function getWeeklyDataSummary(healthData: any) {
  return {
    // Whoop data points
    recoveryDays: healthData.recovery?.length || 0,
    sleepNights: healthData.sleep?.length || 0,
    workoutSessions: healthData.workouts?.length || 0,
    
    // Supabase data points
    mealsLogged: healthData.foodLogs?.length || 0,
    nutritionDays: healthData.nutrition?.length || 0,
    labTests: healthData.labResults?.length || 0,
    
    // Summary metrics
    hasWhoopData: (healthData.recovery?.length || 0) > 0 || (healthData.sleep?.length || 0) > 0 || (healthData.workouts?.length || 0) > 0,
    hasNutritionData: (healthData.nutrition?.length || 0) > 0,
    hasLabData: (healthData.labResults?.length || 0) > 0,
    
    weekPeriod: {
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      end: new Date().toISOString(),
    },
  }
}
