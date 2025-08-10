import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { action, conversationId, audioData } = await request.json()

    const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY
    const elevenLabsAgentId = process.env.ELEVENLABS_AGENT_ID

    if (!elevenLabsApiKey || !elevenLabsAgentId) {
      return Response.json(
        { error: "ElevenLabs API key or Agent ID not configured" },
        { status: 500 }
      )
    }

    switch (action) {
      case 'start': {
        // For ElevenLabs conversational AI, we use WebSocket connections
        // Return the WebSocket URL and agent ID for the client to connect
        const websocketUrl = `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${elevenLabsAgentId}`
        
        return Response.json({ 
          websocketUrl,
          agentId: elevenLabsAgentId,
          apiKey: elevenLabsApiKey // Only for demo - in production, handle this securely
        })
      }

      case 'send': {
        // Send audio to the conversation
        if (!conversationId || !audioData) {
          return Response.json({ error: 'Missing conversationId or audioData' }, { status: 400 })
        }

        // Convert base64 audio to buffer
        const audioBuffer = Buffer.from(audioData, 'base64')

        const formData = new FormData()
        formData.append('audio', new Blob([audioBuffer], { type: 'audio/wav' }))

        const response = await fetch(
          `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}/audio`,
          {
            method: 'POST',
            headers: {
              'xi-api-key': elevenLabsApiKey,
            },
            body: formData,
          }
        )

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`ElevenLabs API error: ${response.status} ${errorText}`)
        }

        // Return the audio response
        const audioResponseBuffer = await response.arrayBuffer()
        const base64Audio = Buffer.from(audioResponseBuffer).toString('base64')

        return Response.json({ 
          audioResponse: base64Audio,
          contentType: response.headers.get('content-type') || 'audio/mpeg'
        })
      }

      case 'end': {
        // End the conversation
        if (!conversationId) {
          return Response.json({ error: 'Missing conversationId' }, { status: 400 })
        }

        const response = await fetch(
          `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}`,
          {
            method: 'DELETE',
            headers: {
              'xi-api-key': elevenLabsApiKey,
            },
          }
        )

        if (!response.ok) {
          const errorText = await response.text()
          console.warn(`Error ending conversation: ${response.status} ${errorText}`)
        }

        return Response.json({ success: true })
      }

      default:
        return Response.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Voice conversation error:', error)
    return Response.json(
      { error: 'Failed to process voice conversation' },
      { status: 500 }
    )
  }
}