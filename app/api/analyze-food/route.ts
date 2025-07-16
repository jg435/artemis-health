import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function POST(request: Request) {
  try {
    const { foodName, description, quantity, unit, photo } = await request.json();

    let prompt = `Analyze the following food item and provide detailed nutritional information for this SINGLE food item only. Do not combine multiple foods or dishes into one analysis:

Food: ${foodName}
${description ? `Description: ${description}` : ""}
Quantity: ${quantity} ${unit}

Please provide a JSON response with the following structure (calories, protein, carbs, and fat are REQUIRED and must never be null/empty):
{
  "calories": estimated_calories_number (REQUIRED),
  "macros": {
    "protein": protein_grams (REQUIRED),
    "carbs": carbs_grams (REQUIRED),
    "fat": fat_grams (REQUIRED),
    "fiber": fiber_grams,
    "sugar": sugar_grams
  },
  "micronutrients": {
    "sodium_mg": sodium_milligrams,
    "potassium_mg": potassium_milligrams,
    "calcium_mg": calcium_milligrams,
    "iron_mg": iron_milligrams,
    "vitamin_c_mg": vitamin_c_milligrams
  },
  "healthScore": "healthy|moderate|unhealthy",
  "healthAnalysis": "brief_health_assessment",
  "suggestions": ["improvement_suggestion_1", "improvement_suggestion_2"],
  "mealTiming": "optimal_timing_recommendation",
  "portionAssessment": "portion_size_feedback"
}`;

    if (photo) {
      prompt += `\n\nNote: A photo of the food has been provided. Please analyze the visual appearance to refine your nutritional estimates for the MAIN food item only, considering portion size, preparation method, and visible ingredients. If multiple foods are visible in the photo, focus only on the primary/most prominent food item.`;
    }

    const systemPrompt = `You are a certified nutritionist and dietitian with expertise in food analysis and nutritional assessment. 

IMPORTANT: Analyze only ONE food item per request. If multiple foods are mentioned or visible, focus on the primary/main food item only.

CRITICAL: You MUST always provide numerical values for calories, protein, carbs, and fat. Never leave these fields empty, null, or zero unless the food truly has zero calories. Provide your best estimate even if uncertain.

Key capabilities:
- Accurate calorie and macronutrient estimation for single food items
- Understanding of portion sizes and food preparation methods
- Knowledge of micronutrient content in various foods
- Ability to assess meal healthiness and provide recommendations
- Expertise in meal timing and portion control

Guidelines:
1. Analyze only the primary/main food item specified
2. ALWAYS provide values for calories, protein, carbs, and fat (REQUIRED)
3. Provide realistic and accurate nutritional estimates for that single item
4. Consider cooking methods and preparation styles
5. Account for portion sizes appropriately
6. Give practical, actionable health advice
7. Be encouraging while being honest about nutritional content
8. Consider the food in context of overall daily nutrition needs
9. Always respond with valid JSON format
10. Do not combine multiple foods into one analysis`;

    const openRouterResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`, // Use environment variable
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash", // Use same model as food-with-coach
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
      })
    });

    const result = await openRouterResponse.json();
    console.log("OpenRouter response:", JSON.stringify(result, null, 2));
    
    const text = result.choices?.[0]?.message?.content || "";
    console.log("Raw AI response:", text);
    
    if (!text || text.trim() === "") {
      console.error("AI returned empty response");
      throw new Error("AI returned empty response");
    }

    // Extract JSON from the response (remove markdown formatting if present)
    const cleanedText = text
      .replace(/```json\s*/i, '')
      .replace(/```$/, '')
      .trim();
    
    console.log("Cleaned response:", cleanedText);

    let analysis;
    try {
      analysis = JSON.parse(cleanedText);
      
      // Validate that required fields are present
      if (!analysis.calories && analysis.calories !== 0) {
        throw new Error('Missing required field: calories');
      }
      if (!analysis.macros) {
        throw new Error('Missing required field: macros');
      }
      if (!analysis.macros.protein && analysis.macros.protein !== 0) {
        throw new Error('Missing required field: macros.protein');
      }
      if (!analysis.macros.carbs && analysis.macros.carbs !== 0) {
        throw new Error('Missing required field: macros.carbs');
      }
      if (!analysis.macros.fat && analysis.macros.fat !== 0) {
        throw new Error('Missing required field: macros.fat');
      }
    } catch (parseError) {
      console.error("JSON parsing failed:", parseError);
      console.error("Failed to parse text:", cleanedText);
      
      // Return a basic structure so the user can still save manually
      analysis = {
        error: "AI analysis failed",
        message: "Please enter nutrition information manually",
        calories: null,
        macros: {
          protein: null,
          carbs: null,
          fat: null,
          fiber: null,
          sugar: null
        },
        healthScore: "unknown",
        healthAnalysis: "AI analysis unavailable - please use manual input",
        suggestions: ["Enter nutrition information manually using the form above"],
        mealTiming: "Manual entry recommended",
        portionAssessment: "Please assess portion manually"
      };
    }

    return Response.json({ analysis });
  } catch (error) {
    console.error("Error analyzing food:", error);
    return Response.json({ error: "Failed to analyze food" }, { status: 500 });
  }
}
