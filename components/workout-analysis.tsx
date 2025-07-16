"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts"
import { Activity, Flame, Clock, MapPin, Zap } from "lucide-react"
import type { WhoopWorkout } from "@/lib/whoop"
import { useAuth } from "@/context/auth-context"

export function WorkoutAnalysis() {
  const { user } = useAuth()
  const [whoopData, setWhoopData] = useState<WhoopWorkout[]>([])
  const [loading, setLoading] = useState(true)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      // Use demo data if user is in demo mode
      const endpoint = user?.isDemo ? '/api/demo/whoop/workouts' : '/api/whoop/workouts?limit=10'
      const whoopResponse = await fetch(endpoint)
      
      if (whoopResponse.ok) {
        const whoopResult = await whoopResponse.json()
        console.log("result from whoopresult:", whoopResult)
        setWhoopData(whoopResult.records || [])
        setIsConnected(true)
      } else {
        setIsConnected(false)
        setWhoopData([])
      }
    } catch (error) {
      console.log("Whoop workout data not available")
      setIsConnected(false)
      setWhoopData([])
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

  if (!isConnected || whoopData.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Connect Your Whoop Device</h3>
          <p className="text-muted-foreground">
            Connect your Whoop device to view workout analysis and strain data
          </p>
        </div>
      </div>
    )
  }

  const recentWorkouts = whoopData.slice(0, 7).map(workout => {
    const durationMinutes = Math.round((new Date(workout.end).getTime() - new Date(workout.start).getTime()) / 60000)
    return {
      "Workout start time": workout.start,
      "Duration (min)": durationMinutes, // Whole number minutes
      "Activity name": workout.sport_name,
      "Activity Strain": Math.round(workout.score.strain * 100) / 100, // 2 decimal places
      "Energy burned (cal)": Math.round((workout.score.kilojoule * 0.239006) * 100) / 100, // 2 decimal places
      "Max HR (bpm)": Math.round(workout.score.max_heart_rate),
      "Average HR (bpm)": Math.round(workout.score.average_heart_rate),
      "HR Zone 1 %": 0, // These would need to be calculated from zone_duration
      "HR Zone 2 %": 0,
      "HR Zone 3 %": 0,
      "Distance (meters)": workout.score.distance_meter ? workout.score.distance_meter.toString() : "0",
      "GPS enabled": (workout.score.distance_meter || 0) > 0
    }
  })

  // Group workouts by date and aggregate metrics
  const workoutsByDate = whoopData.reduce((acc: { [key: string]: any }, workout) => {
    const dateKey = new Date(workout.start).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    const durationMinutes = Math.round((new Date(workout.end).getTime() - new Date(workout.start).getTime()) / 60000)
    const calories = Math.round((workout.score.kilojoule * 0.239006) * 100) / 100
    
    if (!acc[dateKey]) {
      acc[dateKey] = {
        date: dateKey,
        strain: 0,
        calories: 0,
        duration: 0,
        workoutCount: 0,
        totalAvgHR: 0,
        maxHR: 0,
      }
    }
    
    acc[dateKey].strain += workout.score.strain
    acc[dateKey].calories += calories
    acc[dateKey].duration += durationMinutes
    acc[dateKey].workoutCount += 1
    acc[dateKey].totalAvgHR += workout.score.average_heart_rate
    acc[dateKey].maxHR = Math.max(acc[dateKey].maxHR, workout.score.max_heart_rate)
    
    return acc
  }, {})

  const chartData = Object.values(workoutsByDate)
    .slice(-7) // Last 7 days
    .map((day: any) => ({
      date: day.date,
      strain: Math.round(day.strain * 100) / 100,
      calories: Math.round(day.calories * 100) / 100,
      duration: day.duration,
      avgHR: Math.round(day.totalAvgHR / day.workoutCount),
      maxHR: Math.round(day.maxHR),
      workoutCount: day.workoutCount
    }))

  const totalCalories = Math.round(recentWorkouts.reduce((sum, workout) => sum + (workout["Energy burned (cal)"] || 0), 0) * 100) / 100
  const totalDuration = recentWorkouts.reduce((sum, workout) => sum + (workout["Duration (min)"] || 0), 0) // Whole number minutes
  const avgStrain = Math.round((recentWorkouts.reduce((sum, workout) => sum + (workout["Activity Strain"] || 0), 0) / recentWorkouts.length) * 100) / 100

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
          Displaying real-time workout data from your Whoop device
        </span>
      </div>
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Weekly Strain</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getStrainColor(avgStrain)}`}>{avgStrain}</div>
            <p className="text-xs text-muted-foreground mt-1">{getStrainLevel(avgStrain)} intensity</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Calories Burned</CardTitle>
            <Flame className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCalories.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Last 7 workouts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(totalDuration)}</div>
            <p className="text-xs text-muted-foreground mt-1">Last 7 workouts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Workouts</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentWorkouts.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Last 7 days</p>
          </CardContent>
        </Card>
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
            <CardTitle>Heart Rate Zones</CardTitle>
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
                  <Line type="monotone" dataKey="maxHR" stroke="#82ca9d" strokeWidth={2} name="Max HR" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Workouts */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Workouts</CardTitle>
          <CardDescription>Your latest training sessions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentWorkouts.slice(0, 5).map((workout, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full">
                    <Activity className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">{workout["Activity name"] || "Workout"}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(workout["Workout start time"]).toLocaleDateString()} •{" "}
                      {formatDuration(workout["Duration (min)"])}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center space-x-4">
                    <div>
                      <p className="text-sm font-medium">{workout["Energy burned (cal)"]} cal</p>
                      <p className="text-xs text-muted-foreground">
                        Strain: {workout["Activity Strain"] || "0.00"}
                      </p>
                    </div>
                    <Badge
                      variant={
                        (workout["Activity Strain"] || 0) >= 14
                          ? "destructive"
                          : (workout["Activity Strain"] || 0) >= 10
                            ? "default"
                            : "secondary"
                      }
                    >
                      {getStrainLevel(workout["Activity Strain"] || 0)}
                    </Badge>
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
