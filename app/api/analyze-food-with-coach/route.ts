const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";

function looksLikeJSON(text) {
  return text.trim().startsWith("{") || text.trim().startsWith("[");
}

function extractJson(rawOutput: string): string {
  // Remove triple backticks and optional 'json' language identifier
  return rawOutput
    .replace(/```json\s*/i, '')  // Remove ```json (case-insensitive)
    .replace(/```$/, '')         // Remove ending ```
    .trim();                     // Trim whitespace
}


async function callOpenRouter(system, prompt) {
  const res = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        ...(system ? [{ role: "system", content: system }] : []),
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("OpenRouter API error:", errorText);
    throw new Error("Failed to fetch from OpenRouter");
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || "";

  const text2 = extractJson(text)
  // if (!looksLikeJSON(text)) {
  //   console.warn("⚠️ Model returned non-JSON response:", text);
  // }

  return text2;
}

export async function POST(request) {
  try {
    const { photo, metadata, userId } = await request.json();

    if (!photo) {
      return Response.json({ error: "Photo is required" }, { status: 400 });
    }

    const userHealthContext = await fetchUserHealthContext(userId);
    const nutritionalAnalysis = await analyzeNutritionalContent(photo, metadata);
    
    console.log('Nutritional analysis result:', JSON.stringify(nutritionalAnalysis, null, 2));
    
    let coachResponse;
    try {
      coachResponse = await generateHealthCoachResponse(photo, metadata, nutritionalAnalysis, userHealthContext);
    } catch (error) {
      console.error('Error generating coach response:', error);
      coachResponse = 'Health coach analysis unavailable';
    }
    
    const structuredAnalysis = await parseStructuredAnalysis(nutritionalAnalysis, coachResponse, metadata);

    return Response.json({
      analysis: structuredAnalysis,
      coachResponse: coachResponse,
      success: true,
    });
  } catch (error) {
    console.error("Error in food analysis with coach:", error);
    return Response.json({ error: "Failed to analyze food with health coach" }, { status: 500 });
  }
}

async function fetchUserHealthContext(userId) {
  try {
    if (!isSupabaseConfigured() || !supabaseAdmin) {
      return { hasData: false, summary: "No health data available - running in demo mode" };
    }

    const [recoveryData, sleepData, workoutData, nutritionData] = await Promise.all([
      supabaseAdmin.from("physiological_cycles").select("*").eq("user_id", userId).order("Cycle start time", { ascending: false }).limit(3),
      supabaseAdmin.from("sleep").select("*").eq("user_id", userId).order("Cycle start time", { ascending: false }).limit(3),
      supabaseAdmin.from("workouts").select("*").eq("user_id", userId).order("Workout start time", { ascending: false }).limit(5),
      supabaseAdmin.from("food_logs").select("*").eq("user_id", userId).gte("logged_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()).order("logged_at", { ascending: false }),
    ]);

    return {
      hasData: true,
      recovery: recoveryData.data || [],
      sleep: sleepData.data || [],
      workouts: workoutData.data || [],
      recentNutrition: nutritionData.data || [],
      summary: formatHealthContextSummary({
        recovery: recoveryData.data || [],
        sleep: sleepData.data || [],
        workouts: workoutData.data || [],
        nutrition: nutritionData.data || [],
      }),
    };
  } catch (error) {
    console.error("Error fetching user health context:", error);
    return { hasData: false, summary: "Unable to fetch health context" };
  }
}

function formatHealthContextSummary(data) {
  let summary = "";

  if (data.recovery?.length > 0) {
    const latest = data.recovery[0];
    const avg = data.recovery.reduce((sum, d) => sum + (d["Recovery score %"] || 0), 0) / data.recovery.length;
    summary += `Recent Recovery: Current ${latest["Recovery score %"]}%, avg ${avg.toFixed(1)}%. HRV: ${latest["Heart rate variability (ms)"]}ms. `;
  }

  if (data.sleep?.length > 0) {
    const latest = data.sleep[0];
    const avgHrs = data.sleep.reduce((sum, d) => sum + (d["Asleep duration (min)"] || 0) / 60, 0) / data.sleep.length;
    summary += `Recent Sleep: Latest ${((latest["Asleep duration (min)"] || 0) / 60).toFixed(1)}h, avg ${avgHrs.toFixed(1)}h. Quality: ${latest["Sleep performance %"]}%. `;
  }

  if (data.workouts?.length > 0) {
    const workouts = data.workouts.slice(0, 3);
    const avgStrain = workouts.reduce((sum, d) => sum + (d["Activity Strain"] || 0), 0) / workouts.length;
    summary += `Recent Workouts: ${workouts.length} sessions, avg strain ${avgStrain.toFixed(1)}. `;
  }

  if (data.nutrition?.length > 0) {
    const meals = data.nutrition.slice(0, 5);
    const avgCal = meals.reduce((sum, m) => sum + (m.calories || 0), 0) / meals.length;
    summary += `Recent Nutrition: Avg ${Math.round(avgCal)} cal/meal. `;
  }

  return summary || "No recent health data available.";
}

async function analyzeNutritionalContent(photo, metadata) {
  const system = `You are a certified nutritionist analyzing food photos. IMPORTANT: If multiple food items are visible, analyze only the PRIMARY/MAIN food item in the photo. Do not combine multiple foods into one analysis. Focus on the most prominent, central, or largest food item visible.

You MUST always provide values for calories, protein, carbs, and fat. Never leave these fields empty or as null. If exact values are uncertain, provide your best estimate.

Respond with valid JSON only in this format:
{
  "calories": number (REQUIRED - never null/empty),
  "macros": {
    "protein": number (REQUIRED - never null/empty),
    "carbs": number (REQUIRED - never null/empty),
    "fat": number (REQUIRED - never null/empty),
    "fiber": number,
    "sugar": number
  },
  "micronutrients": {
    "sodium_mg": number,
    "potassium_mg": number,
    "calcium_mg": number,
    "iron_mg": number,
    "vitamin_c_mg": number
  },
  "ingredients": ["ingredient1", "ingredient2"],
  "preparationNotes": "cooking method and style observations for the main food item only"
}`;

  // Convert photo to base64
  let base64Image = "";
  try {
    const res = await fetch(photo);
    const buffer = await res.arrayBuffer();
    base64Image = Buffer.from(buffer).toString("base64");
  } catch (e) {
    console.error("Error encoding image to base64:", e);
  }

  const prompt = `Here is a photo of a meal encoded in base64 format:
<base64>
${base64Image}
</base64>

Additional metadata:
- Meal type: ${metadata.mealType}
- Time: ${metadata.mealTime}
- Portion size: ${metadata.portionSize}
- Preparation: ${metadata.preparationMethod}
- Notes: ${metadata.notes}

Please analyze the image and return the nutrition estimate for the PRIMARY/MAIN food item only in the required JSON format. If multiple foods are visible, focus only on the most prominent or central food item.`;

  try {
    const text = await callOpenRouter(system, prompt);
    console.log("AI response length:", text?.length || 0);
    console.log("AI response:", text);
    
    if (!text || text.trim() === "") {
      throw new Error("AI returned empty response");
    }
    
    if (!looksLikeJSON(text)) {
      console.error("AI returned non-JSON response:", text);
      throw new Error("AI response is not valid JSON");
    }
    
    const parsedData = JSON.parse(text);
    
    // Validate that required fields are present and fix structure if needed
    if (typeof parsedData.calories !== 'number') {
      console.error('Invalid or missing calories:', parsedData.calories);
      throw new Error('Missing or invalid calories field');
    }
    
    if (!parsedData.macros || typeof parsedData.macros !== 'object') {
      console.error('Invalid or missing macros object:', parsedData.macros);
      throw new Error('Missing or invalid macros field');
    }
    
    if (typeof parsedData.macros.protein !== 'number') {
      console.error('Invalid or missing protein:', parsedData.macros.protein);
      throw new Error('Missing or invalid macros.protein field');
    }
    
    if (typeof parsedData.macros.carbs !== 'number') {
      console.error('Invalid or missing carbs:', parsedData.macros.carbs);
      throw new Error('Missing or invalid macros.carbs field');
    }
    
    if (typeof parsedData.macros.fat !== 'number') {
      console.error('Invalid or missing fat:', parsedData.macros.fat);
      throw new Error('Missing or invalid macros.fat field');
    }
    
    return parsedData;
  } catch (err) {
    console.error("Error parsing nutritional analysis:", err);
    console.error("Error parsing nutritional analysis - unable to provide nutrition data");
    throw new Error("Failed to parse nutritional analysis");
  }
}


async function generateHealthCoachResponse(photo, metadata, nutritionalAnalysis, userHealthContext) {
  const system = `You are an AI Health Coach giving advice in JSON. Respond ONLY with JSON in THIS EXACT FORMAT and do NOT include suggestions or alternatives. Use actual numeric values, not ranges.
.`;

  const prompt = `Meal Info:
Meal Type: ${metadata.mealType}
Time: ${metadata.mealTime}
Location: ${metadata.location}
Social Context: ${metadata.socialContext}
Hunger: ${metadata.hungerLevel}/10
Mood Before: ${metadata.moodBefore}
Mood After: ${metadata.moodAfter}
Portion: ${metadata.portionSize}
Prep: ${metadata.preparationMethod}
Notes: ${metadata.notes}

Nutrition:
Calories: ${nutritionalAnalysis?.calories || 'N/A'}
Protein: ${nutritionalAnalysis?.macros?.protein || 'N/A'}g
Carbs: ${nutritionalAnalysis?.macros?.carbs || 'N/A'}g
Fat: ${nutritionalAnalysis?.macros?.fat || 'N/A'}g
Ingredients: ${nutritionalAnalysis?.ingredients?.join(", ") || 'N/A'}

Context:
${userHealthContext.summary}`;

  return await callOpenRouter(system, prompt);
}

async function parseStructuredAnalysis(nutritionalAnalysis, coachResponse, metadata) {
  const system = `Return only valid JSON matching this format:
{
  "nutritionalAnalysis": ..., 
  "healthAssessment": ..., 
  "personalizedRecommendations": [...], 
  "mealTimingAdvice": "...", 
  "portionFeedback": "...", 
  "improvementSuggestions": [...], 
  "contextualInsights": [...]
}`;

  const prompt = `Coach Response:
${coachResponse}

Nutritional:
${JSON.stringify(nutritionalAnalysis)}

Metadata:
${JSON.stringify(metadata)}`;

  try {
    const text = await callOpenRouter(system, prompt);
    if (!looksLikeJSON(text)) throw new Error(text);
    return JSON.parse(text);
  } catch (err) {
    console.error("Error parsing structured analysis:", err);
    return {
      nutritionalAnalysis,
      healthAssessment: {
        score: 70,
        category: "good",
        concerns: ["Unable to parse detailed analysis"],
        positives: ["Meal logged for tracking"],
      },
      personalizedRecommendations: ["Continue tracking your meals for better insights"],
      mealTimingAdvice: "Meal timing analysis unavailable",
      portionFeedback: "Portion analysis unavailable",
      improvementSuggestions: ["Try adding more vegetables to your meals"],
      contextualInsights: ["Keep logging meals with context for better insights"],
    };
  }
}
