import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Generate demo workout data for the past week with hardcoded data
    const demoRecords = []
    const now = new Date()
    
    const activities = [
      { name: "Running", avgStrain: 12, avgKilojoules: 800 },
      { name: "Weightlifting", avgStrain: 10, avgKilojoules: 600 },
      { name: "Cycling", avgStrain: 14, avgKilojoules: 1000 },
      { name: "Yoga", avgStrain: 6, avgKilojoules: 300 },
      { name: "Swimming", avgStrain: 15, avgKilojoules: 900 },
      { name: "CrossFit", avgStrain: 16, avgKilojoules: 1100 }
    ]
    
    // Generate 8-12 workouts over the past 10 days
    const workoutCount = 8 + Math.floor(Math.random() * 5)
    
    for (let i = 0; i < workoutCount; i++) {
      const daysAgo = Math.floor(Math.random() * 10)
      const date = new Date(now)
      date.setDate(date.getDate() - daysAgo)
      date.setHours(6 + Math.floor(Math.random() * 12), Math.floor(Math.random() * 60), 0, 0)
      
      const activity = activities[Math.floor(Math.random() * activities.length)]
      const duration = 30 + Math.floor(Math.random() * 90) // 30-120 minutes
      const strain = activity.avgStrain + (Math.random() - 0.5) * 4 // ±2 from average
      const kilojoules = activity.avgKilojoules + (Math.random() - 0.5) * 400 // ±200 from average
      
      const maxHR = 170 + Math.floor(Math.random() * 30) // 170-200 bpm
      const avgHR = Math.floor(maxHR * (0.7 + Math.random() * 0.2)) // 70-90% of max
      
      demoRecords.push({
        id: `demo-workout-${i}`,
        user_id: `demo-user-${Date.now()}`,
        created_at: date.toISOString(),
        updated_at: date.toISOString(),
        start: date.toISOString(),
        end: new Date(date.getTime() + duration * 60 * 1000).toISOString(),
        sport: {
          id: i + 1,
          name: activity.name
        },
        score: {
          strain: Math.max(0, strain),
          average_heart_rate: avgHR,
          max_heart_rate: maxHR,
          kilojoule: Math.max(0, kilojoules),
          percent_recorded: 95 + Math.random() * 5, // 95-100%
          distance_meter: activity.name === "Running" || activity.name === "Cycling" ? 
            Math.floor(3000 + Math.random() * 7000) : null, // 3-10km for running/cycling
          altitude_gain_meter: Math.floor(Math.random() * 200), // 0-200m elevation
          zone_duration: {
            zone_zero_milli: duration * 60 * 1000 * 0.1, // 10% in zone 0
            zone_one_milli: duration * 60 * 1000 * 0.3,   // 30% in zone 1  
            zone_two_milli: duration * 60 * 1000 * 0.4,   // 40% in zone 2
            zone_three_milli: duration * 60 * 1000 * 0.15, // 15% in zone 3
            zone_four_milli: duration * 60 * 1000 * 0.05,  // 5% in zone 4
            zone_five_milli: 0
          }
        }
      })
    }
    
    // Sort by date (newest first)
    demoRecords.sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime())
    
    return NextResponse.json({
      records: demoRecords,
      next_token: null
    })
  } catch (error) {
    console.error('Demo workouts endpoint error:', error);
    return NextResponse.json(
      { error: 'Failed to generate demo data' },
      { status: 500 }
    );
  }
}