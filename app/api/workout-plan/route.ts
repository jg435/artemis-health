import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

type RequestBody = {
  fitnessLevel?: string
  goals?: string
  availableTime?: number
  preferences?: string
  daysPerWeek?: number
  userId?: string
}

/**
 * POST /api/workout-plan
 *
 * Accepts a JSON body with user preferences and returns a structured workout plan JSON
 * suitable for frontend rendering and for being called by an agent (e.g., ElevenLabs agent).
 *
 * Example request body:
 * {
 *   "fitnessLevel": "beginner",
 *   "goals": "build strength and lose fat",
 *   "availableTime": 45,
 *   "preferences": "no heavy equipment, likes bodyweight and dumbbells",
 *   "daysPerWeek": 3
 * }
 *
 * Response:
 * { plan: { ...structured plan... } } OR { planText: "raw string" } as fallback
 */
export async function POST(request: Request) {
  try {
    const body: RequestBody = await request.json().catch(() => ({} as RequestBody))

    const fitnessLevel = body.fitnessLevel ?? "beginner"
    const goals = body.goals ?? "general fitness"
    const availableTime = body.availableTime ?? 45
    const preferences = body.preferences ?? ""
    const daysPerWeek = body.daysPerWeek ?? 3

    const prompt = `
You are a fitness assistant that outputs a structured JSON workout plan that can be rendered on a frontend.
Respond ONLY with valid JSON (no extra commentary). Follow this schema exactly:

{
  "title": string,
  "summary": string,
  "fitnessLevel": string,
  "goals": string,
  "daysPerWeek": number,
  "dailyPlans": [
    {
      "day": string,                // e.g., "Day 1 - Upper Body"
      "durationMinutes": number,
      "warmup": [string],           // list of warmup items
      "exercises": [
        {
          "name": string,
          "description": string,
          "sets": number,
          "reps": string,           // e.g., "8-12" or "AMRAP 45s"
          "restSeconds": number,
          "estimatedCalories": number, // estimated calories burned for this exercise (optional)
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

Keep each day's duration roughly equal to the available time divided by days per week, and keep exercises realistic for the level and preferences. Provide 1-2 warmup items and 1-2 cooldown items per day. Provide sensible sets/reps and short rest periods for circuit-style days if appropriate. If equipment isn't available, include bodyweight alternatives in the "alternatives" array.

Return only JSON.
    `

    const { text } = await generateText({
      model: openai("gpt-4o"),
      prompt,
      // You can adjust tokens/temperature if needed
    })

    // Try to parse model output as JSON. Models can sometimes include markdown or commentary,
    // so attempt to extract the first JSON object if parse fails.
    function tryParseJSON(input: string) {
      try {
        return JSON.parse(input)
      } catch {
        // try to extract JSON between first { and last }
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
      // Fallback: return raw text for debugging/display by frontend/agent
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
    console.error("Error generating workout plan:", error)
    return Response.json({ error: "Failed to generate workout plan" }, { status: 500 })
  }
}
