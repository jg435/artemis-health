"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Heart, Activity, TrendingUp, Zap } from "lucide-react"
import { WearableService, type UnifiedRecoveryData, type WearableType } from "@/lib/wearable-service"
import { useAuth, useApiHeaders, useEffectiveUser } from "@/context/auth-context"

export function RecoveryDashboard() {
  const { user, selectedWearable } = useAuth()
  const effectiveUser = useEffectiveUser()
  const apiHeaders = useApiHeaders()
  const [recoveryData, setRecoveryData] = useState<UnifiedRecoveryData[]>([])
  const [loading, setLoading] = useState(true)
  const [isConnected, setIsConnected] = useState(false)
  const [connectedWearable, setConnectedWearable] = useState<WearableType>(null)

  useEffect(() => {
    if (effectiveUser) {
      fetchData()
    }
  }, [effectiveUser, selectedWearable])

  const fetchData = async () => {
    try {
      if (effectiveUser?.isDemo) {
        // Use demo data if user is in demo mode - keeping Whoop structure for demo
        const endpoint = '/api/demo/whoop/recovery'
        const response = await fetch(endpoint)
        
        if (response.ok) {
          const result = await response.json()
          const whoopRecords = result.records || []
          
          // Convert Whoop demo data to unified format
          const demoData: UnifiedRecoveryData[] = whoopRecords.map((record: any) => ({
            source: 'whoop' as const,
            score: record.score.recovery_score,
            date: record.created_at.split('T')[0],
            metrics: {
              heartRate: record.score.resting_heart_rate,
              hrv: record.score.hrv_rmssd_milli,
              temperature: record.score.skin_temp_celsius,
              oxygenSaturation: record.score.spo2_percentage,
            }
          }))
          
          setRecoveryData(demoData)
          setConnectedWearable('whoop')
          setIsConnected(true)
        } else {
          setIsConnected(false)
        }
      } else {
        // Get data from selected wearable or try all if none selected
        const recoveryDataFromApis: UnifiedRecoveryData[] = []
        let hasConnection = false

        // If specific wearable selected, only fetch from that
        const wearablesToTry = selectedWearable ? [selectedWearable] : ['whoop', 'oura']

        for (const wearable of wearablesToTry) {
          if (wearable === 'whoop') {
            try {
              const whoopResponse = await fetch('/api/whoop/recovery?days=30', {
                headers: apiHeaders
              })
              
              if (whoopResponse.ok) {
                const whoopData = await whoopResponse.json()
                const whoopRecords = whoopData.records || []
                
                if (whoopRecords.length > 0) {
                  const whoopRecoveryData: UnifiedRecoveryData[] = whoopRecords.map((record: any) => ({
                    source: 'whoop' as const,
                    score: record.score?.recovery_score || 0,
                    date: record.created_at ? record.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
                    metrics: {
                      heartRate: record.score?.resting_heart_rate,
                      hrv: record.score?.hrv_rmssd_milli,
                      temperature: record.score?.skin_temp_celsius,
                      oxygenSaturation: record.score?.spo2_percentage,
                    }
                  }))
                  
                  recoveryDataFromApis.push(...whoopRecoveryData)
                  setConnectedWearable('whoop')
                  hasConnection = true
                }
              }
            } catch (error) {
              console.log("Whoop recovery not available:", error)
            }
          }

          if (wearable === 'oura') {
            try {
              const ouraResponse = await fetch('/api/oura/readiness?days=30', {
                headers: apiHeaders
              })
              
              if (ouraResponse.ok) {
                const ouraData = await ouraResponse.json()
                const ouraRecords = ouraData.data || []
                
                if (ouraRecords.length > 0) {
                  const ouraRecoveryData: UnifiedRecoveryData[] = ouraRecords.map((record: any) => ({
                    source: 'oura' as const,
                    score: record.score || 0,
                    date: record.day || new Date().toISOString().split('T')[0],
                    metrics: {
                      heartRate: record.contributors?.resting_heart_rate,
                      hrv: record.contributors?.hrv,
                      temperature: record.contributors?.body_temperature,
                    }
                  }))
                  
                  recoveryDataFromApis.push(...ouraRecoveryData)
                  if (!hasConnection) {
                    setConnectedWearable('oura')
                  }
                  hasConnection = true
                }
              }
            } catch (error) {
              console.log("Oura readiness not available:", error)
            }
          }
        }

        // Sort by date (most recent first)
        recoveryDataFromApis.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        
        setRecoveryData(recoveryDataFromApis)
        setIsConnected(hasConnection && recoveryDataFromApis.length > 0)
      }
    } catch (error) {
      console.log("Recovery data not available:", error)
      setIsConnected(false)
      setRecoveryData([])
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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

  if (!isConnected || recoveryData.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Zap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Connect Your Wearable Device</h3>
          <p className="text-muted-foreground">
            Connect your Whoop or Oura device to view recovery data
          </p>
        </div>
      </div>
    )
  }

  const latestData = recoveryData[0]
  const wearableName = connectedWearable === 'whoop' ? 'Whoop' : connectedWearable === 'oura' ? 'Oura Ring' : 'Wearable'

  const chartData = recoveryData
    .slice()
    .reverse()
    .map((item) => ({
      date: new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      recovery: item.score,
      hrv: item.metrics.hrv || 0,
      rhr: item.metrics.heartRate || 0,
    }))

  const getRecoveryColor = (score: number) => {
    if (score >= 67) return "text-green-600"
    if (score >= 34) return "text-yellow-600"
    return "text-red-600"
  }

  const getRecoveryStatus = (score: number) => {
    if (score >= 67) return "High"
    if (score >= 34) return "Medium"
    return "Low"
  }

  return (
    <div className="space-y-6">
      {/* Data Source Indicator */}
      <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-950 rounded-lg">
        <Zap className="h-4 w-4 text-blue-600" />
        <span className="text-sm text-blue-800 dark:text-blue-200">
          Displaying real-time data from your {wearableName} device
        </span>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {connectedWearable === 'oura' ? 'Readiness Score' : 'Recovery Score'}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getRecoveryColor(latestData?.score || 0)}`}>
              {latestData?.score || 0}%
            </div>
            <Progress value={latestData?.score || 0} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {getRecoveryStatus(latestData?.score || 0)} Recovery
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resting Heart Rate</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{latestData?.metrics.heartRate || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">bpm</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Heart Rate Variability</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{latestData?.metrics.hrv || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {connectedWearable === 'oura' ? 'balance score' : 'ms'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Temperature</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {latestData?.metrics.temperature?.toFixed(1) || "0.0"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {connectedWearable === 'oura' ? 'deviation' : '°C'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recovery Trend</CardTitle>
            <CardDescription>7-day recovery score history</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="recovery" stroke="#8884d8" strokeWidth={2} name="Recovery %" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>HRV & Resting HR</CardTitle>
            <CardDescription>Heart rate variability and resting heart rate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Line yAxisId="left" type="monotone" dataKey="hrv" stroke="#82ca9d" strokeWidth={2} name="HRV" />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="rhr"
                    stroke="#ffc658"
                    strokeWidth={2}
                    name="RHR (bpm)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Temperature</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {latestData?.metrics.temperature?.toFixed(1) || "0.0"}
              {connectedWearable === 'oura' ? '' : '°C'}
            </div>
            <p className="text-sm text-muted-foreground">
              {connectedWearable === 'oura' ? 'Temperature deviation' : 'Skin temperature'}
            </p>
          </CardContent>
        </Card>

        {latestData?.metrics.oxygenSaturation && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Blood Oxygen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{latestData.metrics.oxygenSaturation.toFixed(1)}%</div>
              <p className="text-sm text-muted-foreground">SpO2 level</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recovery Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge
              variant={
                (latestData?.score || 0) >= 67
                  ? "default"
                  : (latestData?.score || 0) >= 34
                    ? "secondary"
                    : "destructive"
              }
              className="text-lg px-3 py-1"
            >
              {getRecoveryStatus(latestData?.score || 0)}
            </Badge>
            <p className="text-sm text-muted-foreground mt-2">
              {(latestData?.score || 0) >= 67
                ? "Your body is well recovered and ready for strain"
                : (latestData?.score || 0) >= 34
                  ? "Your body is moderately recovered"
                  : "Your body needs more recovery time"}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}