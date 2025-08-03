"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Camera, Clock, MapPin, Users, Zap, Eye } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useAuth, useEffectiveUser, useApiHeaders } from "@/context/auth-context"

interface FoodEntry {
  id: string
  meal_type: string
  food_name: string
  calories: number
  logged_at: string
  photo_url?: string
  metadata?: string
}

export function RecentFoodAnalyses() {
  const { user } = useAuth()
  const effectiveUser = useEffectiveUser()
  const apiHeaders = useApiHeaders()
  const [foodEntries, setFoodEntries] = useState<FoodEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEntry, setSelectedEntry] = useState<FoodEntry | null>(null)
  const [demoEntries, setDemoEntries] = useState<FoodEntry[]>([])

  useEffect(() => {
    if (effectiveUser) {
      fetchFoodEntries()
    }
    
    // Listen for demo food entries
    const handleDemoFoodAdded = (event: CustomEvent) => {
      try {
        if (effectiveUser?.isDemo && event.detail) {
          const newEntry = event.detail
          setDemoEntries(prev => [newEntry, ...prev])
          setFoodEntries(prev => [newEntry, ...prev])
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

  const fetchFoodEntries = async () => {
    try {
      // In demo mode, show demo entries that were logged during session
      if (effectiveUser?.isDemo) {
        setFoodEntries(demoEntries)
        setLoading(false)
        return
      }
      
      const response = await fetch(`/api/food-entries?limit=10&userId=${effectiveUser?.id}`, {
        headers: apiHeaders
      })
      const data = await response.json()
      setFoodEntries(data.foodEntries || [])
    } catch (error) {
      console.error("Error fetching food entries:", error)
    } finally {
      setLoading(false)
    }
  }

  const getMealIcon = (mealType: string) => {
    switch (mealType) {
      case "breakfast":
        return "🌅"
      case "lunch":
        return "☀️"
      case "dinner":
        return "🌙"
      case "snack":
        return "🍎"
      case "pre-workout":
        return "💪"
      case "post-workout":
        return "🏃"
      default:
        return "🍽️"
    }
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600"
    if (score >= 60) return "text-yellow-600"
    return "text-red-600"
  }

  const parseMetadata = (metadataString?: string) => {
    try {
      return metadataString ? JSON.parse(metadataString) : {}
    } catch {
      return {}
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-muted rounded-lg"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Camera className="w-5 h-5" />
          <span>Recent Food Analyses</span>
        </CardTitle>
        <CardDescription>Your AI-analyzed meals with health insights</CardDescription>
      </CardHeader>
      <CardContent>
        {foodEntries.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Camera className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No food analyses yet</p>
            <p className="text-sm">Upload food photos to get AI health insights</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-4">
              {foodEntries.map((entry) => {
                const metadata = parseMetadata(entry.metadata)
                return (
                  <div
                    key={entry.id}
                    className="flex items-start space-x-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-shrink-0">
                      {entry.photo_url ? (
                        <img
                          src={entry.photo_url || "/placeholder.svg"}
                          alt="Food"
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                          <span className="text-2xl">{getMealIcon(entry.meal_type)}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium capitalize">{entry.meal_type}</h3>
                          <Badge variant="outline">{entry.calories} cal</Badge>
                          {metadata.healthScore && (
                            <Badge
                              variant={
                                metadata.healthScore >= 80
                                  ? "default"
                                  : metadata.healthScore >= 60
                                    ? "secondary"
                                    : "destructive"
                              }
                            >
                              Score: {metadata.healthScore}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          <span>{formatTime(entry.logged_at)}</span>
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground">{entry.food_name}</p>

                      {metadata.location && (
                        <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                          <MapPin className="w-3 h-3" />
                          <span>{metadata.location}</span>
                        </div>
                      )}

                      {metadata.socialContext && metadata.socialContext !== "alone" && (
                        <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                          <Users className="w-3 h-3" />
                          <span className="capitalize">{metadata.socialContext.replace("-", " ")}</span>
                        </div>
                      )}

                      {metadata.recommendations && metadata.recommendations.length > 0 && (
                        <div className="text-xs text-blue-600">💡 {metadata.recommendations[0]}</div>
                      )}
                    </div>

                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedEntry(entry)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle className="flex items-center space-x-2">
                            <span className="text-2xl">{getMealIcon(entry.meal_type)}</span>
                            <span className="capitalize">{entry.meal_type} Analysis</span>
                          </DialogTitle>
                          <DialogDescription>{formatTime(entry.logged_at)}</DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4">
                          {entry.photo_url && (
                            <img
                              src={entry.photo_url || "/placeholder.svg"}
                              alt="Food"
                              className="w-full h-48 object-cover rounded-lg"
                            />
                          )}

                          <div className="grid grid-cols-2 gap-4">
                            <Card>
                              <CardHeader className="pb-2">
                                <CardTitle className="text-sm">Nutrition</CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-2">
                                <div className="flex justify-between">
                                  <span className="text-sm">Calories</span>
                                  <span className="font-medium">{entry.calories}</span>
                                </div>
                                {metadata.healthScore && (
                                  <div className="flex justify-between">
                                    <span className="text-sm">Health Score</span>
                                    <span className={`font-medium ${getHealthScoreColor(metadata.healthScore)}`}>
                                      {metadata.healthScore}/100
                                    </span>
                                  </div>
                                )}
                              </CardContent>
                            </Card>

                            <Card>
                              <CardHeader className="pb-2">
                                <CardTitle className="text-sm">Context</CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-2">
                                {metadata.location && (
                                  <div className="flex justify-between text-sm">
                                    <span>Location</span>
                                    <span>{metadata.location}</span>
                                  </div>
                                )}
                                {metadata.hungerLevel && (
                                  <div className="flex justify-between text-sm">
                                    <span>Hunger Level</span>
                                    <span>{metadata.hungerLevel}/10</span>
                                  </div>
                                )}
                                {metadata.moodBefore && (
                                  <div className="flex justify-between text-sm">
                                    <span>Mood</span>
                                    <span className="capitalize">{metadata.moodBefore}</span>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          </div>

                          {metadata.recommendations && metadata.recommendations.length > 0 && (
                            <Card>
                              <CardHeader className="pb-2">
                                <CardTitle className="text-sm">AI Recommendations</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <ul className="space-y-1">
                                  {metadata.recommendations.slice(0, 3).map((rec: string, index: number) => (
                                    <li key={index} className="text-sm flex items-start space-x-2">
                                      <Zap className="w-3 h-3 text-blue-500 mt-0.5 flex-shrink-0" />
                                      <span>{rec}</span>
                                    </li>
                                  ))}
                                </ul>
                              </CardContent>
                            </Card>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
