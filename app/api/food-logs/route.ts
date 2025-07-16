import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { AuthService } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const foodEntry = await request.json()

    if (!isSupabaseConfigured() || !supabase) {
      console.log("Demo mode – would save food entry:", foodEntry)
      return Response.json({ success: true, id: foodEntry.id })
    }

    // If you're handling file uploads client-side and passing a URL,
    // use that URL directly in photo_url. Otherwise, upload to Storage first
    // and set `publicUrl` here.
    const publicUrl = foodEntry.photoUrl

    const dbEntry = {
      user_id:          foodEntry.user_id, // Include user_id
      logged_at: new Date().toISOString(),
      meal_type:        foodEntry.mealType,
      food_name:        foodEntry.foodName,
      description:      foodEntry.description,
      quantity:         foodEntry.quantity,
      unit:             foodEntry.unit,
      meal_time:        foodEntry.mealTime,
      photo_url:        publicUrl,
      calories:         foodEntry.estimatedCalories,
      protein_g:        foodEntry.macros?.protein,
      carbs_g:          foodEntry.macros?.carbs,
      fat_g:            foodEntry.macros?.fat,
      fiber_g:          foodEntry.macros?.fiber,
      sugar_g:          foodEntry.macros?.sugar,
      sodium_mg:        foodEntry.macros?.sodium_mg,
      notes:            foodEntry.notes,
    }

    const { data, error } = await supabase
      .from("food_logs")
      .insert(dbEntry)
      .select()
      .single()

    if (error) {
      console.error("Supabase error:", error)
      throw error
    }

    return Response.json({ success: true, data })
  } catch (error) {
    console.error("Error saving food log:", error)
    return Response.json(
      { error: "Failed to save food log" },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    // Get the authenticated user
    const authService = new AuthService();
    const cookies = request.headers.get('cookie') || '';
    const userSessionMatch = cookies.match(/user_session=([^;]*)/);
    const userSession = userSessionMatch ? userSessionMatch[1] : null;

    if (!userSession) {
      return Response.json({ foodLogs: [] });
    }

    const user = await authService.getUser(userSession);
    if (!user) {
      return Response.json({ foodLogs: [] });
    }

    // If it's a demo user, return empty array (they use demo endpoints)
    if (user.isDemo) {
      return Response.json({ foodLogs: [] });
    }

    const { searchParams } = new URL(request.url)
    const date = searchParams.get("date") || new Date().toISOString().split("T")[0]

    if (!isSupabaseConfigured() || !supabase) {
      return Response.json({ foodLogs: [] })
    }

    const { data: foodLogs, error } = await supabase
      .from("food_logs")
      .select("*")
      .eq("user_id", user.id) // Filter by user_id
      .gte("logged_at", `${date}T00:00:00Z`)
      .lt("logged_at", `${date}T23:59:59Z`)
      .order("logged_at", { ascending: false })

    if (error) {
      console.error("Supabase error:", error)
      throw error
    }

    return Response.json({ foodLogs })
  } catch (error) {
    console.error("Error fetching food logs:", error)
    return Response.json(
      { error: "Failed to fetch food logs" },
      { status: 500 }
    )
  }
}
