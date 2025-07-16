"use client"

import type React from "react"

import { useState, useRef } from "react"
import { useAuth } from "@/context/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Camera, Upload, X, Clock, Utensils, Zap, Bot, Loader2, CheckCircle2, AlertTriangle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface FoodMetadata {
  mealType: string
  mealTime: string
  location: string
  socialContext: string
  hungerLevel: number
  moodBefore: string
  moodAfter: string
  portionSize: string
  preparationMethod: string
  notes: string
}

interface AnalysisResponse {
  nutritionalAnalysis: {
    calories: number
    macros: {
      protein: number
      carbs: number
      fat: number
      fiber: number
    }
    micronutrients: any
  }
  healthAssessment: {
    score: number
    category: string
    concerns: string[]
    positives: string[]
  }
  personalizedRecommendations: string[]
  mealTimingAdvice: string
  portionFeedback: string
  improvementSuggestions: string[]
  contextualInsights: string[]
}

export function FoodPhotoAnalyzer() {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [photo, setPhoto] = useState<string | null>(null)
  const [metadata, setMetadata] = useState<FoodMetadata>({
    mealType: "",
    mealTime: new Date().toTimeString().slice(0, 5),
    location: "",
    socialContext: "alone",
    hungerLevel: 5,
    moodBefore: "",
    moodAfter: "",
    portionSize: "normal",
    preparationMethod: "",
    notes: "",
  })
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null)
  const [coachResponse, setCoachResponse] = useState<string>("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const mealTypes = [
    { value: "breakfast", label: "Breakfast", icon: "🌅" },
    { value: "lunch", label: "Lunch", icon: "☀️" },
    { value: "dinner", label: "Dinner", icon: "🌙" },
    { value: "snack", label: "Snack", icon: "🍎" },
    { value: "pre-workout", label: "Pre-Workout", icon: "💪" },
    { value: "post-workout", label: "Post-Workout", icon: "🏃" },
  ]

  const socialContexts = [
    { value: "alone", label: "Eating Alone" },
    { value: "family", label: "With Family" },
    { value: "friends", label: "With Friends" },
    { value: "colleagues", label: "With Colleagues" },
    { value: "date", label: "On a Date" },
    { value: "business", label: "Business Meal" },
  ]

  const portionSizes = [
    { value: "very-small", label: "Very Small" },
    { value: "small", label: "Small" },
    { value: "normal", label: "Normal" },
    { value: "large", label: "Large" },
    { value: "very-large", label: "Very Large" },
  ]

  const moods = [
    "Happy",
    "Stressed",
    "Tired",
    "Excited",
    "Anxious",
    "Relaxed",
    "Rushed",
    "Satisfied",
    "Bored",
    "Energetic",
    "Sad",
    "Content",
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

  const analyzeWithHealthCoach = async () => {
    if (!photo) {
      alert("Please upload a photo first")
      return
    }

    setIsAnalyzing(true)
    try {
      const response = await fetch("/api/analyze-food-with-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photo: photo,
          metadata: metadata,
          userId: user?.id,
        }),
      })

      const result = await response.json()

      if (result.error) {
        throw new Error(result.error)
      }

      setAnalysisResult(result.analysis)
      setCoachResponse(result.coachResponse)

      // Save the food entry to database
      await saveFoodEntry(result.analysis)
    } catch (error) {
      console.error("Error analyzing food:", error)
      alert("Failed to analyze food. Please try again.")
    } finally {
      setIsAnalyzing(false)
    }
  }

  const saveFoodEntry = async (analysis: AnalysisResponse) => {
    try {
      const foodEntry = {
        photo: photo,
        metadata: metadata,
        analysis: analysis,
        timestamp: new Date().toISOString(),
        userId: user?.id,
      }

      await fetch("/api/food-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(foodEntry),
      })
    } catch (error) {
      console.error("Error saving food entry:", error)
    }
  }

  const resetForm = () => {
    setPhoto(null)
    setMetadata({
      mealType: "",
      mealTime: new Date().toTimeString().slice(0, 5),
      location: "",
      socialContext: "alone",
      hungerLevel: 5,
      moodBefore: "",
      moodAfter: "",
      portionSize: "normal",
      preparationMethod: "",
      notes: "",
    })
    setAnalysisResult(null)
    setCoachResponse("")
  }

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600"
    if (score >= 60) return "text-yellow-600"
    return "text-red-600"
  }

  const getHealthScoreBadge = (category?: string) => {
    const safeCategory = category?.toLowerCase?.() || "";
  
    switch (safeCategory) {
      case "excellent":
        return "default";
      case "good":
        return "success";
      case "fair":
        return "warning";
      case "poor":
        return "destructive";
      default:
        return "secondary";
    }
  };
  

  return (
    <div className="space-y-6">
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button className="w-full" size="lg">
            <Camera className="w-5 h-5 mr-2" />
            Analyze Food Photo with AI Coach
          </Button>
        </DialogTrigger>

        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Food Photo Analysis</DialogTitle>
            <DialogDescription>
              Upload your food photo with context for personalized health coaching insights
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Photo & Basic Info */}
            <div className="space-y-6">
              {/* Photo Upload Section */}
              <div className="space-y-4">
                <Label className="text-base font-medium">Food Photo *</Label>

                {photo ? (
                  <div className="relative">
                    <img
                      src={photo || "/placeholder.svg"}
                      alt="Food"
                      className="w-full h-64 object-cover rounded-lg border"
                    />
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
                      className="h-32 flex-col space-y-2 bg-transparent"
                      onClick={() => cameraInputRef.current?.click()}
                    >
                      <Camera className="w-8 h-8" />
                      <span className="text-sm">Take Photo</span>
                    </Button>

                    <Button
                      variant="outline"
                      className="h-32 flex-col space-y-2 bg-transparent"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="w-8 h-8" />
                      <span className="text-sm">Upload Photo</span>
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

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoCapture}
                />
              </div>

              {/* Basic Meal Info */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="mealType">Meal Type *</Label>
                    <Select
                      value={metadata.mealType}
                      onValueChange={(value) => setMetadata((prev) => ({ ...prev, mealType: value }))}
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
                      value={metadata.mealTime}
                      onChange={(e) => setMetadata((prev) => ({ ...prev, mealTime: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location (Optional)</Label>
                  <Input
                    id="location"
                    placeholder="e.g., Home, Restaurant, Office"
                    value={metadata.location}
                    onChange={(e) => setMetadata((prev) => ({ ...prev, location: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            {/* Right Column - Detailed Metadata */}
            <div className="space-y-6">
              {/* Social & Emotional Context */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Context & Mood</h3>

                <div className="space-y-2">
                  <Label>Social Context</Label>
                  <Select
                    value={metadata.socialContext}
                    onValueChange={(value) => setMetadata((prev) => ({ ...prev, socialContext: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {socialContexts.map((context) => (
                        <SelectItem key={context.value} value={context.value}>
                          {context.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Hunger Level (1-10)</Label>
                  <Input
                    type="range"
                    min="1"
                    max="10"
                    value={metadata.hungerLevel}
                    onChange={(e) => setMetadata((prev) => ({ ...prev, hungerLevel: Number.parseInt(e.target.value) }))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Not Hungry</span>
                    <span className="font-medium">{metadata.hungerLevel}</span>
                    <span>Very Hungry</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Mood Before</Label>
                    <Select
                      value={metadata.moodBefore}
                      onValueChange={(value) => setMetadata((prev) => ({ ...prev, moodBefore: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select mood" />
                      </SelectTrigger>
                      <SelectContent>
                        {moods.map((mood) => (
                          <SelectItem key={mood} value={mood.toLowerCase()}>
                            {mood}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Mood After</Label>
                    <Select
                      value={metadata.moodAfter}
                      onValueChange={(value) => setMetadata((prev) => ({ ...prev, moodAfter: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select mood" />
                      </SelectTrigger>
                      <SelectContent>
                        {moods.map((mood) => (
                          <SelectItem key={mood} value={mood.toLowerCase()}>
                            {mood}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Food Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Food Details</h3>

                <div className="space-y-2">
                  <Label>Portion Size</Label>
                  <Select
                    value={metadata.portionSize}
                    onValueChange={(value) => setMetadata((prev) => ({ ...prev, portionSize: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {portionSizes.map((size) => (
                        <SelectItem key={size.value} value={size.value}>
                          {size.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Preparation Method</Label>
                  <Input
                    placeholder="e.g., Grilled, Fried, Steamed, Raw"
                    value={metadata.preparationMethod}
                    onChange={(e) => setMetadata((prev) => ({ ...prev, preparationMethod: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Additional Notes</Label>
                  <Textarea
                    placeholder="Any additional context about the meal, ingredients, or how you're feeling..."
                    value={metadata.notes}
                    onChange={(e) => setMetadata((prev) => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Analysis Button */}
          <div className="flex space-x-4 pt-4 border-t">
            <Button
              onClick={analyzeWithHealthCoach}
              disabled={isAnalyzing || !photo || !metadata.mealType}
              className="flex-1"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing with AI Coach...
                </>
              ) : (
                <>
                  <Bot className="w-4 h-4 mr-2" />
                  Analyze with Health Coach
                </>
              )}
            </Button>

            <Button variant="outline" onClick={resetForm} className="bg-transparent">
              Reset
            </Button>
          </div>

          {/* Analysis Results */}
          {analysisResult && (
            <div className="space-y-6 pt-6 border-t">
              <div className="grid gap-4 md:grid-cols-2">
                {/* Nutritional Analysis */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Utensils className="w-5 h-5" />
                      <span>Nutritional Analysis</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-medium">Calories</p>
                        <p className="text-2xl font-bold">{analysisResult.nutritionalAnalysis?.calories || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="font-medium">Protein</p>
                        <p className="text-xl font-semibold">{analysisResult.nutritionalAnalysis?.macros?.protein || 'N/A'}g</p>
                      </div>
                      <div>
                        <p className="font-medium">Carbs</p>
                        <p className="text-xl font-semibold">{analysisResult.nutritionalAnalysis?.macros?.carbs || 'N/A'}g</p>
                      </div>
                      <div>
                        <p className="font-medium">Fat</p>
                        <p className="text-xl font-semibold">{analysisResult.nutritionalAnalysis?.macros?.fat || 'N/A'}g</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Health Assessment */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Zap className="w-5 h-5" />
                      <span>Health Assessment</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Health Score</span>
                      <div className="flex items-center space-x-2">
                        <span
                          className={`text-2xl font-bold ${getHealthScoreColor(analysisResult.healthAssessment?.score || 0)}`}
                        >
                          {analysisResult.healthAssessment?.score || 'N/A'}
                        </span>
                        <Badge variant={getHealthScoreBadge(analysisResult.healthAssessment?.category) as any}>
                          {analysisResult.healthAssessment?.category || 'Unknown'}
                        </Badge>
                      </div>
                    </div>

                    {analysisResult.healthAssessment?.concerns && analysisResult.healthAssessment.concerns.length > 0 && (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <div className="space-y-1">
                            <p className="font-medium">Areas of Concern:</p>
                            <ul className="text-sm list-disc list-inside">
                              {analysisResult.healthAssessment?.concerns?.map((concern, index) => (
                                <li key={index}>{concern}</li>
                              ))}
                            </ul>
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}

                    {analysisResult.healthAssessment?.positives && analysisResult.healthAssessment.positives.length > 0 && (
                      <Alert>
                        <CheckCircle2 className="h-4 w-4" />
                        <AlertDescription>
                          <div className="space-y-1">
                            <p className="font-medium">Positive Aspects:</p>
                            <ul className="text-sm list-disc list-inside">
                              {analysisResult.healthAssessment?.positives?.map((positive, index) => (
                                <li key={index}>{positive}</li>
                              ))}
                            </ul>
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* AI Coach Response */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Bot className="w-5 h-5" />
                    <span>AI Health Coach Response</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    <div className="prose prose-sm max-w-none">
                      <p className="whitespace-pre-wrap">{coachResponse}</p>
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Recommendations */}
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Personalized Recommendations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {analysisResult.personalizedRecommendations?.map((rec, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Improvement Suggestions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {analysisResult.improvementSuggestions?.map((suggestion, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <Zap className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>

              {/* Contextual Insights */}
              {analysisResult.contextualInsights && analysisResult.contextualInsights.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Contextual Insights</CardTitle>
                    <CardDescription>Based on your meal timing, mood, and social context</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {analysisResult.contextualInsights?.map((insight, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <Clock className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{insight}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-4">
                <Button onClick={() => setIsOpen(false)} className="flex-1">
                  Save Analysis
                </Button>
                <Button variant="outline" onClick={resetForm} className="bg-transparent">
                  Analyze Another Photo
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
