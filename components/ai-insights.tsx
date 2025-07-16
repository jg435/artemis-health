"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Brain, TrendingUp, AlertTriangle, CheckCircle2, Target, Lightbulb, Calendar, Activity } from "lucide-react"

const insights = [
  {
    type: "nutrition",
    title: "Protein Intake Optimization",
    description:
      "Your protein intake has been 15% below target this week. Consider adding lean proteins to your meals.",
    recommendation: "Add Greek yogurt to breakfast or include a protein shake post-workout.",
    priority: "medium",
    icon: Target,
    trend: "down",
  },
  {
    type: "fitness",
    title: "Sleep-Exercise Correlation",
    description: "Your workout performance improves by 23% when you get 8+ hours of sleep.",
    recommendation: "Prioritize 8 hours of sleep before intense training days.",
    priority: "high",
    icon: Activity,
    trend: "up",
  },
  {
    type: "medical",
    title: "Heart Rate Variability",
    description: "Your resting heart rate has decreased by 5 bpm over the past month - excellent progress!",
    recommendation: "Continue your current cardio routine to maintain this improvement.",
    priority: "low",
    icon: CheckCircle2,
    trend: "up",
  },
  {
    type: "wellness",
    title: "Hydration Pattern",
    description: "You tend to drink less water on weekends. This affects your Monday workout performance.",
    recommendation: "Set weekend hydration reminders to maintain consistent intake.",
    priority: "medium",
    icon: AlertTriangle,
    trend: "down",
  },
]

const weeklyGoals = [
  { goal: "Increase daily protein to 120g", progress: 75, status: "on-track" },
  { goal: "Complete 4 strength training sessions", progress: 50, status: "behind" },
  { goal: "Average 8 hours of sleep", progress: 85, status: "ahead" },
  { goal: "Drink 8 glasses of water daily", progress: 60, status: "on-track" },
]

export function AIInsights() {
  return (
    <div className="space-y-6">
      {/* AI Insights Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Brain className="w-5 h-5 text-purple-600" />
            <CardTitle>AI-Powered Health Insights</CardTitle>
          </div>
          <CardDescription>Personalized recommendations based on your health data patterns</CardDescription>
        </CardHeader>
      </Card>

      {/* Insights Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {insights.map((insight, index) => (
          <Card key={index} className="relative">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  <insight.icon
                    className={`w-5 h-5 ${
                      insight.priority === "high"
                        ? "text-red-500"
                        : insight.priority === "medium"
                          ? "text-yellow-500"
                          : "text-green-500"
                    }`}
                  />
                  <CardTitle className="text-lg">{insight.title}</CardTitle>
                </div>
                <Badge
                  variant={
                    insight.priority === "high"
                      ? "destructive"
                      : insight.priority === "medium"
                        ? "default"
                        : "secondary"
                  }
                >
                  {insight.priority}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{insight.description}</p>
              <div className="bg-muted/50 p-3 rounded-lg">
                <div className="flex items-start space-x-2">
                  <Lightbulb className="w-4 h-4 text-yellow-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Recommendation</p>
                    <p className="text-sm text-muted-foreground">{insight.recommendation}</p>
                  </div>
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full bg-transparent">
                View Details
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Weekly Goals Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="w-5 h-5" />
            <span>Weekly Goals Progress</span>
          </CardTitle>
          <CardDescription>Track your progress towards this week's health objectives</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {weeklyGoals.map((goal, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{goal.goal}</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">{goal.progress}%</span>
                  <Badge
                    variant={
                      goal.status === "ahead" ? "default" : goal.status === "on-track" ? "secondary" : "destructive"
                    }
                    size="sm"
                  >
                    {goal.status}
                  </Badge>
                </div>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    goal.status === "ahead" ? "bg-green-500" : goal.status === "on-track" ? "bg-blue-500" : "bg-red-500"
                  }`}
                  style={{ width: `${goal.progress}%` }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Health Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5" />
            <span>Weekly Health Summary</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
              <div>
                <p className="font-medium text-green-800">Overall Health Score</p>
                <p className="text-sm text-green-600">Excellent progress this week!</p>
              </div>
              <div className="text-2xl font-bold text-green-700">8.5/10</div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">6</p>
                <p className="text-sm text-muted-foreground">Days Active</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold text-purple-600">3</p>
                <p className="text-sm text-muted-foreground">Goals Achieved</p>
              </div>
            </div>

            <Button className="w-full">
              <Calendar className="w-4 h-4 mr-2" />
              Schedule Health Check-in
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
