"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Mic, MicOff, Volume2, Phone, PhoneOff } from "lucide-react"
import { useConversation } from '@elevenlabs/react'
import { useAuth, useApiHeaders } from "@/context/auth-context"

interface VoiceConversationProps {
  healthData?: any
}

export function VoiceConversation({ healthData }: VoiceConversationProps) {
  const { user } = useAuth()
  const apiHeaders = useApiHeaders()
  const [error, setError] = useState<string | null>(null)
  
  const conversation = useConversation({
    onConnect: () => {
      console.log('Connected to ElevenLabs')
      setError(null)
    },
    onDisconnect: () => {
      console.log('Disconnected from ElevenLabs')
    },
    onMessage: (message) => {
      console.log('Message from agent:', message)
    },
    onError: (error) => {
      console.error('Conversation error:', error)
      setError(error.message || 'Conversation error occurred')
    },
  })

  // Function to get signed URL for secure connection
  const getSignedUrl = useCallback(async (): Promise<string> => {
    try {
      const response = await fetch('/api/get-signed-url')
      if (!response.ok) {
        throw new Error('Failed to get signed URL')
      }
      const data = await response.json()
      return data.signedUrl
    } catch (error) {
      console.error('Error getting signed URL:', error)
      throw error
    }
  }, [])

  // Helper function to format Whoop data for the agent
  const formatWhoopDataForAgent = (whoopData: any) => {
    return {
      workouts: whoopData.workouts || [],
      recovery: whoopData.recovery || [],
      sleep: whoopData.sleep || [],
      workout_count: whoopData.workouts?.length || 0,
      recovery_count: whoopData.recovery?.length || 0,
      sleep_count: whoopData.sleep?.length || 0,
      summary: `User has ${whoopData.workouts?.length || 0} workouts, ${whoopData.recovery?.length || 0} recovery records, and ${whoopData.sleep?.length || 0} sleep records from the past 30 days.`
    }
  }

  const startConversation = async () => {
    try {
      setError(null)
      
      // Fetch all Whoop data for past 30 days
      console.log('🎤 Voice Coach: Fetching Whoop data (30 days)...')
      
      const [workoutResponse, recoveryResponse, sleepResponse] = await Promise.all([
        fetch('/api/whoop/workouts?days=30', { headers: apiHeaders }),
        fetch('/api/whoop/recovery?days=30', { headers: apiHeaders }),
        fetch('/api/whoop/sleep?days=30', { headers: apiHeaders })
      ])
      
      let whoopData = {
        workouts: [],
        recovery: [],
        sleep: [],
        summary: "No Whoop data available"
      }

      // Process workout data
      if (workoutResponse.ok) {
        const data = await workoutResponse.json()
        whoopData.workouts = data.records || []
        console.log('🎤 Voice Coach: Workouts fetched:', whoopData.workouts.length)
      }

      // Process recovery data
      if (recoveryResponse.ok) {
        const data = await recoveryResponse.json()
        whoopData.recovery = data.records || []
        console.log('🎤 Voice Coach: Recovery data fetched:', whoopData.recovery.length)
      }

      // Process sleep data
      if (sleepResponse.ok) {
        const data = await sleepResponse.json()
        whoopData.sleep = data.records || []
        console.log('🎤 Voice Coach: Sleep data fetched:', whoopData.sleep.length)
      }
      
      // Format all data for the agent
      const formattedData = formatWhoopDataForAgent(whoopData)
      console.log('🎤 Voice Coach: All Whoop data formatted for agent:', formattedData)
      
      // Get agent ID from API
      const response = await fetch('/api/get-signed-url')
      const { agentId } = await response.json()
      
      console.log('🎤 Voice Coach: Agent ID:', agentId)
      console.log('🎤 Voice Coach: Starting session with dynamic variables...')
      
      // Start session with properly formatted dynamic variables
      await conversation.startSession({
        agentId: agentId,
        dynamicVariables: {
          // Try multiple variable names in case your agent expects different ones
          user_health_summary: formattedData.summary,
          // Also include the full JSON as a backup
          whoop_workout_data: JSON.stringify(formattedData.workouts) || "Unable to fetch whoop data unfortunately. Please check your connection",
          whoop_recovery_data: JSON.stringify(formattedData.recovery) || "Unable to fetch whoop data unfortunately. Please check your connection",
          whoop_sleep_data: JSON.stringify(formattedData.sleep) || "Unable to fetch whoop data unfortunately. Please check your connection",
          // Include user context
          user_name: user?.name || "User",
          timestamp: new Date().toISOString()
        },
      })
      
      console.log('🎤 Voice Coach: Session started successfully with variables:', {
        user_health_summary: formattedData.summary,
        whoop_workout_data: JSON.stringify(formattedData.workouts) || "Unable to fetch whoop data unfortunately. Please check your connection",
        whoop_recovery_data: JSON.stringify(formattedData.recovery) || "Unable to fetch whoop data unfortunately. Please check your connection",
        whoop_sleep_data: JSON.stringify(formattedData.sleep) || "Unable to fetch whoop data unfortunately. Please check your connection",
      })
      
    } catch (error) {
      console.error('🎤 Voice Coach Error:', error)
      setError(error instanceof Error ? error.message : 'Failed to start conversation')
    }
  }

  const endConversation = () => {
    conversation.endSession()
  }

  const formatHealthDataForAgent = (healthData: any) => {
    if (!healthData) return "No health data available for this user."
    
    let context = "User's current health context: "
    
    // Add recovery data
    if (healthData.recovery?.length > 0) {
      const latest = healthData.recovery[0]
      context += `Recovery: ${Math.round((latest.score?.recovery_score || 0) * 100)}%, HRV: ${latest.score?.hrv_rmssd_milli || 'N/A'}ms. `
    }
    
    // Add sleep data
    if (healthData.sleep?.length > 0) {
      const latest = healthData.sleep[0]
      const sleepHours = Math.round(((latest.score?.stage_summary?.total_in_bed_time_milli - latest.score?.stage_summary?.total_awake_time_milli) / 3600000) * 10) / 10
      context += `Sleep: ${sleepHours}h, efficiency: ${Math.round((latest.score?.sleep_efficiency_percentage || 0) * 100)}%. `
    }
    
    // Add workout data
    if (healthData.workouts?.length > 0) {
      const totalStrain = healthData.workouts.reduce((sum: number, w: any) => sum + (w.score?.strain || 0), 0)
      context += `Recent workouts: ${healthData.workouts.length} sessions, avg strain ${(totalStrain / healthData.workouts.length).toFixed(1)}. `
    }
    
    return context + "Please provide personalized health coaching advice based on this data."
  }

  const isConnected = conversation.status === 'connected'
  const isSpeaking = conversation.isSpeaking || false
  const isProcessing = conversation.status === 'connecting'

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="h-5 w-5" />
          Voice Conversation with AI Coach
        </CardTitle>
        <CardDescription>
          Have a natural conversation about your health data with your AI coach
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Indicators */}
        <div className="flex flex-wrap gap-2">
          <Badge variant={isConnected ? "default" : "secondary"}>
            {conversation.status === 'connected' ? "Connected" : 
             conversation.status === 'connecting' ? "Connecting" : 
             "Disconnected"}
          </Badge>
          <Badge variant={isConnected ? "default" : "secondary"}>
            {isConnected ? "Listening" : "Not Active"}
          </Badge>
          <Badge variant={isSpeaking ? "destructive" : "secondary"}>
            {isSpeaking ? "AI Speaking" : "Ready"}
          </Badge>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Debug Info - Remove in production */}
        {process.env.NODE_ENV === 'development' && (
          <details className="text-xs bg-gray-100 p-2 rounded">
            <summary>Debug Info (dev only)</summary>
            <pre className="mt-2 whitespace-pre-wrap">
              Status: {conversation.status}
              {"\n"}Is Speaking: {isSpeaking.toString()}
              {"\n"}User: {user?.name || 'Unknown'}
            </pre>
          </details>
        )}

        {/* Connection Control */}
        {!isConnected ? (
          <Button 
            onClick={startConversation} 
            disabled={isProcessing}
            className="w-full"
          >
            <Phone className="h-4 w-4 mr-2" />
            {isProcessing ? "Connecting..." : "Start Voice Conversation"}
          </Button>
        ) : (
          <div className="space-y-4">
            {/* Continuous Conversation Status */}
            <div className="text-center p-6 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
              {isSpeaking ? (
                <>
                  <Volume2 className="h-12 w-12 mx-auto text-green-600 animate-pulse mb-3" />
                  <p className="text-lg font-medium text-green-800 dark:text-green-200">AI Coach is Speaking</p>
                  <p className="text-sm text-green-600 dark:text-green-400">Listen to the response...</p>
                </>
              ) : (
                <>
                  <Mic className="h-12 w-12 mx-auto text-green-600 mb-3" />
                  <p className="text-lg font-medium text-green-800 dark:text-green-200">Voice Conversation Active</p>
                  <p className="text-sm text-green-600 dark:text-green-400">Just speak naturally - I'm listening!</p>
                </>
              )}
            </div>

            {/* End Conversation Button */}
            <div className="flex justify-center">
              <Button
                variant="destructive"
                onClick={endConversation}
                disabled={isProcessing}
                size="lg"
                className="px-8"
              >
                <PhoneOff className="h-5 w-5 mr-2" />
                End Conversation
              </Button>
            </div>

            {/* Instructions */}
            <div className="text-sm text-muted-foreground bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
              <div className="font-medium text-blue-800 dark:text-blue-200 mb-2">💬 Natural Conversation:</div>
              <p>🎤 Simply speak your questions naturally</p>
              <p>🤖 AI will respond automatically with voice</p>
              <p>⏱️ No need to hold buttons - just talk!</p>
              <p>📱 Works hands-free once connected</p>
            </div>
          </div>
        )}

        {/* Sample Questions */}
        {!isSpeaking && isConnected && (
          <div className="space-y-2">
            <p className="text-sm font-medium">💬 Try asking:</p>
            <div className="grid grid-cols-1 gap-1 text-xs text-muted-foreground bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
              <p>• <em>"How's my recovery looking today?"</em></p>
              <p>• <em>"Should I work out based on my sleep?"</em></p>
              <p>• <em>"What should I focus on nutritionally?"</em></p>
              <p>• <em>"How can I improve my HRV?"</em></p>
              <p>• <em>"Analyze my recent workout performance"</em></p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}