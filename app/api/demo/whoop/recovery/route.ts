import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Generate demo recovery data for the past 7 days with hardcoded data
    const demoRecords = []
    const now = new Date()
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      
      // Generate realistic but varied recovery data
      const recoveryScore = 30 + Math.round(Math.random() * 60) // 30-90 range
      const hrv = 35 + (Math.random() * 25) // 35-60ms range
      const rhr = 52 + (Math.random() * 12) // 52-64 bpm range
      const strain = 8 + (Math.random() * 8) // 8-16 strain range
      
      demoRecords.push({
        id: `demo-recovery-${i}`,
        user_id: `demo-user-${Date.now()}`,
        created_at: date.toISOString(),
        updated_at: date.toISOString(),
        start: date.toISOString(),
        end: new Date(date.getTime() + 24 * 60 * 60 * 1000).toISOString(),
        score: {
          recovery_score: recoveryScore,
          hrv_rmssd_milli: hrv,
          resting_heart_rate: Math.round(rhr),
          strain: strain,
          skin_temp_celsius: 36.2 + (Math.random() * 0.8),
          spo2_percentage: 96 + (Math.random() * 3)
        }
      })
    }
    
    return NextResponse.json({
      records: demoRecords,
      next_token: null
    })
  } catch (error) {
    console.error('Demo recovery endpoint error:', error);
    return NextResponse.json(
      { error: 'Failed to generate demo data' },
      { status: 500 }
    );
  }
}