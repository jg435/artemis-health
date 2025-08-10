import { getMedicalLabResults } from "@/lib/database"
import { AuthService } from '@/lib/auth'
import { supabase } from "@/lib/supabase"

export async function GET(request: Request) {
  try {
    // Get authenticated user and handle trainer context
    const authService = new AuthService();
    const cookies = request.headers.get('cookie') || '';
    const userSessionMatch = cookies.match(/user_session=([^;]*)/);
    const userSession = userSessionMatch ? userSessionMatch[1] : null;
    
    if (!userSession) {
      return Response.json({ error: "Not authenticated" }, { status: 401 })
    }

    const user = await authService.getUser(userSession);
    if (!user) {
      return Response.json({ error: "Invalid session" }, { status: 401 })
    }

    // Determine effective user ID (client if trainer is viewing, otherwise authenticated user)
    const viewingClientId = request.headers.get('x-viewing-client-id')
    let effectiveUserId = user.id

    if (user.user_type === 'trainer' && viewingClientId) {
      // Verify trainer has permission to view this client
      const { data: relationship } = await supabase
        .from('trainer_clients')
        .select('id')
        .eq('trainer_id', user.id)
        .eq('client_id', viewingClientId)
        .eq('is_active', true)
        .single()

      if (relationship) {
        effectiveUserId = viewingClientId
      }
    }

    // Fetch medical lab results
    const labResults = await getMedicalLabResults(effectiveUserId, user)

    return Response.json({ 
      labResults,
      count: labResults.length 
    })
  } catch (error) {
    console.error("Error fetching medical records:", error)
    return Response.json({ 
      error: "Failed to fetch medical records",
      labResults: [],
      count: 0 
    }, { status: 500 })
  }
}