import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

interface ExtractedLabResult {
  testName: string
  result: number
  unit: string
  referenceRange: string
  flag: string
}

async function extractLabDataFromImage(imageBase64: string): Promise<ExtractedLabResult[]> {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this medical lab results image and extract all test results. For each test, provide:
1. Test Name
2. Result (numeric value only)
3. Unit
4. Reference Range
5. Flag (High, Low, Normal, Critical, etc.)

Return the data as a JSON array with this structure:
[
  {
    "testName": "Test Name",
    "result": 123.45,
    "unit": "mg/dL",
    "referenceRange": "70-100",
    "flag": "High"
  }
]

If no lab results are found, return an empty array. Only extract actual lab test results with numeric values.`
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        max_tokens: 2000,
        temperature: 0.1
      })
    })

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.statusText}`)
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content

    if (!content) {
      throw new Error("No response from OpenRouter")
    }

    // Try to parse JSON from the response
    const jsonMatch = content.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      throw new Error("No valid JSON array found in response")
    }

    const extractedData = JSON.parse(jsonMatch[0])
    return extractedData
  } catch (error) {
    console.error("Error extracting lab data:", error)
    throw error
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { image, userId } = body

    if (!image || !userId) {
      return NextResponse.json(
        { error: "Image and userId are required" },
        { status: 400 }
      )
    }

    // Remove data URL prefix if present
    const base64Image = image.replace(/^data:image\/[a-z]+;base64,/, "")

    // Extract lab data using GPT-4o
    const extractedResults = await extractLabDataFromImage(base64Image)

    if (extractedResults.length === 0) {
      return NextResponse.json(
        { error: "No lab results found in the image" },
        { status: 400 }
      )
    }

    // Insert extracted results into Supabase
    const labResultsToInsert = extractedResults.map((result) => ({
      user_id: userId,
      "Test Name": result.testName,
      "Result": result.result,
      "Unit": result.unit,
      "Reference Range": result.referenceRange,
      "Flag": result.flag,
      test_date: new Date().toISOString().split('T')[0] // Today's date
    }))

    const { data: insertedData, error: insertError } = await supabase
      .from("medical_lab_results")
      .insert(labResultsToInsert)
      .select()

    if (insertError) {
      console.error("Error inserting lab results:", insertError)
      return NextResponse.json(
        { error: "Failed to save lab results" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      extractedResults,
      savedResults: insertedData,
      message: `Successfully extracted and saved ${extractedResults.length} lab results`
    })

  } catch (error) {
    console.error("Error processing medical record upload:", error)
    return NextResponse.json(
      { error: "Failed to process medical record" },
      { status: 500 }
    )
  }
}