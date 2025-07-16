import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function POST(request: Request) {
  try {
    const { fitnessLevel, goals, availableTime, preferences } = await request.json()

    const { text } = await generateText({
      model: openai("gpt-4o"),
      prompt: `
        Create personalized workout recommendations based on:
        
        Fitness Level: ${fitnessLevel}
        Goals: ${goals}
        Available Time: ${availableTime} minutes
        Preferences: ${preferences}
        
        Please provide:
        1. A specific workout plan for today
        2. Exercise recommendations with sets/reps
        3. Estimated calories burned
        4. Tips for progression
        5. Alternative exercises if equipment isn't available
        
        Keep recommendations practical and achievable.
      `,
    })

    return Response.json({ recommendations: text })
  } catch (error) {
    console.error("Error generating workout recommendations:", error)
    return Response.json({ error: "Failed to generate recommendations" }, { status: 500 })
  }
}
