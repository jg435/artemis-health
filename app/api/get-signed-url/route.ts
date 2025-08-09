import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const agentId = process.env.ELEVENLABS_AGENT_ID;

    if (!agentId) {
      return NextResponse.json(
        { error: 'Missing ElevenLabs Agent ID' },
        { status: 500 }
      );
    }

    return NextResponse.json({ agentId });
  } catch (error) {
    console.error('Error getting agent ID:', error);
    return NextResponse.json(
      { error: 'Failed to get agent ID' },
      { status: 500 }
    );
  }
}