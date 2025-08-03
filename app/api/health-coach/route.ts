import { supabaseAdmin, isSupabaseConfigured, supabase } from "@/lib/supabase"
import { AuthService } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const { message, userId, conversationHistory } = await request.json()

    if (!isSupabaseConfigured()) {
      return Response.json({
        response:
          "I'm currently running in demo mode. To access your real health data and get personalized insights, please configure your Supabase database connection. For now, I can provide general health advice!\n\nWhat would you like to know about recovery, sleep, workouts, or wellness?",
        category: "general",
        priority: "low",
        contextData: { hasHealthData: false, dataPoints: { demo_mode: true } },
      })
    }

    const healthData = await fetchUserHealthData(request)

    const openrouterApiKey = process.env.OPENROUTER_API_KEY
    if (!openrouterApiKey) {
      throw new Error("OpenRouter API key missing")
    }

    // Construct messages for OpenRouter
    const messages = [
      {
        role: "system",
        content: `You are an AI Health Coach with access to comprehensive health data from multiple sources. You can analyze and provide personalized advice based on:

🏃 WHOOP DATA: Real-time recovery scores, HRV, sleep analysis, workout strain, and performance metrics
🍎 NUTRITION: Food intake, calories, macronutrients, and meal patterns
🏥 MEDICAL: Lab results, biomarkers, and health indicators

Key personality traits:
- Expert in holistic health optimization (recovery, sleep, nutrition, fitness)
- Evidence-based recommendations using actual user data
- Identifies patterns across multiple health dimensions
- Supportive and motivational tone
- Uses emojis appropriately for engagement

CURRENT USER HEALTH DATA:
${formatHealthDataForAI(healthData)}

Guidelines:
1. Always reference specific metrics from their actual data
2. Look for correlations between recovery, sleep, nutrition, and workouts
3. Provide actionable, personalized recommendations
4. Acknowledge achievements and flag concerning trends
5. Suggest specific foods, activities, or behavioral changes
6. Keep responses under 250 words unless detailed analysis needed
7. If data is missing, guide user on what to track for better insights`,
      },
      {
        role: "user",
        content: `User message: "${message}"

Previous conversation context:
${conversationHistory?.map((msg: any) => `${msg.isUser ? "User" : "Coach"}: ${msg.content}`).join("\n") || "No previous context"}

Please provide a helpful, personalized response based on the user's health tracking data.`,
      },
    ]

    const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openrouterApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o", // or another OpenRouter model
        messages,
      }),
    })

    if (!resp.ok) {
      const text = await resp.text()
      throw new Error(`OpenRouter error: ${resp.status} ${text}`)
    }

    const data = await resp.json()
    let text = data?.choices?.[0]?.message?.content || ""

    // Optional: clean up markdown code blocks if needed:
    text = text.replace(/^```json\s*/, "").replace(/```$/, "").trim()

    const category = categorizeResponse(message, text)
    const priority = determinePriority(text, healthData)

    return Response.json({
      response: text,
      category,
      priority,
      contextData: {
        hasHealthData: Object.keys(healthData).length > 0,
        dataPoints: getDataPointsSummary(healthData),
      },
    })
  } catch (error) {
    console.error("Error in health coach:", error)
    return Response.json({
      response:
        "I'm sorry, I'm having trouble connecting right now. Please try again in a moment, or check if your database is properly configured.",
      category: "error",
      priority: "low",
    })
  }
}

// --- Your existing helper functions unchanged ---
async function fetchUserHealthData(request: Request) {
  // Get the origin from request headers
  const host = request.headers.get('host');
  const protocol = request.headers.get('x-forwarded-proto') || (host?.includes('localhost') ? 'http' : 'https');
  const origin = `${protocol}://${host}`;
  
  // Forward trainer context headers if present
  const forwardHeaders: HeadersInit = {
    'Content-Type': 'application/json'
  };
  
  const viewingClientId = request.headers.get('x-viewing-client-id');
  if (viewingClientId) {
    forwardHeaders['x-viewing-client-id'] = viewingClientId;
  }
  
  const selectedWearable = request.headers.get('x-selected-wearable');
  if (selectedWearable) {
    forwardHeaders['x-selected-wearable'] = selectedWearable;
  }
  
  // Forward cookies for authentication
  const cookies = request.headers.get('cookie');
  if (cookies) {
    forwardHeaders['cookie'] = cookies;
  }
  
  try {
    const healthData: any = {}

    // Fetch Whoop data from API endpoints (same as dashboard)
    try {
      const recoveryResponse = await fetch(`${origin}/api/whoop/recovery?limit=7`, {
        headers: forwardHeaders
      })
      if (recoveryResponse.ok) {
        const recoveryData = await recoveryResponse.json()
        healthData.recovery = recoveryData.records || []
      }
    } catch (error) {
      console.log("Whoop recovery data not available")
      healthData.recovery = []
    }

    try {
      const sleepResponse = await fetch(`${origin}/api/whoop/sleep?limit=7`, {
        headers: forwardHeaders
      })
      if (sleepResponse.ok) {
        const sleepData = await sleepResponse.json()
        healthData.sleep = sleepData.records || []
      }
    } catch (error) {
      console.log("Whoop sleep data not available")
      healthData.sleep = []
    }

    try {
      const workoutResponse = await fetch(`${origin}/api/whoop/workouts?limit=10`, {
        headers: forwardHeaders
      })
      if (workoutResponse.ok) {
        const workoutData = await workoutResponse.json()
        healthData.workouts = workoutData.records || []
      }
    } catch (error) {
      console.log("Whoop workout data not available")
      healthData.workouts = []
    }

    // Fetch Supabase data (medical and nutrition) with proper user context
    if (supabaseAdmin) {
      // Get authenticated user and handle trainer context
      const authService = new AuthService();
      const cookies = request.headers.get('cookie') || '';
      const userSessionMatch = cookies.match(/user_session=([^;]*)/);
      const userSession = userSessionMatch ? userSessionMatch[1] : null;
      
      if (userSession) {
        const user = await authService.getUser(userSession);
        if (user) {
          // Determine effective user ID (client if trainer is viewing, otherwise authenticated user)
          const viewingClientId = request.headers.get('x-viewing-client-id')
          let effectiveUserId = user.id

          if (user.user_type === 'trainer' && viewingClientId) {
            // Verify trainer has permission to view this client
            const { data: relationship } = await supabase
              .from('trainer_clients')
              .select('id')
              .eq('trainer_id', user.id)
              .eq('client_id', viewingClientId)
              .eq('is_active', true)
              .single()

            if (relationship) {
              effectiveUserId = viewingClientId
            }
          }

          // Fetch medical lab results for the effective user
          const { data: labResults } = await supabaseAdmin
            .from("medical_lab_results")
            .select("*")
            .eq("user_id", effectiveUserId)
            .order("created_at", { ascending: false })
            .limit(20)
          healthData.labResults = labResults || []

          // Fetch nutrition data (food logs from last 7 days) for the effective user
          const sevenDaysAgo = new Date()
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
          
          const { data: foodLogs } = await supabaseAdmin
            .from("food_logs")
            .select("*")
            .eq("user_id", effectiveUserId)
            .gte("logged_at", sevenDaysAgo.toISOString())
            .order("logged_at", { ascending: false })
            .limit(50)

          // Aggregate nutrition data by day
          healthData.nutrition = aggregateNutritionByDay(foodLogs || [])
          healthData.foodLogs = foodLogs || []
        }
      }
    }

    return healthData
  } catch (error) {
    console.error("Error fetching health data:", error)
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

function formatHealthDataForAI(healthData: any): string {
  let summary = ""

  // Format Whoop recovery data
  if (healthData.recovery?.length > 0) {
    const latest = healthData.recovery[0]
    const avgRecovery =
      healthData.recovery.reduce((sum: number, day: any) => sum + (day.score?.recovery_score || 0), 0) /
      healthData.recovery.length

    summary += `Recovery (last 7 days): Current ${Math.round((latest.score?.recovery_score || 0) * 100)}%, avg ${Math.round(avgRecovery * 100)}%. HRV: ${latest.score?.hrv_rmssd_milli || 'N/A'}ms, RHR: ${latest.score?.resting_heart_rate || 'N/A'}bpm. Strain: ${latest.score?.strain || 'N/A'}. `
  }

  // Format Whoop sleep data
  if (healthData.sleep?.length > 0) {
    const latest = healthData.sleep[0]
    const latestSleepHours = Math.round(((latest.score?.stage_summary?.total_in_bed_time_milli - latest.score?.stage_summary?.total_awake_time_milli) / 3600000) * 10) / 10
    
    const avgSleepHours = healthData.sleep.reduce((sum: number, night: any) => {
      const sleepTime = (night.score?.stage_summary?.total_in_bed_time_milli - night.score?.stage_summary?.total_awake_time_milli) / 3600000
      return sum + sleepTime
    }, 0) / healthData.sleep.length

    summary += `Sleep (last 7 days): Latest ${latestSleepHours}h, avg ${Math.round(avgSleepHours * 10) / 10}h. Performance: ${Math.round((latest.score?.sleep_performance_percentage || 0) * 100)}%, efficiency: ${Math.round((latest.score?.sleep_efficiency_percentage || 0) * 100)}%. Deep: ${Math.round((latest.score?.stage_summary?.total_slow_wave_sleep_time_milli || 0) / 60000)}min, REM: ${Math.round((latest.score?.stage_summary?.total_rem_sleep_time_milli || 0) / 60000)}min. `
  }

  // Format Whoop workout data
  if (healthData.workouts?.length > 0) {
    const totalStrain = healthData.workouts.reduce(
      (sum: number, workout: any) => sum + (workout.score?.strain || 0), 0
    )
    const avgStrain = totalStrain / healthData.workouts.length
    const avgCalories = healthData.workouts.reduce(
      (sum: number, workout: any) => sum + (workout.score?.kilojoule * 0.239 || 0), 0
    ) / healthData.workouts.length

    const activities = [...new Set(healthData.workouts.map((w: any) => w.sport?.name || 'Unknown'))]
    summary += `Workouts (last 10): ${healthData.workouts.length} sessions, avg strain ${avgStrain.toFixed(1)}, avg ${Math.round(avgCalories)} cal. Activities: ${activities.slice(0, 3).join(", ")}. `
  }

  // Format medical lab results
  if (healthData.labResults?.length > 0) {
    const abnormal = healthData.labResults.filter(
      (result: any) => result.Flag && result.Flag.toLowerCase() !== "normal"
    )
    const recent = healthData.labResults.slice(0, 5)
    summary += `Lab Results: ${healthData.labResults.length} total tests, ${abnormal.length} abnormal findings. Recent tests: ${recent.map((r: any) => `${r["Test Name"]}: ${r.Result}${r.Unit} (${r.Flag || 'Normal'})`).join(", ")}. `
  }

  // Format nutrition data
  if (healthData.nutrition?.length > 0) {
    const todayNutrition = healthData.nutrition[0]
    const avgCalories = healthData.nutrition.reduce((sum: number, day: any) => sum + (day.totalCalories || 0), 0) / healthData.nutrition.length
    const avgProtein = healthData.nutrition.reduce((sum: number, day: any) => sum + (day.totalProtein || 0), 0) / healthData.nutrition.length

    summary += `Nutrition (last 7 days): Today ${todayNutrition.totalCalories || 0} calories, ${todayNutrition.mealCount || 0} meals. Avg daily: ${Math.round(avgCalories)} cal, ${Math.round(avgProtein)}g protein. Recent foods: ${todayNutrition.foods?.slice(0, 3).map((f: any) => f.name).join(", ") || 'None logged'}. `
  }

  return summary || "No recent health data available. User may need to connect Whoop device or log nutrition data."
}

function categorizeResponse(userMessage: string, aiResponse: string): string {
  const message = userMessage.toLowerCase()

  if (message.includes("recovery") || message.includes("hrv") || message.includes("strain")) return "recovery"
  if (message.includes("sleep") || message.includes("tired") || message.includes("rest")) return "sleep"
  if (message.includes("workout") || message.includes("exercise") || message.includes("training")) return "fitness"
  if (message.includes("lab") || message.includes("medical") || message.includes("test") || message.includes("cholesterol") || message.includes("blood")) return "medical"
  if (message.includes("food") || message.includes("eat") || message.includes("nutrition") || message.includes("protein") || message.includes("calorie") || message.includes("diet")) return "nutrition"

  return "general"
}

function determinePriority(aiResponse: string, healthData: any): "low" | "medium" | "high" {
  const response = aiResponse.toLowerCase()

  if (response.includes("urgent") || response.includes("concerning") || response.includes("doctor")) return "high"
  if (response.includes("should consider") || response.includes("recommend")) return "medium"

  return "low"
}

function getDataPointsSummary(healthData: any) {
  return {
    hasRecoveryData: healthData.recovery?.length > 0,
    hasSleepData: healthData.sleep?.length > 0,
    hasWorkoutData: healthData.workouts?.length > 0,
    hasLabData: healthData.labResults?.length > 0,
    hasNutritionData: healthData.nutrition?.length > 0,
    recoveryDays: healthData.recovery?.length || 0,
    sleepNights: healthData.sleep?.length || 0,
    workoutSessions: healthData.workouts?.length || 0,
    labTests: healthData.labResults?.length || 0,
    nutritionDays: healthData.nutrition?.length || 0,
    dataRecency: "7_days",
  }
}
