import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase"

export async function POST(request: Request) {
  try {
    if (!isSupabaseConfigured() || !supabaseAdmin) {
      return Response.json({ error: "Supabase not configured" }, { status: 500 })
    }

    const { recommendationId } = await request.json()

    const { error } = await supabaseAdmin
      .from("health_recommendations")
      .update({ is_active: false })
      .eq("id", recommendationId)

    if (error) {
      throw error
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error("Error completing recommendation:", error)
    return Response.json({ error: "Failed to complete recommendation" }, { status: 500 })
  }
}
