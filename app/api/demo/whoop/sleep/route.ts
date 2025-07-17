import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Generate demo sleep data for the past 7 nights with hardcoded data
    const demoRecords = []
    const now = new Date()
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      date.setHours(22, 0, 0, 0) // Start at 10 PM
      
      // Generate realistic sleep data
      const sleepDurationHours = 6.5 + (Math.random() * 2.5) // 6.5-9 hours
      const sleepDurationMs = sleepDurationHours * 60 * 60 * 1000
      const awakeDurationMs = (15 + Math.random() * 45) * 60 * 1000 // 15-60 min awake
      const totalInBedMs = sleepDurationMs + awakeDurationMs
      
      const sleepPerformance = 70 + Math.round(Math.random() * 20) // 70-90
      const sleepEfficiency = 70 + Math.round(Math.random() * 20) // 70-90
      
      // Sleep stages (percentages of total sleep time)
      const remPercent = 0.20 + (Math.random() * 0.1) // 20-30%
      const deepPercent = 0.15 + (Math.random() * 0.1) // 15-25%
      const lightPercent = 1 - remPercent - deepPercent // Remainder
      
      const remDurationMs = sleepDurationMs * remPercent
      const deepDurationMs = sleepDurationMs * deepPercent
      const lightDurationMs = sleepDurationMs * lightPercent
      
      demoRecords.push({
        id: `demo-sleep-${i}`,
        user_id: `demo-user-${Date.now()}`,
        created_at: date.toISOString(),
        updated_at: date.toISOString(),
        start: date.toISOString(),
        end: new Date(date.getTime() + totalInBedMs).toISOString(),
        score: {
          stage_summary: {
            total_in_bed_time_milli: totalInBedMs,
            total_awake_time_milli: awakeDurationMs,
            total_light_sleep_time_milli: lightDurationMs,
            total_slow_wave_sleep_time_milli: deepDurationMs,
            total_rem_sleep_time_milli: remDurationMs
          },
          sleep_performance_percentage: sleepPerformance,
          sleep_efficiency_percentage: sleepEfficiency,
          respiratory_rate: 14 + (Math.random() * 4), // 14-18 rpm
          sleep_needed: {
            need_from_sleep_debt_milli: (Math.random() - 0.5) * 2 * 60 * 60 * 1000 // -2 to +2 hours
          }
        }
      })
    }
    
    return NextResponse.json({
      records: demoRecords,
      next_token: null
    })
  } catch (error) {
    console.error('Demo sleep endpoint error:', error);
    return NextResponse.json(
      { error: 'Failed to generate demo data' },
      { status: 500 }
    );
  }
}