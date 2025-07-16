import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function POST(request: Request) {
  try {
    const { healthData } = await request.json()

    const { text } = await generateText({
      model: openai("gpt-4o"),
      prompt: `
        Based on the following health data, provide personalized insights and recommendations:
        
        Health Data:
        - Calories consumed: ${healthData.calories}
        - Steps taken: ${healthData.steps}
        - Sleep hours: ${healthData.sleep}
        - Heart rate: ${healthData.heartRate}
        - Recent meals: ${healthData.meals?.join(", ") || "Not provided"}
        - Exercise activities: ${healthData.exercises?.join(", ") || "Not provided"}
        
        Please provide:
        1. 2-3 key insights about their health patterns
        2. Specific, actionable recommendations
        3. Any potential health concerns or positive trends
        4. Suggestions for improvement
        
        Keep the response concise and focused on actionable advice.
      `,
    })

    return Response.json({ insights: text })
  } catch (error) {
    console.error("Error generating health insights:", error)
    return Response.json({ error: "Failed to generate insights" }, { status: 500 })
  }
}
