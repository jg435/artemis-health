import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId") // We'll ignore this for now

    if (!isSupabaseConfigured() || !supabaseAdmin) {
      // Return mock recommendations when Supabase isn't configured
      return Response.json({
        recommendations: [
          {
            id: "demo-1",
            category: "general",
            recommendation_text:
              "This is a demo recommendation. Configure Supabase to see real personalized recommendations based on your health data.",
            priority: "low",
            is_active: true,
            generated_at: new Date().toISOString(),
            context_data: { demo: true },
          },
        ],
      })
    }

    const { data: recommendations, error } = await supabaseAdmin
      .from("health_recommendations")
      .select("*")
      .order("generated_at", { ascending: false })

    if (error) {
      console.error("Supabase error:", error)
      throw error
    }

    // Transform to match expected format
    const transformedRecommendations =
      recommendations?.map((rec) => ({
        id: rec.id,
        category: rec.category,
        recommendation_text: rec.recommendation_text,
        priority: rec.priority,
        is_active: rec.is_active,
        generated_at: rec.generated_at,
        context_data: rec.context_data,
        user_feedback: rec.user_feedback,
        feedback_rating: rec.feedback_rating,
      })) || []

    return Response.json({ recommendations: transformedRecommendations })
  } catch (error) {
    console.error("Error fetching recommendations:", error)
    return Response.json({ error: "Failed to fetch recommendations" }, { status: 500 })
  }
}
