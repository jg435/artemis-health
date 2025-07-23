"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts"
import { Activity, Flame, Clock, MapPin, Zap } from "lucide-react"
import { WearableService, type UnifiedActivityData, type WearableType } from "@/lib/wearable-service"
import { useAuth } from "@/context/auth-context"

export function WorkoutAnalysis() {
  const { user } = useAuth()
  const [activityData, setActivityData] = useState<UnifiedActivityData[]>([])
  const [loading, setLoading] = useState(true)
  const [isConnected, setIsConnected] = useState(false)
  const [connectedWearable, setConnectedWearable] = useState<WearableType>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      if (user?.isDemo) {
        // Use demo data if user is in demo mode - keeping Whoop structure for demo
        const endpoint = '/api/demo/whoop/workouts'
        const response = await fetch(endpoint)
        
        if (response.ok) {
          const result = await response.json()
          const whoopRecords = result.records || []
          
          // Convert Whoop demo data to unified format
          const demoData: UnifiedActivityData[] = whoopRecords.map((record: any) => ({
            source: 'whoop' as const,
            date: record.start.split('T')[0],
            strain: record.score.strain,
            calories: Math.round(record.score.kilojoule / 4.184), // Convert kJ to calories
            distance: record.score.distance_meter,
            averageHeartRate: record.score.average_heart_rate,
            maxHeartRate: record.score.max_heart_rate,
          }))
          
          setActivityData(demoData)
          setConnectedWearable('whoop')
          setIsConnected(true)
        } else {
          setIsConnected(false)
        }
      } else {
        // Use unified wearable service for real users
        const wearable = await WearableService.getConnectedWearable()
        setConnectedWearable(wearable)
        
        if (wearable) {
          // For Oura, get both activity and recovery data to combine heart rate info
          const [activityData, recoveryData] = await Promise.all([
            WearableService.getActivityData(),
            wearable === 'oura' ? WearableService.getRecoveryData() : Promise.resolve([])
          ])
          
          // If Oura, merge heart rate data from recovery into activity data
          if (wearable === 'oura' && recoveryData.length > 0) {
            const enrichedActivityData = activityData.map(activity => {
              const matchingRecovery = recoveryData.find(recovery => recovery.date === activity.date)
              return {
                ...activity,
                averageHeartRate: matchingRecovery?.metrics?.heartRate || activity.averageHeartRate,
                maxHeartRate: undefined // Don't show max HR for Oura
              }
            })
            setActivityData(enrichedActivityData)
          } else {
            setActivityData(activityData)
          }
          
          setIsConnected(activityData.length > 0)
        } else {
          setIsConnected(false)
        }
      }
    } catch (error) {
      console.log("Activity data not available:", error)
      setIsConnected(false)
      setActivityData([])
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
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

  if (!isConnected || activityData.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Connect Your Wearable Device</h3>
          <p className="text-muted-foreground">
            Connect your Whoop or Oura device to view activity and workout data
          </p>
        </div>
      </div>
    )
  }

  const latestActivity = activityData[0]
  const wearableName = connectedWearable === 'whoop' ? 'Whoop' : connectedWearable === 'oura' ? 'Oura Ring' : 'Wearable'

  // Aggregate data by date for chart display
  const aggregatedByDate = new Map<string, {
    calories: number;
    strain: number;
    steps: number;
    distance: number;
    heartRates: number[];
    maxHeartRate: number;
    workoutCount: number;
    score?: number;
    heartRateZones?: {
      zone1?: number;
      zone2?: number;
      zone3?: number;
      zone4?: number;
      zone5?: number;
      zone6?: number;
    };
  }>();

  activityData.forEach(item => {
    const dateKey = item.date;
    const existing = aggregatedByDate.get(dateKey) || {
      calories: 0,
      strain: 0,
      steps: 0,
      distance: 0,
      heartRates: [],
      maxHeartRate: 0,
      workoutCount: 0,
      score: item.score,
      heartRateZones: undefined
    };

    existing.calories += item.calories;
    existing.strain += item.strain || 0;
    existing.steps = Math.max(existing.steps, item.steps || 0); // Take highest step count for the day
    existing.distance += item.distance || 0;
    if (item.averageHeartRate) existing.heartRates.push(item.averageHeartRate);
    existing.maxHeartRate = Math.max(existing.maxHeartRate, item.maxHeartRate || 0);
    existing.workoutCount += 1;
    if (item.score) existing.score = item.score; // For Oura, use the daily activity score
    
    // Aggregate heart rate zones for Oura data
    if (item.heartRateZones) {
      if (!existing.heartRateZones) {
        existing.heartRateZones = {
          zone1: 0,
          zone2: 0,
          zone3: 0,
          zone4: 0,
          zone5: 0,
          zone6: 0
        };
      }
      existing.heartRateZones.zone1 = (existing.heartRateZones.zone1 || 0) + (item.heartRateZones.zone1 || 0);
      existing.heartRateZones.zone2 = (existing.heartRateZones.zone2 || 0) + (item.heartRateZones.zone2 || 0);
      existing.heartRateZones.zone3 = (existing.heartRateZones.zone3 || 0) + (item.heartRateZones.zone3 || 0);
      existing.heartRateZones.zone4 = (existing.heartRateZones.zone4 || 0) + (item.heartRateZones.zone4 || 0);
      existing.heartRateZones.zone5 = (existing.heartRateZones.zone5 || 0) + (item.heartRateZones.zone5 || 0);
      existing.heartRateZones.zone6 = (existing.heartRateZones.zone6 || 0) + (item.heartRateZones.zone6 || 0);
    }

    aggregatedByDate.set(dateKey, existing);
  });

  // Chart data for activity trends
  const chartData = Array.from(aggregatedByDate.entries())
    .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime()) // Sort by date ascending
    .map(([date, data]) => ({
      date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      calories: data.calories,
      strain: data.strain,
      steps: data.steps,
      distance: Math.round(data.distance / 1000 * 100) / 100, // Convert to km
      avgHR: data.heartRates.length > 0 ? Math.round(data.heartRates.reduce((sum, hr) => sum + hr, 0) / data.heartRates.length) : 0,
      maxHR: data.maxHeartRate,
    }))

  // Calculate totals from aggregated daily data (last 7 days)
  const last7DaysData = Array.from(aggregatedByDate.values()).slice(-7);
  const totalCalories = last7DaysData.reduce((sum, day) => sum + day.calories, 0)
  const avgStrain = connectedWearable === 'whoop' 
    ? last7DaysData.reduce((sum, day) => sum + day.strain, 0) / Math.max(last7DaysData.length, 1)
    : latestActivity?.score || 0

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  }

  const getStrainColor = (strain: number) => {
    if (strain >= 18) return "text-red-600"
    if (strain >= 14) return "text-orange-600"
    if (strain >= 10) return "text-yellow-600"
    return "text-green-600"
  }

  const getStrainLevel = (strain: number) => {
    if (strain >= 18) return "Very High"
    if (strain >= 14) return "High"
    if (strain >= 10) return "Moderate"
    return "Low"
  }

  return (
    <div className="space-y-6">
      {/* Data Source Indicator */}
      <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-950 rounded-lg">
        <Zap className="h-4 w-4 text-blue-600" />
        <span className="text-sm text-blue-800 dark:text-blue-200">
          Displaying real-time activity data from your {wearableName} device
        </span>
      </div>
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {connectedWearable === 'whoop' ? 'Weekly Strain' : 'Activity Score'}
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getStrainColor(avgStrain)}`}>
              {connectedWearable === 'whoop' ? avgStrain.toFixed(1) : Math.round(avgStrain)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {connectedWearable === 'whoop' ? `${getStrainLevel(avgStrain)} intensity` : 'Average activity score'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Calories Burned</CardTitle>
            <Flame className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCalories.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Last 7 days</p>
          </CardContent>
        </Card>

        {connectedWearable === 'whoop' && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Duration</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">N/A</div>
              <p className="text-xs text-muted-foreground mt-1">Available with Whoop demo data</p>
            </CardContent>
          </Card>
        )}

        {connectedWearable === 'oura' && latestActivity?.steps && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Daily Steps</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{latestActivity.steps.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">Latest day</p>
            </CardContent>
          </Card>
        )}

        {connectedWearable === 'oura' && latestActivity?.distance && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Distance</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(latestActivity.distance / 1000).toFixed(1)} km</div>
              <p className="text-xs text-muted-foreground mt-1">Latest day</p>
            </CardContent>
          </Card>
        )}

        {connectedWearable === 'whoop' && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Workouts</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activityData.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Last 7 days</p>
            </CardContent>
          </Card>
        )}

      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Strain & Calories</CardTitle>
            <CardDescription>Workout intensity and energy expenditure</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Bar yAxisId="left" dataKey="strain" fill="#8884d8" name="Strain" />
                  <Bar yAxisId="right" dataKey="calories" fill="#82ca9d" name="Calories" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Heart Rate Trends</CardTitle>
            <CardDescription>Average and max heart rate trends</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="avgHR" stroke="#8884d8" strokeWidth={2} name="Avg HR" />
                  {connectedWearable === 'whoop' && (
                    <Line type="monotone" dataKey="maxHR" stroke="#82ca9d" strokeWidth={2} name="Max HR" />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Activity Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Activity Summary</CardTitle>
          <CardDescription>Daily aggregated strain and calories</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from(aggregatedByDate.entries())
              .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime()) // Sort by date descending (newest first)
              .slice(0, 7) // Show last 7 days
              .map(([date, data], index) => (
              <div key={date} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full">
                    <Activity className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {connectedWearable === 'whoop' ? `${data.workoutCount} Workout${data.workoutCount !== 1 ? 's' : ''}` : 'Daily Activity'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center space-x-4">
                    <div>
                      <p className="text-sm font-medium">{data.calories} cal</p>
                      <p className="text-xs text-muted-foreground">
                        {connectedWearable === 'whoop' ? `Total Strain: ${data.strain.toFixed(1)}` : 
                         data.steps ? `${data.steps.toLocaleString()} steps` : 'Activity'}
                      </p>
                    </div>
                    {(connectedWearable === 'whoop' && data.strain > 0) && (
                      <Badge
                        variant={
                          data.strain >= 14
                            ? "destructive"
                            : data.strain >= 10
                              ? "default"
                              : "secondary"
                        }
                      >
                        {getStrainLevel(data.strain)}
                      </Badge>
                    )}
                    {connectedWearable === 'oura' && data.score && (
                      <Badge variant="default">
                        Score: {data.score}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
