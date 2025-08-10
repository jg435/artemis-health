import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

type RequestBody = {
  type?: "workout" | "nutrition"
  fitnessLevel?: string
  goals?: string
  availableTime?: number
  preferences?: string
  daysPerWeek?: number
  calorieTarget?: number
  dietPreferences?: string
  userId?: string
}

/**
 * POST /api/ai-plan
 *
 * Unified endpoint to generate structured plans for "workout" or "nutrition".
 * Request body should include "type": "workout" | "nutrition" and relevant parameters.
 *
 * Response:
 * { plan: { ...structured plan... } } or { planText: "raw text" } on failure to parse
 */
export async function POST(request: Request) {
  try {
    const body: RequestBody = await request.json().catch(() => ({} as RequestBody))
    const type = body.type ?? "workout"

    const fitnessLevel = body.fitnessLevel ?? "beginner"
    const goals = body.goals ?? "general health"
    const availableTime = body.availableTime ?? 45
    const preferences = body.preferences ?? ""
    const daysPerWeek = body.daysPerWeek ?? 3
    const calorieTarget = body.calorieTarget ?? 2000
    const dietPreferences = body.dietPreferences ?? ""

    let prompt = ""
    if (type === "workout") {
      prompt = `
You are a fitness assistant that outputs a structured JSON workout plan that can be rendered on a frontend.
Respond ONLY with valid JSON (no extra commentary). Follow this schema exactly:

{
  "type": "workout",
  "title": string,
  "summary": string,
  "fitnessLevel": string,
  "goals": string,
  "daysPerWeek": number,
  "dailyPlans": [
    {
      "day": string,
      "durationMinutes": number,
      "warmup": [string],
      "exercises": [
        {
          "name": string,
          "description": string,
          "sets": number,
          "reps": string,
          "restSeconds": number,
          "estimatedCalories": number,
          "equipment": string
        }
      ],
      "cooldown": [string],
      "estimatedTotalCalories": number
    }
  ],
  "tips": [string],
  "alternatives": [
    {
      "exercise": string,
      "alternatives": [string]
    }
  ]
}

Generate a concise, practical plan based on these inputs:
- Fitness Level: ${fitnessLevel}
- Goals: ${goals}
- Available Time (minutes): ${availableTime}
- Preferences: ${preferences}
- Days per week: ${daysPerWeek}

Keep each day's duration roughly equal to the available time divided by days per week. Provide 1-2 warmup items and 1-2 cooldown items per day, sensible sets/reps, and short rest periods for circuit-style days if appropriate. Include bodyweight alternatives in the "alternatives" array when equipment isn't available.
Return only JSON.
      `
    } else {
      // nutrition
      prompt = `
You are a nutrition assistant that outputs a structured JSON meal plan that can be rendered on a frontend.
Respond ONLY with valid JSON (no extra commentary). Follow this schema exactly:

{
  "type": "nutrition",
  "title": string,
  "summary": string,
  "goals": string,
  "daysPerWeek": number,
  "dailyMenus": [
    {
      "day": string,
      "meals": [
        {
          "name": string,              // e.g., "Breakfast"
          "time": string,              // optional e.g., "8:00 AM"
          "foods": [
            {
              "name": string,
              "quantity": string,     // e.g., "1 cup", "150g"
              "calories": number
            }
          ],
          "totalCalories": number
        }
      ],
      "estimatedTotalCalories": number
    }
  ],
  "shoppingList": [string],
  "tips": [string],
  "alternatives": [
    {
      "food": string,
      "alternatives": [string]
    }
  ]
}

Generate a practical meal plan based on these inputs:
- Goals: ${goals}
- Days per week: ${daysPerWeek}
- Calorie target (daily, approximate): ${calorieTarget}
- Diet preferences/restrictions: ${dietPreferences}

Include 3 main meals per day (breakfast, lunch, dinner) and 1 optional snack. Provide simple ingredient quantities, estimated calories per food item, a concise shopping list covering the week's ingredients, and quick tips for meal prep. Return only JSON.
      `
    }

    const { text } = await generateText({
      model: openai("gpt-4o"),
      prompt,
    })

    function tryParseJSON(input: string) {
      try {
        return JSON.parse(input)
      } catch {
        const first = input.indexOf("{")
        const last = input.lastIndexOf("}")
        if (first !== -1 && last !== -1 && last > first) {
          const substr = input.substring(first, last + 1)
          try {
            return JSON.parse(substr)
          } catch {
            return null
          }
        }
        return null
      }
    }

    const parsed = tryParseJSON(text)

    if (!parsed) {
      return Response.json(
        {
          error: "Failed to parse JSON from model output",
          planText: text,
        },
        { status: 500 }
      )
    }

    return Response.json({ plan: parsed })
  } catch (error) {
    console.error("Error generating AI plan:", error)
    return Response.json({ error: "Failed to generate plan" }, { status: 500 })
  }
}
