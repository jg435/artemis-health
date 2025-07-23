"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Camera, Upload, X, Clock, Utensils, Zap, Scale } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useAuth } from "@/context/auth-context"

interface FoodEntry {
  id: string
  photo?: string
  mealType: string
  foodName: string
  description: string
  quantity: number
  unit: string
  mealTime: string
  estimatedCalories?: number
  macros?: {
    protein: number
    carbs: number
    fat: number
    fiber: number
  }
  createdAt: Date
}

interface FoodLoggerProps {
  onFoodLogged?: () => void
}

export function FoodLogger({ onFoodLogged }: FoodLoggerProps = {}) {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [foodEntries, setFoodEntries] = useState<FoodEntry[]>([])
  const [currentEntry, setCurrentEntry] = useState<Partial<FoodEntry>>({
    mealType: "",
    foodName: "",
    description: "",
    quantity: 1,
    unit: "serving",
    mealTime: new Date().toTimeString().slice(0, 5),
  })
  const [photo, setPhoto] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load existing food entries when component mounts
  useEffect(() => {
    loadFoodEntries()
  }, [])

  const loadFoodEntries = async () => {
    try {
      setIsLoading(true)
      
      // Don't load real data in demo mode
      if (user?.isDemo) {
        setFoodEntries([])
        setIsLoading(false)
        return
      }
      
      const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
      const response = await fetch(`/api/food-logs?date=${today}`)
      
      if (response.ok) {
        const data = await response.json()
        const entries = (data.foodLogs || []).map((log: any) => ({
          id: log.id || Date.now().toString(),
          photo: log.photo_url,
          mealType: log.meal_type,
          foodName: log.food_name,
          description: log.description || '',
          quantity: log.quantity || 1,
          unit: log.unit || 'serving',
          mealTime: log.meal_time || '12:00',
          estimatedCalories: log.calories,
          macros: {
            protein: log.protein_g || 0,
            carbs: log.carbs_g || 0,
            fat: log.fat_g || 0,
            fiber: log.fiber_g || 0
          },
          createdAt: new Date(log.logged_at || Date.now())
        }))
        setFoodEntries(entries)
      }
    } catch (error) {
      console.error('Error loading food entries:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const mealTypes = [
    { value: "breakfast", label: "Breakfast", icon: "🌅" },
    { value: "lunch", label: "Lunch", icon: "☀️" },
    { value: "dinner", label: "Dinner", icon: "🌙" },
    { value: "snack", label: "Snack", icon: "🍎" },
  ]

  const units = [
    "serving",
    "cup",
    "tablespoon",
    "teaspoon",
    "ounce",
    "gram",
    "pound",
    "piece",
    "slice",
    "bowl",
    "plate",
    "glass",
  ]

  const handlePhotoCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setPhoto(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const analyzeFood = async () => {
    if (!currentEntry.foodName && !photo) {
      alert("Please provide either a food name or photo")
      return
    }

    // Prevent AI analysis in demo mode
    if (user?.isDemo) {
      alert("AI food analysis is not available in demo mode. Please create an account to use photo analysis and advanced nutrition tracking.")
      return
    }

    setIsAnalyzing(true)
    try {
      const response = await fetch("/api/analyze-food", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          foodName: currentEntry.foodName,
          description: currentEntry.description,
          quantity: currentEntry.quantity,
          unit: currentEntry.unit,
          photo: photo,
        }),
      })

      const result = await response.json()
      setAnalysisResult(result.analysis)

      // Auto-fill nutritional data if available and valid
      if (result.analysis && !result.analysis.error) {
        setCurrentEntry((prev) => ({
          ...prev,
          estimatedCalories: result.analysis.calories || prev.estimatedCalories,
          macros: result.analysis.macros || prev.macros,
        }))
      } else if (result.analysis?.error) {
        // Show error message but don't fail
        alert("AI analysis failed. Please enter nutrition information manually.")
      }
    } catch (error) {
      console.error("Error analyzing food:", error)
      alert("Failed to analyze food. Please try again.")
    } finally {
      setIsAnalyzing(false)
    }
  }

  const saveFoodEntry = async () => {
    if (!currentEntry.mealType || !currentEntry.foodName) {
      alert("Please fill in meal type and food name")
      return
    }

    // In demo mode, prevent food logging and ask to create account
    if (user?.isDemo) {
      alert("Food logging is not available in demo mode. Please create an account to log your meals and track your nutrition.")
      return
    }

    // Encourage nutrition data but don't require it
    const hasNutritionData = currentEntry.estimatedCalories || 
      (currentEntry.macros && (currentEntry.macros.protein || currentEntry.macros.carbs || currentEntry.macros.fat))
    
    if (!hasNutritionData) {
      const proceed = confirm("No nutrition information entered. Save food log anyway?")
      if (!proceed) return
    }

    const newEntry: FoodEntry = {
      id: Date.now().toString(),
      photo: photo || undefined,
      mealType: currentEntry.mealType!,
      foodName: currentEntry.foodName!,
      description: currentEntry.description || "",
      quantity: currentEntry.quantity || 1,
      unit: currentEntry.unit || "serving",
      mealTime: currentEntry.mealTime || new Date().toTimeString().slice(0, 5),
      estimatedCalories: currentEntry.estimatedCalories,
      macros: currentEntry.macros,
      createdAt: new Date(),
    }

    // Add user_id for the API request
    const entryWithUserId = {
      ...newEntry,
      user_id: user?.id, // Use actual authenticated user ID
      photoUrl: photo // API expects photoUrl not photo
    }

    try {
      // Save to database
      const response = await fetch("/api/food-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entryWithUserId),
      })

      if (response.ok) {
        // Reload entries from database to get the latest data
        await loadFoodEntries()
        // Notify parent component to refresh
        if (onFoodLogged) {
          onFoodLogged()
        }
        resetForm()
        setIsOpen(false)
        alert("Food logged successfully!")
      } else {
        throw new Error("Failed to save food entry")
      }
    } catch (error) {
      console.error("Error saving food entry:", error)
      alert("Failed to save food entry. Please try again.")
    }
  }

  const resetForm = () => {
    setCurrentEntry({
      mealType: "",
      foodName: "",
      description: "",
      quantity: 1,
      unit: "serving",
      mealTime: new Date().toTimeString().slice(0, 5),
      estimatedCalories: undefined,
      macros: undefined
    })
    setPhoto(null)
    setAnalysisResult(null)
  }

  const getMealIcon = (mealType: string) => {
    const meal = mealTypes.find((m) => m.value === mealType)
    return meal?.icon || "🍽️"
  }

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(":")
    const hour = Number.parseInt(hours)
    const ampm = hour >= 12 ? "PM" : "AM"
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

  return (
    <div className="space-y-6">
      {/* Add Food Button */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button className="w-full" size="lg" disabled={user?.isDemo}>
            <Utensils className="w-5 h-5 mr-2" />
            {user?.isDemo ? "Demo Mode - Create account to log food" : "Log Food"}
          </Button>
        </DialogTrigger>

        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Log Your Food</DialogTitle>
            <DialogDescription>Enter your meal details and nutrition information</DialogDescription>
          </DialogHeader>

          <div className="space-y-6">

            {/* Meal Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="mealType">Meal Type *</Label>
                <Select
                  value={currentEntry.mealType}
                  onValueChange={(value) => setCurrentEntry((prev) => ({ ...prev, mealType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select meal type" />
                  </SelectTrigger>
                  <SelectContent>
                    {mealTypes.map((meal) => (
                      <SelectItem key={meal.value} value={meal.value}>
                        <span className="flex items-center space-x-2">
                          <span>{meal.icon}</span>
                          <span>{meal.label}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mealTime">Time</Label>
                <Input
                  id="mealTime"
                  type="time"
                  value={currentEntry.mealTime}
                  onChange={(e) => setCurrentEntry((prev) => ({ ...prev, mealTime: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="foodName">Food Name *</Label>
              <Input
                id="foodName"
                placeholder="e.g., Grilled chicken breast with vegetables"
                value={currentEntry.foodName}
                onChange={(e) => setCurrentEntry((prev) => ({ ...prev, foodName: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Additional details about preparation, ingredients, etc."
                value={currentEntry.description}
                onChange={(e) => setCurrentEntry((prev) => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={currentEntry.quantity}
                  onChange={(e) =>
                    setCurrentEntry((prev) => ({ ...prev, quantity: Number.parseFloat(e.target.value) }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit">Unit</Label>
                <Select
                  value={currentEntry.unit}
                  onValueChange={(value) => setCurrentEntry((prev) => ({ ...prev, unit: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map((unit) => (
                      <SelectItem key={unit} value={unit}>
                        {unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Nutrition Input Section */}
            <div className="space-y-4 border-t pt-4">
              <Label className="text-base font-medium">Nutrition Information</Label>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="calories">Calories</Label>
                  <Input
                    id="calories"
                    type="number"
                    min="0"
                    placeholder="e.g., 250"
                    value={currentEntry.estimatedCalories || ''}
                    onChange={(e) => setCurrentEntry((prev) => ({ 
                      ...prev, 
                      estimatedCalories: e.target.value ? Number.parseInt(e.target.value) : undefined 
                    }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="protein">Protein (g)</Label>
                  <Input
                    id="protein"
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder="e.g., 20"
                    value={currentEntry.macros?.protein || ''}
                    onChange={(e) => setCurrentEntry((prev) => ({ 
                      ...prev, 
                      macros: {
                        ...prev.macros,
                        protein: e.target.value ? Number.parseFloat(e.target.value) : 0,
                        carbs: prev.macros?.carbs || 0,
                        fat: prev.macros?.fat || 0,
                        fiber: prev.macros?.fiber || 0
                      }
                    }))}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="carbs">Carbs (g)</Label>
                  <Input
                    id="carbs"
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder="e.g., 30"
                    value={currentEntry.macros?.carbs || ''}
                    onChange={(e) => setCurrentEntry((prev) => ({ 
                      ...prev, 
                      macros: {
                        ...prev.macros,
                        protein: prev.macros?.protein || 0,
                        carbs: e.target.value ? Number.parseFloat(e.target.value) : 0,
                        fat: prev.macros?.fat || 0,
                        fiber: prev.macros?.fiber || 0
                      }
                    }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="fat">Fat (g)</Label>
                  <Input
                    id="fat"
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder="e.g., 10"
                    value={currentEntry.macros?.fat || ''}
                    onChange={(e) => setCurrentEntry((prev) => ({ 
                      ...prev, 
                      macros: {
                        ...prev.macros,
                        protein: prev.macros?.protein || 0,
                        carbs: prev.macros?.carbs || 0,
                        fat: e.target.value ? Number.parseFloat(e.target.value) : 0,
                        fiber: prev.macros?.fiber || 0
                      }
                    }))}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="fiber">Fiber (g) - Optional</Label>
                <Input
                  id="fiber"
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="e.g., 5"
                  value={currentEntry.macros?.fiber || ''}
                  onChange={(e) => setCurrentEntry((prev) => ({ 
                    ...prev, 
                    macros: {
                      ...prev.macros,
                      protein: prev.macros?.protein || 0,
                      carbs: prev.macros?.carbs || 0,
                      fat: prev.macros?.fat || 0,
                      fiber: e.target.value ? Number.parseFloat(e.target.value) : 0
                    }
                  }))}
                />
              </div>
            </div>

            {/* Optional Photo and AI Analysis Section */}
            <div className="space-y-4 border-t pt-4">
              <Label className="text-base font-medium">Optional: Photo & AI Analysis</Label>
              
              {photo ? (
                <div className="relative">
                  <img src={photo || "/placeholder.svg"} alt="Food" className="w-full h-48 object-cover rounded-lg" />
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => setPhoto(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    variant="outline"
                    className="h-20 flex-col space-y-1 bg-transparent"
                    onClick={() => cameraInputRef.current?.click()}
                  >
                    <Camera className="w-5 h-5" />
                    <span className="text-xs">Take Photo</span>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-20 flex-col space-y-1 bg-transparent"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-5 h-5" />
                    <span className="text-xs">Upload Photo</span>
                  </Button>
                </div>
              )}

              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handlePhotoCapture}
              />

              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoCapture} />
              
              <Button
                onClick={analyzeFood}
                disabled={isAnalyzing || (!currentEntry.foodName && !photo)}
                className="w-full bg-transparent"
                variant="outline"
                size="sm"
              >
                {isAnalyzing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Auto-fill with AI Analysis
                  </>
                )}
              </Button>
            </div>

            {/* Analysis Results */}
            {analysisResult && (
              <Alert>
                <Utensils className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium">Nutritional Analysis:</p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>Calories: ~{analysisResult.calories}</div>
                      <div>Protein: {analysisResult.macros?.protein}g</div>
                      <div>Carbs: {analysisResult.macros?.carbs}g</div>
                      <div>Fat: {analysisResult.macros?.fat}g</div>
                    </div>
                    {analysisResult.healthScore && (
                      <Badge variant={analysisResult.healthScore === "healthy" ? "default" : "secondary"}>
                        {analysisResult.healthScore}
                      </Badge>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-4">
              <Button variant="outline" onClick={resetForm} className="flex-1 bg-transparent">
                Reset
              </Button>
              <Button onClick={saveFoodEntry} className="flex-1">
                Save Food Log
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Recent Food Entries */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Utensils className="w-5 h-5" />
            <span>Today's Food Log</span>
          </CardTitle>
          <CardDescription>Your meals and nutritional intake</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p>Loading food entries...</p>
            </div>
          ) : foodEntries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Utensils className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No food entries yet</p>
              <p className="text-sm">Start logging your meals to track nutrition</p>
            </div>
          ) : (
            <div className="space-y-4">
              {foodEntries.map((entry) => (
                <div key={entry.id} className="flex items-start space-x-4 p-4 border rounded-lg">
                  {entry.photo && (
                    <img
                      src={entry.photo || "/placeholder.svg"}
                      alt="Food"
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                  )}

                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{getMealIcon(entry.mealType)}</span>
                        <h3 className="font-medium">{entry.foodName}</h3>
                        <Badge variant="outline" className="capitalize">
                          {entry.mealType}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span>{formatTime(entry.mealTime)}</span>
                      </div>
                    </div>

                    {entry.description && <p className="text-sm text-muted-foreground">{entry.description}</p>}

                    <div className="flex items-center space-x-4 text-sm">
                      <div className="flex items-center space-x-1">
                        <Scale className="w-4 h-4" />
                        <span>
                          {entry.quantity} {entry.unit}
                        </span>
                      </div>

                      {entry.estimatedCalories && (
                        <div className="flex items-center space-x-1">
                          <Zap className="w-4 h-4" />
                          <span>{entry.estimatedCalories} cal</span>
                        </div>
                      )}

                      {entry.macros && (
                        <div className="flex space-x-3">
                          <span>P: {entry.macros.protein}g</span>
                          <span>C: {entry.macros.carbs}g</span>
                          <span>F: {entry.macros.fat}g</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
