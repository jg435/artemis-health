"use client"

import { useState, useCallback, useRef } from "react"
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Mic, MicOff, Volume2, Phone, PhoneOff, X } from "lucide-react"
import { useConversation } from '@elevenlabs/react'
import { useAuth, useApiHeaders } from "@/context/auth-context"
import dynamic from 'next/dynamic'

import { DataChart } from './data-chart'

interface VoiceConversationProps {
  healthData?: any
  onNavigateToTab?: (tab: string) => void
}

type ChartData = {
  type: 'workout' | 'sleep' | 'recovery' | 'nutrition'
  data: any[]
  title: string
  id: string // Add unique ID for better key management
}

export function VoiceConversation({ healthData, onNavigateToTab }: VoiceConversationProps) {
  const { user } = useAuth()
  const apiHeaders = useApiHeaders()
  const [error, setError] = useState<string | null>(null)
  const [displayedCharts, setDisplayedCharts] = useState<ChartData[]>([])
  const chartIdCounter = useRef(0) // Counter for unique chart IDs

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

  // Helper function to generate unique chart ID
  const generateChartId = () => {
    chartIdCounter.current += 1
    return `chart-${Date.now()}-${chartIdCounter.current}`
  }

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

  // Helper function to format health data for the agent
  const formatWhoopDataForAgent = (healthData: any) => {
    return {
      workouts: healthData.workouts || [],
      recovery: healthData.recovery || [],
      sleep: healthData.sleep || [],
      foodLogs: healthData.foodLogs || [],
      labResults: healthData.labResults || [],
      workout_count: healthData.workouts?.length || 0,
      recovery_count: healthData.recovery?.length || 0,
      sleep_count: healthData.sleep?.length || 0,
      food_entries_count: healthData.foodLogs?.length || 0,
      lab_results_count: healthData.labResults?.length || 0,
      summary: `User has ${healthData.workouts?.length || 0} workouts, ${healthData.recovery?.length || 0} recovery records, ${healthData.sleep?.length || 0} sleep records, ${healthData.foodLogs?.length || 0} food entries, and ${healthData.labResults?.length || 0} lab test results from recent data.`
    }
  }

  // Shared function for creating sleep charts
  const createSleepChart = useCallback(async (titleSuffix: string = '') => {
    console.log("🔥 Creating sleep chart...");
    try {
      const response = await fetch('/api/whoop/sleep?days=30', { headers: apiHeaders });
      console.log("Sleep API response status:", response.status);
      
      if (response.ok) {
        const data = await response.json();
        const sleepData = data.records || [];
        console.log("Sleep data fetched:", sleepData.length, "records");
        console.log("🔍 Raw sleep data sample:", sleepData[0]);
        console.log("🗓️ Sleep data date range:", 
          sleepData.length > 0 ? {
            oldest: new Date(sleepData[sleepData.length - 1]?.start).toLocaleDateString(),
            newest: new Date(sleepData[0]?.start).toLocaleDateString()
          } : "No data"
        );
        
        if (sleepData.length === 0) {
          console.warn("No sleep data available");
          setError("No sleep data available to display");
          return;
        }
        
        const chartData = sleepData
          .sort((a: any, b: any) => new Date(b.start).getTime() - new Date(a.start).getTime()) // Sort by date descending (newest first)
          .slice(0, 14) // Take first 14 (most recent)
          .map((sleep: any) => ({
            date: new Date(sleep.start).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            dateObj: new Date(sleep.start), // Keep original date object for sorting
            duration: Math.round((sleep.score?.stage_summary?.total_in_bed_time_milli || 0) / 3600000 * 10) / 10,
            efficiency: Math.round(sleep.score?.sleep_efficiency_percentage || 0),
            deepSleep: Math.round((sleep.score?.stage_summary?.total_slow_wave_sleep_time_milli || 0) / 3600000 * 10) / 10,
            remSleep: Math.round((sleep.score?.stage_summary?.total_rem_sleep_time_milli || 0) / 3600000 * 10) / 10,
            score: sleep.score?.sleep_performance_percentage ? Math.round(sleep.score.sleep_performance_percentage) : 0
          }));
        
        console.log("Processed chart data:", chartData.length, "points");
        console.log("Sample chart data:", chartData[0]);
        
        const newChart: ChartData = {
          type: 'sleep',
          data: chartData,
          title: `Sleep Analysis${titleSuffix}`,
          id: generateChartId()
        };
        
        setDisplayedCharts(prev => {
          console.log("Setting displayedCharts - prev length:", prev.length);
          const newCharts = [...prev, newChart];
          console.log("New displayedCharts length:", newCharts.length);
          return newCharts;
        });
        
        console.log("🎉 Sleep chart added successfully!");
      } else {
        console.error("Sleep API response not OK:", response.status, response.statusText);
        setError(`Failed to fetch sleep data: ${response.statusText}`);
      }
    } catch (error) {
      console.error("❌ Failed to create sleep chart:", error);
      setError(`Failed to create sleep chart: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [apiHeaders]);

  const startConversation = async () => {
    try {
      setError(null)
      
      // Fetch Whoop data, food logs, and lab results for past 30 days
      console.log('🎤 Voice Coach: Fetching Whoop data, nutrition, and lab results (30 days)...')
      
      const [workoutResponse, recoveryResponse, sleepResponse, foodLogsResponse, labResultsResponse] = await Promise.all([
        fetch('/api/whoop/workouts?days=30', { headers: apiHeaders }),
        fetch('/api/whoop/recovery?days=30', { headers: apiHeaders }),
        fetch('/api/whoop/sleep?days=30', { headers: apiHeaders }),
        fetch('/api/food-logs', { headers: apiHeaders }),
        fetch('/api/medical-records', { headers: apiHeaders })
      ])
      
      let healthData = {
        workouts: [],
        recovery: [],
        sleep: [],
        foodLogs: [],
        labResults: [],
        summary: "No health data available"
      }

      // Process workout data
      if (workoutResponse.ok) {
        const data = await workoutResponse.json()
        healthData.workouts = data.records || []
        console.log('🎤 Voice Coach: Workouts fetched:', healthData.workouts.length)
      }

      // Process recovery data
      if (recoveryResponse.ok) {
        const data = await recoveryResponse.json()
        healthData.recovery = data.records || []
        console.log('🎤 Voice Coach: Recovery data fetched:', healthData.recovery.length)
      }

      // Process sleep data
      if (sleepResponse.ok) {
        const data = await sleepResponse.json()
        healthData.sleep = data.records || []
        console.log('🎤 Voice Coach: Sleep data fetched:', healthData.sleep.length)
      }

      // Process food logs data
      if (foodLogsResponse.ok) {
        const data = await foodLogsResponse.json()
        healthData.foodLogs = data.foodLogs || []
        console.log('🎤 Voice Coach: Food logs fetched:', healthData.foodLogs.length)
      } else {
        console.log('🎤 Voice Coach: No food logs available')
      }

      // Process lab results data
      if (labResultsResponse.ok) {
        const data = await labResultsResponse.json()
        healthData.labResults = data.labResults || data || []
        console.log('🎤 Voice Coach: Lab results fetched:', healthData.labResults.length)
      } else {
        console.log('🎤 Voice Coach: No lab results available')
      }
      
      // Format all data for the agent
      const formattedData = formatWhoopDataForAgent(healthData)
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
          user_health_summary: formattedData.summary,
          whoop_workout_data: JSON.stringify(formattedData.workouts) || "Unable to fetch whoop data unfortunately. Please check your connection",
          whoop_recovery_data: JSON.stringify(formattedData.recovery) || "Unable to fetch whoop data unfortunately. Please check your connection",
          whoop_sleep_data: JSON.stringify(formattedData.sleep) || "Unable to fetch whoop data unfortunately. Please check your connection",
          food_logs_data: JSON.stringify(formattedData.foodLogs) || "No food logs available",
          lab_results_data: JSON.stringify(formattedData.labResults) || "No lab results available",
          user_name: user?.name || "User",
          timestamp: new Date().toISOString()
        },
        clientTools: {
          openWorkoutsTab: async () => {
            console.log("Executing openWorkoutsTab...");
            if (onNavigateToTab) {
              onNavigateToTab("workouts");
              console.log("Navigated to workouts tab");
            } else {
              console.warn("onNavigateToTab function not available.");
            }
          },
          showWorkoutCharts: async () => {
            console.log("Fetching workout data for charts...");
            try {
              const response = await fetch('/api/whoop/workouts?days=30', { headers: apiHeaders });
              if (response.ok) {
                const data = await response.json();
                const workouts = data.records || [];
                
                const chartData = workouts
                  .sort((a: any, b: any) => new Date(b.start).getTime() - new Date(a.start).getTime())
                  .slice(0, 14)
                  .map((workout: any) => ({
                    date: new Date(workout.start).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                    calories: Math.round((workout.score?.kilojoule || 0) / 4.184),
                    strain: workout.score?.strain || 0,
                    avgHR: workout.score?.average_heart_rate || 0,
                    maxHR: workout.score?.max_heart_rate || 0,
                    sport: workout.sport_name
                  }));
                
                setDisplayedCharts(prev => [...prev, {
                  type: 'workout',
                  data: chartData,
                  title: 'Workout Analysis',
                  id: generateChartId()
                }]);
                console.log("Workout charts displayed");
              }
            } catch (error) {
              console.error("Failed to fetch workout data:", error);
            }
          },
          showSleepCharts: async () => {
            await createSleepChart();
          },
          showRecoveryCharts: async () => {
            console.log("Fetching recovery data for charts...");
            try {
              const response = await fetch('/api/whoop/recovery?days=30', { headers: apiHeaders });
              if (response.ok) {
                const data = await response.json();
                const recoveryData = data.records || [];
                
                const chartData = recoveryData
                  .sort((a: any, b: any) => new Date(b.start).getTime() - new Date(a.start).getTime())
                  .slice(0, 14)
                  .map((recovery: any) => ({
                    date: new Date(recovery.start).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                    score: Math.round((recovery.score?.recovery_score || 0) * 100),
                    hrv: recovery.score?.hrv_rmssd_milli || 0,
                    rhr: recovery.score?.resting_heart_rate || 0,
                    skinTemp: recovery.score?.skin_temp_celsius || 0
                  }));
                
                setDisplayedCharts(prev => [...prev, {
                  type: 'recovery',
                  data: chartData,
                  title: 'Recovery Metrics',
                  id: generateChartId()
                }]);
                console.log("Recovery charts displayed");
              }
            } catch (error) {
              console.error("Failed to fetch recovery data:", error);
            }
          },
          showNutritionCharts: async () => {
            console.log("Fetching nutrition data for charts...");
            try {
              const response = await fetch('/api/food-logs', { headers: apiHeaders });
              if (response.ok) {
                const data = await response.json();
                const foodLogs = data.foodLogs || [];
                
                // Aggregate by date
                const dailyNutrition = new Map();
                foodLogs.forEach((log: any) => {
                  const date = new Date(log.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
                  const existing = dailyNutrition.get(date) || { calories: 0, protein: 0, carbs: 0, fat: 0, count: 0 };
                  existing.calories += log.calories || 0;
                  existing.protein += log.protein || 0;
                  existing.carbs += log.carbohydrates || 0;
                  existing.fat += log.fat || 0;
                  existing.count += 1;
                  dailyNutrition.set(date, existing);
                });
                
                const chartData = Array.from(dailyNutrition.entries())
                  .map(([date, nutrition]: [string, any]) => ({
                    date,
                    dateObj: new Date(date), // Convert date string back to Date for sorting
                    calories: Math.round(nutrition.calories),
                    protein: Math.round(nutrition.protein),
                    carbs: Math.round(nutrition.carbs),
                    fat: Math.round(nutrition.fat),
                    entries: nutrition.count
                  }))
                  .sort((a: any, b: any) => b.dateObj.getTime() - a.dateObj.getTime()) // Sort by date descending
                  .slice(0, 14);
                
                setDisplayedCharts(prev => [...prev, {
                  type: 'nutrition',
                  data: chartData,
                  title: 'Nutrition Tracking',
                  id: generateChartId()
                }]);
                console.log("Nutrition charts displayed");
              }
            } catch (error) {
              console.error("Failed to fetch nutrition data:", error);
            }
          },
       }
      })
      
      console.log('🎤 Voice Coach: Session started successfully')
      
    } catch (error) {
      console.error('🎤 Voice Coach Error:', error)
      setError(error instanceof Error ? error.message : 'Failed to start conversation')
    }
  }

  const endConversation = () => {
    conversation.endSession()
  }

  const removeChart = (chartId: string) => {
    setDisplayedCharts(prev => prev.filter(chart => chart.id !== chartId))
  }

  const renderChart = (chartData: ChartData) => {
    return (
      <DataChart 
        key={chartData.id}
        chartData={chartData}
        onRemove={() => removeChart(chartData.id)}
      />
    )
  }

  const isConnected = conversation.status === 'connected'
  const isSpeaking = conversation.isSpeaking || false
  const isProcessing = conversation.status === 'connecting'

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="flex-shrink-0">
        <CardTitle className="flex items-center gap-2">
          <Phone className="h-5 w-5" />
          Voice Conversation with AI Coach
        </CardTitle>
        <CardDescription>
          Have a natural conversation about your health data with your AI coach
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 flex-1 flex flex-col min-h-0">
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
              {"\n"}Charts: {displayedCharts.length}
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

        {/* Dynamic Charts Display */}
        {displayedCharts.length > 0 && (
          <div className="space-y-4 flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between flex-shrink-0">
              <h3 className="text-lg font-medium">Health Data Visualizations ({displayedCharts.length})</h3>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setDisplayedCharts([])}
                className="text-xs"
              >
                Clear All
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-4">
              {displayedCharts.map((chartData) => renderChart(chartData))}
            </div>
          </div>
        )}

        {/* Manual Test Buttons - for debugging */}
        {process.env.NODE_ENV === 'development' && isConnected && (
          <div className="space-y-2 border-t pt-2">
            <p className="text-sm font-medium">🧪 Manual Test (Dev only):</p>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => createSleepChart(' (Manual Test)')}
              >
                Test Sleep Charts
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDisplayedCharts([])}
              >
                Clear Charts
              </Button>
            </div>
          </div>
        )}

        {/* Sample Questions */}
        {!isSpeaking && isConnected && (
          <div className="space-y-2">
            <p className="text-sm font-medium">💬 Try asking:</p>
            <div className="grid grid-cols-1 gap-1 text-xs text-muted-foreground bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
              <p>• <em>"Show me my workout charts"</em></p>
              <p>• <em>"Display my sleep analysis"</em></p>
              <p>• <em>"Show my recovery metrics"</em></p>
              <p>• <em>"Display my nutrition data"</em></p>
              <p>• <em>"How can I improve my HRV?"</em></p>
              <p>• <em>"Analyze my recent workout performance"</em></p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}