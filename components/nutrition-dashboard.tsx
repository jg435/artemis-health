"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
} from "recharts"
import { Apple, Zap, Target, TrendingUp, Clock, Utensils } from "lucide-react"
import { FoodLogger } from "./food-logger"
import { RecentFoodAnalyses } from "./recent-food-analyses"
import { useAuth, useEffectiveUser, useApiHeaders } from "@/context/auth-context"

interface NutritionData {
  totalCalories: number
  targetCalories: number
  macros: {
    protein: number
    carbs: number
    fat: number
    fiber: number
  }
  targetMacros: {
    protein: number
    carbs: number
    fat: number
  }
  meals: Array<{
    type: string
    calories: number
    time: string
  }>
  micronutrients: {
    sodium: number
    potassium: number
    calcium: number
    iron: number
    vitaminC: number
  }
}

export function NutritionDashboard() {
  const { user, isViewingAsTrainer } = useAuth()
  const effectiveUser = useEffectiveUser()
  const apiHeaders = useApiHeaders()
  const [sessionFoodLogs, setSessionFoodLogs] = useState<any[]>([])
  const [nutritionData, setNutritionData] = useState<NutritionData>({
    totalCalories: 1800,
    targetCalories: 2500, // Keep target as default
    macros: {
      protein: 113, // 25% of 1800 calories / 4 cal per gram
      carbs: 203,   // 45% of 1800 calories / 4 cal per gram  
      fat: 60,      // 30% of 1800 calories / 9 cal per gram
      fiber: 25,
    },
    targetMacros: {
      protein: 100,
      carbs: 120,
      fat: 60,
    },
    meals: [],
    micronutrients: {
      sodium: 0,
      potassium: 0,
      calcium: 0,
      iron: 0,
      vitaminC: 0,
    },
  })
  
  const [isLoading, setIsLoading] = useState(true)

  // Load and calculate nutrition data from food logs
  useEffect(() => {
    if (effectiveUser) {
      loadNutritionData()
    }
    
    // Listen for demo food entries
    const handleDemoFoodAdded = (event: CustomEvent) => {
      try {
        if (effectiveUser?.isDemo && event.detail) {
          const newEntry = event.detail
          // Convert to expected format
          const foodLog = {
            meal_type: newEntry.meal_type,
            calories: newEntry.calories,
            protein_g: 0, // These would come from analysis
            carbs_g: 0,
            fat_g: 0,
            fiber_g: 0,
            sodium_mg: 0,
            meal_time: new Date().toTimeString().slice(0, 5)
          }
          setSessionFoodLogs(prev => [foodLog, ...prev])
          // Reload nutrition data to include new entry
          setTimeout(() => loadNutritionData(), 100)
        }
      } catch (error) {
        console.error('Error handling demo food added event:', error)
      }
    }
    
    window.addEventListener('demoFoodAdded', handleDemoFoodAdded as EventListener)
    
    return () => {
      window.removeEventListener('demoFoodAdded', handleDemoFoodAdded as EventListener)
    }
  }, [effectiveUser?.isDemo, effectiveUser?.id])

  const loadNutritionData = async () => {
    try {
      setIsLoading(true)
      
      // Use demo data if effectiveUser is in demo mode
      if (effectiveUser?.isDemo && effectiveUser?.id) {
        const response = await fetch('/api/demo/nutrition')
        if (response.ok) {
          const data = await response.json()
          const foodLogs = [...(data.meals || []), ...sessionFoodLogs]
          calculateNutritionFromLogs(foodLogs)
        }
      } else {
        const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
        const response = await fetch(`/api/food-logs?date=${today}&userId=${effectiveUser?.id}`, {
          headers: apiHeaders
        })
        
        if (response.ok) {
          const data = await response.json()
          const foodLogs = data.foodLogs || []
          calculateNutritionFromLogs(foodLogs)
        }
      }
    } catch (error) {
      console.error("Error loading nutrition data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const calculateNutritionFromLogs = (foodLogs: any[]) => {
    // For demo mode, use hardcoded today's values instead of calculating from logs
    if (effectiveUser?.isDemo) {
      // Still show meals from today's logs for the meal breakdown
      const today = new Date().toISOString().split('T')[0]
      const todaysLogs = foodLogs.filter(log => {
        const logDate = new Date(log.logged_at).toISOString().split('T')[0]
        return logDate === today
      })
      
      // Group meals by type (using today's logs only)
      const mealsByType = todaysLogs.reduce((acc: any, log: any) => {
        const mealType = log.meal_type || 'other'
        if (!acc[mealType]) {
          acc[mealType] = { calories: 0, time: log.meal_time || '12:00' }
        }
        acc[mealType].calories += log.calories || 0
        return acc
      }, {})
      
      const meals = Object.entries(mealsByType).map(([type, data]: [string, any]) => ({
        type,
        calories: data.calories,
        time: data.time
      }))
      
      // Update nutrition data state with hardcoded values for demo
      setNutritionData(prev => ({
        ...prev,
        totalCalories: 1800,
        macros: {
          protein: 113, // 25% of 1800 calories / 4 cal per gram
          carbs: 203,   // 45% of 1800 calories / 4 cal per gram  
          fat: 60,      // 30% of 1800 calories / 9 cal per gram
          fiber: 25,
        },
        meals,
        micronutrients: {
          ...prev.micronutrients,
          sodium: 2300,
        }
      }))
      return
    }
    
    // Original logic for non-demo users
    const today = new Date().toISOString().split('T')[0]
    const todaysLogs = foodLogs.filter(log => {
      const logDate = new Date(log.logged_at).toISOString().split('T')[0]
      return logDate === today
    })
    
    // Calculate totals from today's food logs only
    const totals = todaysLogs.reduce((acc: any, log: any) => {
      return {
        calories: acc.calories + (log.calories || 0),
        protein: acc.protein + (log.protein_g || 0),
        carbs: acc.carbs + (log.carbs_g || 0),
        fat: acc.fat + (log.fat_g || 0),
        fiber: acc.fiber + (log.fiber_g || 0),
        sodium: acc.sodium + (log.sodium_mg || 0),
      }
    }, { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sodium: 0 })
    
    // Group meals by type (using today's logs only)
    const mealsByType = todaysLogs.reduce((acc: any, log: any) => {
      const mealType = log.meal_type || 'other'
      if (!acc[mealType]) {
        acc[mealType] = { calories: 0, time: log.meal_time || '12:00' }
      }
      acc[mealType].calories += log.calories || 0
      return acc
    }, {})
    
    const meals = Object.entries(mealsByType).map(([type, data]: [string, any]) => ({
      type,
      calories: data.calories,
      time: data.time
    }))
    
    // Update nutrition data state
    setNutritionData(prev => ({
      ...prev,
      totalCalories: totals.calories,
      macros: {
        protein: totals.protein,
        carbs: totals.carbs,
        fat: totals.fat,
        fiber: totals.fiber,
      },
      meals,
      micronutrients: {
        ...prev.micronutrients,
        sodium: totals.sodium,
      },
    }))
  }

  const [weeklyTrends, setWeeklyTrends] = useState<any[]>([])

  // Load weekly trends data
  useEffect(() => {
    loadWeeklyTrends()
  }, [])

  const loadWeeklyTrends = async () => {
    try {
      const trends = []
      const today = new Date()
      
      // Get data for the last 7 days
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today)
        date.setDate(date.getDate() - i)
        const dateString = date.toISOString().split('T')[0]
        
        // Use demo data if effectiveUser is in demo mode
        const endpoint = effectiveUser?.isDemo 
          ? `/api/demo/nutrition?date=${dateString}`
          : `/api/food-logs?date=${dateString}&userId=${effectiveUser?.id}`
        const response = await fetch(endpoint, {
          headers: apiHeaders
        })
        let dayTotals = { calories: 0, protein: 0, carbs: 0, fat: 0 }
        
        if (response.ok) {
          const data = await response.json()
          const foodLogs = effectiveUser?.isDemo ? (data.meals || []) : (data.foodLogs || [])
          
          dayTotals = foodLogs.reduce((acc: any, log: any) => ({
            calories: acc.calories + (log.calories || 0),
            protein: acc.protein + (log.protein_g || 0),
            carbs: acc.carbs + (log.carbs_g || 0),
            fat: acc.fat + (log.fat_g || 0)
          }), dayTotals)
        }
        
        trends.push({
          day: date.toLocaleDateString('en-US', { weekday: 'short' }),
          calories: Math.round(dayTotals.calories),
          protein: Math.round(dayTotals.protein * 10) / 10,
          carbs: Math.round(dayTotals.carbs * 10) / 10,
          fat: Math.round(dayTotals.fat * 10) / 10
        })
      }
      
      setWeeklyTrends(trends)
    } catch (error) {
      console.error('Error loading weekly trends:', error)
    }
  }

  const macroData = [
    {
      name: "Protein",
      value: nutritionData.macros.protein,
      target: nutritionData.targetMacros.protein,
      color: "#8884d8",
      calories: nutritionData.macros.protein * 4,
    },
    {
      name: "Carbs",
      value: nutritionData.macros.carbs,
      target: nutritionData.targetMacros.carbs,
      color: "#82ca9d",
      calories: nutritionData.macros.carbs * 4,
    },
    {
      name: "Fat",
      value: nutritionData.macros.fat,
      target: nutritionData.targetMacros.fat,
      color: "#ffc658",
      calories: nutritionData.macros.fat * 9,
    },
  ]

  const mealDistribution = nutritionData.meals.map((meal) => ({
    name: meal.type ? meal.type.charAt(0).toUpperCase() + meal.type.slice(1) : 'Other',
    value: meal.calories,
    time: meal.time,
  }))

  const getCalorieStatus = () => {
    const percentage = (nutritionData.totalCalories / nutritionData.targetCalories) * 100
    if (percentage < 80) return { status: "Under", color: "text-yellow-600" }
    if (percentage > 110) return { status: "Over", color: "text-red-600" }
    return { status: "On Track", color: "text-green-600" }
  }

  const getMacroStatus = (current: number, target: number) => {
    const percentage = (current / target) * 100
    if (percentage < 80) return "low"
    if (percentage > 120) return "high"
    return "good"
  }

  const calorieStatus = getCalorieStatus()

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Food Logging */}
        <div className="max-w-md mx-auto">
          <FoodLogger disabled={isViewingAsTrainer} />
        </div>

        {/* Loading State */}
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading nutrition data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Food Logging */}
      <div className="max-w-md mx-auto">
        <FoodLogger onFoodLogged={loadNutritionData} disabled={isViewingAsTrainer} />
      </div>

      {/* Recent Analyses */}
      <RecentFoodAnalyses />

      {/* Daily Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Calories Today</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${calorieStatus.color}`}>{nutritionData.totalCalories}</div>
            <Progress value={(nutritionData.totalCalories / nutritionData.targetCalories) * 100} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {nutritionData.targetCalories - nutritionData.totalCalories} remaining • {calorieStatus.status}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Protein</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{nutritionData.macros.protein}g</div>
            <Progress
              value={(nutritionData.macros.protein / nutritionData.targetMacros.protein) * 100}
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">Target: {nutritionData.targetMacros.protein}g</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Carbs</CardTitle>
            <Apple className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{nutritionData.macros.carbs}g</div>
            <Progress value={(nutritionData.macros.carbs / nutritionData.targetMacros.carbs) * 100} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">Target: {nutritionData.targetMacros.carbs}g</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fat</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{nutritionData.macros.fat}g</div>
            <Progress value={(nutritionData.macros.fat / nutritionData.targetMacros.fat) * 100} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">Target: {nutritionData.targetMacros.fat}g</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analysis */}
      <Tabs defaultValue="macros" className="space-y-4">
        <TabsList className="grid w-full grid-cols-1 md:grid-cols-3">
          <TabsTrigger value="macros">Macros</TabsTrigger>
          <TabsTrigger value="meals">Meals</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="macros" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Macro Distribution</CardTitle>
                <CardDescription>Current vs. target macronutrients</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={macroData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}g`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {macroData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value}g`, "Grams"]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Macro Targets</CardTitle>
                <CardDescription>Progress towards daily goals</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {macroData.map((macro) => (
                  <div key={macro.name} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{macro.name}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm">
                          {macro.value}g / {macro.target}g
                        </span>
                        <Badge
                          variant={
                            getMacroStatus(macro.value, macro.target) === "good"
                              ? "default"
                              : getMacroStatus(macro.value, macro.target) === "low"
                                ? "secondary"
                                : "destructive"
                          }
                        >
                          {getMacroStatus(macro.value, macro.target)}
                        </Badge>
                      </div>
                    </div>
                    <Progress value={(macro.value / macro.target) * 100} />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="meals" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Meal Distribution</CardTitle>
                <CardDescription>Calorie breakdown by meal</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={mealDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value, time }) => `${name}: ${value} cal`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {mealDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={`hsl(${index * 90}, 70%, 60%)`} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Meal Timeline</CardTitle>
                <CardDescription>Today's eating schedule</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {nutritionData.meals.map((meal, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full">
                        <Utensils className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium capitalize">{meal.type}</p>
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          <span>{meal.time}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{meal.calories} cal</p>
                      <p className="text-sm text-muted-foreground">
                        {Math.round((meal.calories / nutritionData.totalCalories) * 100)}%
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Weekly Nutrition Trends</CardTitle>
              <CardDescription>7-day calorie and macro intake</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weeklyTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="calories" stroke="#8884d8" strokeWidth={2} name="Calories" />
                    <Line type="monotone" dataKey="protein" stroke="#82ca9d" strokeWidth={2} name="Protein (g)" />
                    <Line type="monotone" dataKey="carbs" stroke="#ffc658" strokeWidth={2} name="Carbs (g)" />
                    <Line type="monotone" dataKey="fat" stroke="#ff7c7c" strokeWidth={2} name="Fat (g)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  )
}
