import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function POST(request) {
  try {
    const { mealDescription } = await request.json()

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: `
Analyze the following meal and provide nutritional information:

Meal: ${mealDescription}

Please provide:
1. Estimated calories
2. Macronutrient breakdown (carbs, protein, fat in grams)
3. Key vitamins and minerals
4. Health assessment (healthy/moderate/unhealthy)
5. Suggestions for improvement

Format the response as JSON with the following structure:
{
  "calories": number,
  "macros": {
    "carbs": number,
    "protein": number,
    "fat": number
  },
  "vitamins": ["vitamin1", "vitamin2"],
  "healthScore": "healthy|moderate|unhealthy",
  "suggestions": ["suggestion1", "suggestion2"]
}
            `.trim()
          }
        ]
      })
    })

    if (!response.ok) {
      const error = await response.text()
      console.error("OpenRouter API error:", error)
      return new Response(JSON.stringify({ error: "OpenRouter API error" }), { status: 500 })
    }

    const data = await response.json()
    const text = data.choices?.[0]?.message?.content || ""

    return new Response(JSON.stringify({ analysis: text }), {
      headers: { "Content-Type": "application/json" },
    })

  } catch (error) {
    console.error("Error analyzing nutrition:", error)
    return new Response(JSON.stringify({ error: "Failed to analyze nutrition" }), { status: 500 })
  }
}
