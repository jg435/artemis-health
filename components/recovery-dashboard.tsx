"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Heart, Activity, TrendingUp, Zap } from "lucide-react"
import type { WhoopRecovery } from "@/lib/whoop"
import { useAuth } from "@/context/auth-context"

export function RecoveryDashboard() {
  const { user } = useAuth()
  const [whoopData, setWhoopData] = useState<WhoopRecovery[]>([])
  const [loading, setLoading] = useState(true)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      // Use demo data if user is in demo mode
      const endpoint = user?.isDemo ? '/api/demo/whoop/recovery' : '/api/whoop/recovery?limit=7'
      const whoopResponse = await fetch(endpoint)
      
      if (whoopResponse.ok) {
        const whoopResult = await whoopResponse.json()
        setWhoopData(whoopResult.records || [])
        setIsConnected(true)
      } else {
        setIsConnected(false)
      }
    } catch (error) {
      console.log("Whoop recovery data not available")
      setIsConnected(false)
      setWhoopData([])
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

  if (!isConnected || whoopData.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Zap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Connect Your Whoop Device</h3>
          <p className="text-muted-foreground">
            Connect your Whoop device to view recovery, sleep, and workout data
          </p>
        </div>
      </div>
    )
  }

  const latestData = {
    "Recovery score %": whoopData[0].score.recovery_score,
    "Resting heart rate (bpm)": whoopData[0].score.resting_heart_rate,
    "Heart rate variability (ms)": whoopData[0].score.hrv_rmssd_milli,
    "Skin temp (celsius)": whoopData[0].score.skin_temp_celsius,
    "Blood oxygen %": whoopData[0].score.spo2_percentage,
    "Day Strain": "N/A"
  }

  const chartData = whoopData
    .slice()
    .reverse()
    .map((item) => ({
      date: new Date(item.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      recovery: item.score.recovery_score,
      hrv: item.score.hrv_rmssd_milli,
      rhr: item.score.resting_heart_rate,
      strain: 0, // Strain data would come from a different endpoint
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
          Displaying real-time data from your Whoop device
        </span>
      </div>
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recovery Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getRecoveryColor(latestData?.["Recovery score %"] || 0)}`}>
              {latestData?.["Recovery score %"] || 0}%
            </div>
            <Progress value={latestData?.["Recovery score %"] || 0} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {getRecoveryStatus(latestData?.["Recovery score %"] || 0)} Recovery
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resting Heart Rate</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{latestData?.["Resting heart rate (bpm)"] || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">bpm</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Heart Rate Variability</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{latestData?.["Heart rate variability (ms)"] || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">ms</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Day Strain</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{latestData?.["Day Strain"] || "0.0"}</div>
            <p className="text-xs text-muted-foreground mt-1">strain score</p>
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
                  <Line yAxisId="left" type="monotone" dataKey="hrv" stroke="#82ca9d" strokeWidth={2} name="HRV (ms)" />
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
            <CardTitle className="text-lg">Body Temperature</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{latestData?.["Skin temp (celsius)"]?.toFixed(1) || "0.0"}°C</div>
            <p className="text-sm text-muted-foreground">Skin temperature</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Blood Oxygen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{latestData?.["Blood oxygen %"]?.toFixed(1) || "0.0"}%</div>
            <p className="text-sm text-muted-foreground">SpO2 level</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recovery Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge
              variant={
                (latestData?.["Recovery score %"] || 0) >= 67
                  ? "default"
                  : (latestData?.["Recovery score %"] || 0) >= 34
                    ? "secondary"
                    : "destructive"
              }
              className="text-lg px-3 py-1"
            >
              {getRecoveryStatus(latestData?.["Recovery score %"] || 0)}
            </Badge>
            <p className="text-sm text-muted-foreground mt-2">
              {(latestData?.["Recovery score %"] || 0) >= 67
                ? "Your body is well recovered and ready for strain"
                : (latestData?.["Recovery score %"] || 0) >= 34
                  ? "Your body is moderately recovered"
                  : "Your body needs more recovery time"}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
