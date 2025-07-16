import { supabase, isSupabaseConfigured } from "./supabase"

interface User {
  id: string;
  isDemo?: boolean;
}

// Fetch recent workouts data
export async function getWorkoutsData(limit = 10, user?: User) {
  try {
    if (!isSupabaseConfigured() || !supabase) {
      return []
    }

    const { data, error } = await supabase
      .from("workouts")
      .select("*")
      .order("Workout start time", { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  } catch (error) {
    console.error("Error fetching workouts:", error)
    return []
  }
}

// Fetch recent sleep data
export async function getSleepData(limit = 7, user?: User) {
  try {
    if (!isSupabaseConfigured() || !supabase) {
      return []
    }

    const { data, error } = await supabase
      .from("sleep")
      .select("*")
      .order("Cycle start time", { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  } catch (error) {
    console.error("Error fetching sleep data:", error)
    return []
  }
}

// Fetch physiological cycles (recovery data)
export async function getPhysiologicalData(limit = 7, user?: User) {
  console.log("getPhysiologicalData")
  try {
    // Use demo endpoint if user is in demo mode
    if (user?.isDemo) {
      const response = await fetch('/api/demo/physiological', {
        headers: {
          'Cookie': document.cookie
        }
      });
      if (response.ok) {
        return await response.json();
      }
      return [];
    }

    if (!isSupabaseConfigured() || !supabase) {
      console.log("supabase not configured")
      return []
    }

    console.log("supabase configured")

    const { data, error } = await supabase
      .from("physiological_cycles")
      .select("*")
      .order("Cycle start time", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching data:", error);
      throw error;
    }

    return data || [];

  } catch (error) {
    console.error("Error fetching physiological data:", error)
    return []
  }
}

// Fetch medical lab results for a specific user
export async function getMedicalLabResults(userId?: string, user?: User) {
  try {
    // Use demo endpoint if user is in demo mode
    if (user?.isDemo) {
      const response = await fetch('/api/demo/medical', {
        headers: {
          'Cookie': document.cookie
        }
      });
      if (response.ok) {
        return await response.json();
      }
      return [];
    }

    if (!isSupabaseConfigured() || !supabase) {
      return []
    }

    let query = supabase.from("medical_lab_results").select("*")
    
    // Filter by user_id if provided
    if (userId) {
      query = query.eq("user_id", userId)
    }

    const { data, error } = await query

    if (error) throw error
    return data || []
  } catch (error) {
    console.error("Error fetching lab results:", error)
    return []
  }
}

// Fetch recent journal entries
export async function getJournalEntries(limit = 10, user?: User) {
  try {
    if (!isSupabaseConfigured() || !supabase) {
      return []
    }

    const { data, error } = await supabase
      .from("journal_entries")
      .select("*")
      .order("Cycle start time", { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  } catch (error) {
    console.error("Error fetching journal entries:", error)
    return []
  }
}

// Get comprehensive health summary
export async function getHealthSummary(userId?: string, user?: User) {
  try {
    const [workouts, sleep, physiological, labResults, journal] = await Promise.all([
      getWorkoutsData(7, user),
      getSleepData(7, user),
      getPhysiologicalData(7, user),
      getMedicalLabResults(userId, user),
      getJournalEntries(7, user),
    ])

    return {
      workouts,
      sleep,
      physiological,
      labResults,
      journal,
    }
  } catch (error) {
    console.error("Error fetching health summary:", error)
    return {
      workouts: [],
      sleep: [],
      physiological: [],
      labResults: [],
      journal: [],
    }
  }
}
