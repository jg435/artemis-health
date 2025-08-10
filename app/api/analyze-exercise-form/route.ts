import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { image, exerciseType } = await request.json()

    if (!image || !exerciseType) {
      return Response.json(
        { error: 'Image and exercise type are required' },
        { status: 400 }
      )
    }

    const openrouterApiKey = process.env.OPENROUTER_API_KEY
    if (!openrouterApiKey) {
      throw new Error("OpenRouter API key missing")
    }

    // Exercise-specific analysis prompts
    const exercisePrompts = {
      squat: "Focus on knee tracking, hip hinge, back position, depth, and weight distribution. Check for knee valgus, forward lean, and proper depth.",
      deadlift: "Analyze bar path, back position, hip hinge, knee position, and setup. Look for rounded back, bar drift, and proper hip drive.",
      bench_press: "Examine bar path, shoulder position, arch, grip width, and elbow position. Check for shoulder impingement and proper setup.",
      overhead_press: "Focus on core stability, shoulder mobility, bar path, and lower back position. Look for excessive arch and shoulder impingement.",
      push_up: "Analyze body alignment, hand position, elbow tracking, and core stability. Check for sagging hips and flared elbows.",
      pull_up: "Examine grip, shoulder position, body alignment, and range of motion. Look for kipping and proper scapular engagement.",
      lunge: "Focus on knee tracking, torso position, step length, and balance. Check for knee valgus and forward lean.",
      plank: "Analyze body alignment, hip position, and core engagement. Look for sagging hips and elevated hips.",
      bicep_curl: "Examine elbow position, shoulder stability, and range of motion. Check for swinging and shoulder compensation.",
      row: "Focus on shoulder blade movement, torso position, and elbow path. Look for rounded shoulders and excessive torso movement.",
      other: "Analyze general movement patterns, joint alignment, and potential safety concerns."
    }

    const exercisePrompt = exercisePrompts[exerciseType as keyof typeof exercisePrompts] || exercisePrompts.other

    const messages = [
      {
        role: "system",
        content: `You are an expert exercise physiologist and certified personal trainer with extensive knowledge in biomechanics and movement analysis. You specialize in analyzing exercise form from images to provide detailed, actionable feedback.

Your analysis should be:
- Technically accurate and evidence-based
- Safety-focused, highlighting any injury risks
- Constructive and encouraging
- Specific to the exercise being performed
- Actionable with clear recommendations

For each analysis, provide a JSON response with the following structure:
{
  "overall_score": number (0-100),
  "feedback": "string (2-3 sentences of overall assessment)",
  "specific_issues": ["array of specific form problems identified"],
  "recommendations": ["array of specific actionable improvements"],
  "safety_concerns": ["array of any safety issues or injury risks"],
  "good_points": ["array of things the person is doing well"]
}

Be thorough but concise. Focus on the most important aspects that will improve performance and prevent injury.`
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Please analyze this ${exerciseType.replace('_', ' ')} exercise form. ${exercisePrompt}

Provide detailed feedback focusing on:
1. Overall technique and form quality
2. Specific biomechanical issues
3. Safety concerns and injury prevention
4. Actionable recommendations for improvement
5. Positive aspects of the current form

Return your analysis as a JSON object with the specified structure.`
          },
          {
            type: "image_url",
            image_url: {
              url: image
            }
          }
        ]
      }
    ]

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openrouterApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o", // Using GPT-4 Vision for image analysis
        messages,
        max_tokens: 1500,
        temperature: 0.3, // Lower temperature for more consistent analysis
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('OpenRouter API error:', errorText)
      throw new Error(`OpenRouter API error: ${response.status} ${errorText}`)
    }

    const data = await response.json()
    let analysisText = data?.choices?.[0]?.message?.content || ""

    // Clean up the response and parse JSON
    analysisText = analysisText.replace(/^```json\s*/, "").replace(/```$/, "").trim()
    
    let analysis
    try {
      analysis = JSON.parse(analysisText)
    } catch (parseError) {
      console.error('Failed to parse analysis JSON:', parseError)
      console.error('Raw response:', analysisText)
      
      // Fallback: create a structured response from the text
      analysis = {
        overall_score: 75, // Default score
        feedback: analysisText.substring(0, 200) + "...",
        specific_issues: ["Unable to parse detailed analysis"],
        recommendations: ["Please try again with a clearer image"],
        safety_concerns: [],
        good_points: []
      }
    }

    // Validate the analysis structure
    const validatedAnalysis = {
      overall_score: Math.max(0, Math.min(100, analysis.overall_score || 75)),
      feedback: analysis.feedback || "Analysis completed",
      specific_issues: Array.isArray(analysis.specific_issues) ? analysis.specific_issues : [],
      recommendations: Array.isArray(analysis.recommendations) ? analysis.recommendations : [],
      safety_concerns: Array.isArray(analysis.safety_concerns) ? analysis.safety_concerns : [],
      good_points: Array.isArray(analysis.good_points) ? analysis.good_points : []
    }

    return Response.json({
      success: true,
      analysis: validatedAnalysis
    })

  } catch (error) {
    console.error('Error analyzing exercise form:', error)
    return Response.json(
      { 
        error: 'Failed to analyze exercise form',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
