"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { Moon, Clock, TrendingUp, Zap } from "lucide-react"
import { WearableService, type UnifiedSleepData, type WearableType } from "@/lib/wearable-service"
import { useAuth, useApiHeaders, useEffectiveUser } from "@/context/auth-context"

export function SleepAnalysis() {
  const { user, isLoading: authLoading, selectedWearable } = useAuth()
  const effectiveUser = useEffectiveUser()
  const apiHeaders = useApiHeaders()
  const [sleepData, setSleepData] = useState<UnifiedSleepData[]>([])
  const [loading, setLoading] = useState(true)
  const [isConnected, setIsConnected] = useState(false)
  const [connectedWearable, setConnectedWearable] = useState<WearableType>(null)

  useEffect(() => {
    if (!authLoading && effectiveUser !== null) {
      fetchData()
    } else if (!authLoading && effectiveUser === null) {
      setLoading(false)
    }
  }, [effectiveUser, authLoading, selectedWearable])

  const fetchData = async () => {
    try {
      if (effectiveUser?.isDemo) {
        // Use demo data if user is in demo mode - keeping Whoop structure for demo
        const endpoint = '/api/demo/whoop/sleep'
        const response = await fetch(endpoint)
        
        if (response.ok) {
          const result = await response.json()
          const whoopRecords = result.records || []
          
          // Convert Whoop demo data to unified format
          const demoData: UnifiedSleepData[] = whoopRecords.map((record: any) => ({
            source: 'whoop' as const,
            date: record.start.split('T')[0],
            score: record.score.sleep_performance_percentage,
            duration: Math.round(record.score.stage_summary.total_in_bed_time_milli / (1000 * 60)),
            efficiency: record.score.sleep_efficiency_percentage,
            stages: {
              deep: Math.round(record.score.stage_summary.total_slow_wave_sleep_time_milli / (1000 * 60)),
              light: Math.round(record.score.stage_summary.total_light_sleep_time_milli / (1000 * 60)),
              rem: Math.round(record.score.stage_summary.total_rem_sleep_time_milli / (1000 * 60)),
              awake: Math.round(record.score.stage_summary.total_awake_time_milli / (1000 * 60)),
            },
            respiratoryRate: record.score.respiratory_rate
          }))
          
          setSleepData(demoData)
          setConnectedWearable('whoop')
          setIsConnected(true)
        } else {
          setIsConnected(false)
        }
      } else {
        // Get data from selected wearable or try all if none selected
        const sleepDataFromApis: UnifiedSleepData[] = []
        let hasConnection = false

        // If specific wearable selected, only fetch from that
        const wearablesToTry = selectedWearable ? [selectedWearable] : ['whoop', 'oura', 'fitbit']

        for (const wearable of wearablesToTry) {
          if (wearable === 'whoop') {
            try {
              const whoopResponse = await fetch('/api/whoop/sleep?days=60', {
                headers: apiHeaders
              })
              
              if (whoopResponse.ok) {
                const whoopData = await whoopResponse.json()
                const whoopRecords = whoopData.records || []
                
                if (whoopRecords.length > 0) {
                  const whoopSleepData: UnifiedSleepData[] = whoopRecords.map((record: any) => ({
                    source: 'whoop' as const,
                    date: record.start ? record.start.split('T')[0] : new Date().toISOString().split('T')[0],
                    score: record.score?.sleep_performance_percentage || 0,
                    duration: Math.round((record.score?.stage_summary?.total_in_bed_time_milli || 0) / (1000 * 60)),
                    efficiency: record.score?.sleep_efficiency_percentage || 0,
                    stages: {
                      deep: Math.round((record.score?.stage_summary?.total_slow_wave_sleep_time_milli || 0) / (1000 * 60)),
                      light: Math.round((record.score?.stage_summary?.total_light_sleep_time_milli || 0) / (1000 * 60)),
                      rem: Math.round((record.score?.stage_summary?.total_rem_sleep_time_milli || 0) / (1000 * 60)),
                      awake: Math.round((record.score?.stage_summary?.total_awake_time_milli || 0) / (1000 * 60)),
                    },
                    respiratoryRate: record.score?.respiratory_rate
                  }))
                  
                  sleepDataFromApis.push(...whoopSleepData)
                  setConnectedWearable('whoop')
                  hasConnection = true
                }
              }
            } catch (error) {
              console.log("Whoop sleep not available:", error)
            }
          }

          if (wearable === 'oura') {
            try {
              const ouraResponse = await fetch('/api/oura/sleep?days=60', {
                headers: apiHeaders
              })
              
              if (ouraResponse.ok) {
                const ouraData = await ouraResponse.json()
                const ouraRecords = ouraData.data || []
                
                if (ouraRecords.length > 0) {
                  const ouraSleepData: UnifiedSleepData[] = ouraRecords.map((record: any) => ({
                    source: 'oura' as const,
                    date: record.day || new Date().toISOString().split('T')[0],
                    score: record.score || 0,
                    duration: Math.round((record.total_sleep_duration || 0) / 60),
                    efficiency: record.efficiency || 0,
                    stages: {
                      deep: Math.round((record.deep_sleep_duration || 0) / 60),
                      light: Math.round((record.light_sleep_duration || 0) / 60),
                      rem: Math.round((record.rem_sleep_duration || 0) / 60),
                      awake: Math.round((record.awake_time || 0) / 60),
                    },
                    respiratoryRate: record.respiratory_rate
                  }))
                  
                  sleepDataFromApis.push(...ouraSleepData)
                  if (!hasConnection) {
                    setConnectedWearable('oura')
                  }
                  hasConnection = true
                }
              }
            } catch (error) {
              console.log("Oura sleep not available:", error)
            }
          }

          if (wearable === 'fitbit') {
            try {
              const fitbitResponse = await fetch('/api/fitbit/sleep?days=60', {
                headers: apiHeaders
              })
              
              if (fitbitResponse.ok) {
                const fitbitData = await fitbitResponse.json()
                const fitbitRecords = fitbitData.sleep || []
                
                if (fitbitRecords.length > 0) {
                  const fitbitSleepData: UnifiedSleepData[] = fitbitRecords.map((record: any) => ({
                    source: 'fitbit' as const,
                    date: record.date || new Date().toISOString().split('T')[0],
                    score: record.sleep_score || (record.sleep_efficiency * 100) || 0,
                    duration: record.total_sleep_duration || 0,
                    efficiency: record.sleep_efficiency || 0,
                    stages: {
                      deep: record.deep_sleep_duration || 0,
                      light: record.light_sleep_duration || 0,
                      rem: record.rem_sleep_duration || 0,
                      awake: record.awake_duration || 0,
                    },
                    onsetLatency: record.sleep_onset_latency
                  }))
                  
                  sleepDataFromApis.push(...fitbitSleepData)
                  if (!hasConnection) {
                    setConnectedWearable('fitbit')
                  }
                  hasConnection = true
                }
              }
            } catch (error) {
              console.log("Fitbit sleep not available:", error)
            }
          }
        }

        // Sort by date (most recent first)
        sleepDataFromApis.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        
        setSleepData(sleepDataFromApis)
        setIsConnected(hasConnection && sleepDataFromApis.length > 0)
      }
    } catch (error) {
      console.log("Sleep data not available:", error)
      setIsConnected(false)
      setSleepData([])
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!isConnected || sleepData.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Moon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Connect Your Wearable Device</h3>
          <p className="text-muted-foreground">
            Connect your Whoop, Oura, or Fitbit device to view detailed sleep analysis
          </p>
        </div>
      </div>
    )
  }

  const latestSleep = sleepData[0]
  const wearableName = connectedWearable === 'whoop' ? 'Whoop' : 
                      connectedWearable === 'oura' ? 'Oura Ring' : 
                      connectedWearable === 'fitbit' ? 'Fitbit' : 'Wearable'

  const chartData = sleepData
    .slice()
    .reverse()
    .map((item) => ({
      date: new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      duration: Math.round((item.duration / 60) * 100) / 100, // Hours with 2 decimal places
      efficiency: item.efficiency,
      performance: item.score,
    }))

  const sleepStagesData = latestSleep?.stages
    ? [
        { name: "Light Sleep", value: latestSleep.stages.light || 0, color: "#8884d8" },
        { name: "Deep Sleep", value: latestSleep.stages.deep || 0, color: "#82ca9d" },
        { name: "REM Sleep", value: latestSleep.stages.rem || 0, color: "#ffc658" },
        { name: "Awake", value: latestSleep.stages.awake || 0, color: "#ff7c7c" },
      ].filter(stage => stage.value > 0)
    : []

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  const getSleepQuality = (performance: number) => {
    if (performance >= 85) return { label: "Excellent", color: "text-green-600" }
    if (performance >= 70) return { label: "Good", color: "text-blue-600" }
    if (performance >= 55) return { label: "Fair", color: "text-yellow-600" }
    return { label: "Poor", color: "text-red-600" }
  }

  const sleepQuality = getSleepQuality(latestSleep?.score || 0)

  return (
    <div className="space-y-6">
      {/* Data Source Indicator */}
      <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-950 rounded-lg">
        <Zap className="h-4 w-4 text-blue-600" />
        <span className="text-sm text-blue-800 dark:text-blue-200">
          Displaying real-time sleep data from your {wearableName} device
        </span>
      </div>
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sleep Duration</CardTitle>
            <Moon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {latestSleep ? formatTime(latestSleep.duration) : "0h 0m"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Last night</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sleep Performance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${sleepQuality.color}`}>
              {latestSleep?.score || 0}%
            </div>
            <Progress value={latestSleep?.score || 0} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">{sleepQuality.label}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sleep Efficiency</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{latestSleep?.efficiency || 0}%</div>
            <Progress value={latestSleep?.efficiency || 0} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">Time asleep vs. in bed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sleep Quality</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${sleepQuality.color}`}>
              {sleepQuality.label}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Based on {connectedWearable === 'oura' ? 'sleep score' : 'performance'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sleep Duration Trend</CardTitle>
            <CardDescription>7-day sleep duration history</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`${value}h`, "Sleep Duration"]} />
                  <Bar dataKey="duration" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sleep Stages</CardTitle>
            <CardDescription>Last night's sleep composition</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sleepStagesData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${formatTime(value)}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {sleepStagesData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatTime(value as number)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sleep Details - Only show if data is available */}
      <div className="grid gap-4 md:grid-cols-3">
        {latestSleep?.stages?.deep && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Deep Sleep</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatTime(latestSleep.stages.deep)}
              </div>
              <p className="text-sm text-muted-foreground">
                {Math.round((latestSleep.stages.deep / latestSleep.duration) * 100)}% of sleep
              </p>
            </CardContent>
          </Card>
        )}

        {latestSleep?.stages?.rem && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">REM Sleep</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatTime(latestSleep.stages.rem)}
              </div>
              <p className="text-sm text-muted-foreground">
                {Math.round((latestSleep.stages.rem / latestSleep.duration) * 100)}% of sleep
              </p>
            </CardContent>
          </Card>
        )}

        {latestSleep?.respiratoryRate && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Respiratory Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{latestSleep.respiratoryRate.toFixed(1)}</div>
              <p className="text-sm text-muted-foreground">breaths per minute</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
