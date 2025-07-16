import { AuthService } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    // Get the authenticated user
    const authService = new AuthService();
    const cookies = request.headers.get('cookie') || '';
    const userSessionMatch = cookies.match(/user_session=([^;]*)/);
    const userSession = userSessionMatch ? userSessionMatch[1] : null;

    if (!userSession) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await authService.getUser(userSession);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Generate demo physiological/recovery data
    const demoData = generateDemoPhysiologicalData(user.id);
    
    return Response.json(demoData);
  } catch (error) {
    console.error('Error in demo physiological endpoint:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function generateDemoPhysiologicalData(userId: string) {
  const data = [];
  const now = new Date();
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    // Generate realistic recovery scores with some variation
    const baseScore = 65 + Math.sin(i * 0.5) * 15 + Math.random() * 10;
    const recoveryScore = Math.max(30, Math.min(95, Math.round(baseScore)));
    
    // HRV typically ranges from 20-100ms, higher is generally better
    const hrv = Math.round(45 + Math.sin(i * 0.3) * 10 + Math.random() * 15);
    
    // Resting HR typically 50-80 for active individuals
    const restingHR = Math.round(58 + Math.sin(i * 0.4) * 8 + Math.random() * 6);
    
    data.push({
      id: `demo-recovery-${userId}-${i}`,
      user_id: userId,
      "Cycle start time": date.toISOString(),
      "Recovery score %": recoveryScore,
      "Heart rate variability (ms)": hrv,
      "Resting heart rate (bpm)": restingHR,
      "Skin temperature (°C)": Math.round((36.2 + Math.random() * 0.8) * 10) / 10,
      "Blood oxygen %": Math.round(97 + Math.random() * 2),
      created_at: date.toISOString(),
      updated_at: date.toISOString()
    });
  }
  
  return data;
}