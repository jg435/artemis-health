"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CheckCircle2, ThumbsUp, ThumbsDown, Calendar, TrendingUp } from "lucide-react"
import { useAuth } from "@/context/auth-context"

interface Recommendation {
  id: string
  category: string
  recommendation_text: string
  priority: "low" | "medium" | "high" | "urgent"
  is_active: boolean
  generated_at: string
  context_data?: any
  user_feedback?: string
  feedback_rating?: number
}

interface HealthRecommendationsPanelProps {
  userId?: string
}

export function HealthRecommendationsPanel({
  userId = "550e8400-e29b-41d4-a716-446655440000",
}: HealthRecommendationsPanelProps) {
  const { user } = useAuth()
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("active")

  useEffect(() => {
    fetchRecommendations()
  }, [userId])

  const fetchRecommendations = async () => {
    try {
      const response = await fetch(`/api/recommendations?userId=${userId}`)
      const data = await response.json()
      setRecommendations(data.recommendations || [])
    } catch (error) {
      console.error("Error fetching recommendations:", error)
    } finally {
      setLoading(false)
    }
  }

  const markAsCompleted = async (recommendationId: string) => {
    try {
      await fetch("/api/recommendations/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recommendationId }),
      })

      setRecommendations((prev) =>
        prev.map((rec) => (rec.id === recommendationId ? { ...rec, is_active: false } : rec)),
      )
    } catch (error) {
      console.error("Error marking recommendation as completed:", error)
    }
  }

  const provideFeedback = async (recommendationId: string, rating: number) => {
    try {
      await fetch("/api/recommendations/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recommendationId, rating }),
      })

      setRecommendations((prev) =>
        prev.map((rec) => (rec.id === recommendationId ? { ...rec, feedback_rating: rating } : rec)),
      )
    } catch (error) {
      console.error("Error providing feedback:", error)
    }
  }

  const generateWeeklySummary = async () => {
    try {
      setLoading(true)
      await fetch("/api/weekly-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user?.id || userId }),
      })

      // Refresh recommendations to show the new summary
      await fetchRecommendations()
    } catch (error) {
      console.error("Error generating weekly summary:", error)
    } finally {
      setLoading(false)
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "nutrition":
        return "🍎"
      case "fitness":
        return "💪"
      case "medical":
        return "🏥"
      case "sleep":
        return "😴"
      case "general":
        return "📊"
      default:
        return "💡"
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "destructive"
      case "high":
        return "destructive"
      case "medium":
        return "default"
      case "low":
        return "secondary"
      default:
        return "outline"
    }
  }

  const activeRecommendations = recommendations.filter((rec) => rec.is_active)
  const completedRecommendations = recommendations.filter((rec) => !rec.is_active)

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5" />
              <span>Health Recommendations</span>
            </CardTitle>
            <CardDescription>AI-generated insights and suggestions</CardDescription>
          </div>
          <Button onClick={generateWeeklySummary} variant="outline" size="sm">
            <Calendar className="w-4 h-4 mr-2" />
            Generate Weekly Summary
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2">
            <TabsTrigger value="active">Active ({activeRecommendations.length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({completedRecommendations.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-4">
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                {activeRecommendations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-500" />
                    <p>All caught up! No active recommendations.</p>
                  </div>
                ) : (
                  activeRecommendations.map((rec) => (
                    <Card key={rec.id} className="border-l-4 border-l-blue-500">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <span className="text-lg">{getCategoryIcon(rec.category)}</span>
                            <Badge variant={getPriorityColor(rec.priority) as any}>{rec.priority}</Badge>
                            <Badge variant="outline" className="capitalize">
                              {rec.category}
                            </Badge>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => markAsCompleted(rec.id)}>
                            <CheckCircle2 className="w-4 h-4" />
                          </Button>
                        </div>

                        <p className="text-sm mb-3 whitespace-pre-wrap">{rec.recommendation_text}</p>

                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {new Date(rec.generated_at).toLocaleDateString()}
                          </span>

                          {!rec.feedback_rating && (
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-muted-foreground">Helpful?</span>
                              <Button variant="ghost" size="sm" onClick={() => provideFeedback(rec.id, 5)}>
                                <ThumbsUp className="w-3 h-3" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => provideFeedback(rec.id, 1)}>
                                <ThumbsDown className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="completed" className="mt-4">
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                {completedRecommendations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No completed recommendations yet.</p>
                  </div>
                ) : (
                  completedRecommendations.map((rec) => (
                    <Card key={rec.id} className="opacity-75">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <span className="text-lg">{getCategoryIcon(rec.category)}</span>
                            <Badge variant="outline" className="capitalize">
                              {rec.category}
                            </Badge>
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          </div>
                        </div>

                        <p className="text-sm mb-3 whitespace-pre-wrap">{rec.recommendation_text}</p>

                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            Completed • {new Date(rec.generated_at).toLocaleDateString()}
                          </span>

                          {rec.feedback_rating && (
                            <div className="flex items-center space-x-1">
                              <span className="text-xs text-muted-foreground">Rating:</span>
                              <div className="flex">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <span
                                    key={star}
                                    className={`text-xs ${
                                      star <= rec.feedback_rating! ? "text-yellow-500" : "text-gray-300"
                                    }`}
                                  >
                                    ⭐
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
