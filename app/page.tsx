"use client"
import { useState, useEffect } from "react"
import { useAuth } from "@/context/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Heart, CheckCircle2, AlertCircle, X, User, LogOut } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { RecoveryDashboard } from "@/components/recovery-dashboard"
import { SleepAnalysis } from "@/components/sleep-analysis"
import { WorkoutAnalysis } from "@/components/workout-analysis"
import { MedicalLabResults } from "@/components/medical-lab-results"
import { HealthCoachChat } from "@/components/health-coach-chat"
import { HealthRecommendationsPanel } from "@/components/health-recommendations-panel"
import { NutritionDashboard } from "@/components/nutrition-dashboard"
import { WhoopConnect } from "@/components/whoop-connect"
import { AuthDialog } from "@/components/auth-dialog"

export default function HealthDashboard() {
  const { user, isLoading, login, logout } = useAuth()
  const [activeTab, setActiveTab] = useState("recovery")
  const [showAuthDialog, setShowAuthDialog] = useState(false)


  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Show auth dialog if user is not authenticated
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center p-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Welcome to Artemis</h1>
          <p className="text-xl text-gray-600 mb-8">Your comprehensive health tracking dashboard.<br />Aggregate all your medical data in one place to drive ai powered insights</p>
          <Button onClick={() => setShowAuthDialog(true)} size="lg">
            Get Started
          </Button>
          <AuthDialog 
            open={showAuthDialog} 
            onOpenChange={setShowAuthDialog}
            onSuccess={async (userData) => {
              await login(userData)
              setShowAuthDialog(false)
            }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full">
      <div className="flex-1 space-y-4 sm:space-y-6 p-4 sm:p-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Artemis</h1>
                <p className="text-muted-foreground text-sm sm:text-base">
                  Welcome back, {user.name}! Your comprehensive health tracking dashboard.<br />Aggregate all your medical data in one place to drive ai powered insights
                </p>
              </div>
              <div className="flex items-center space-x-2 sm:space-x-4">
                <Badge variant="outline" className="text-green-600 border-green-200">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Synced
                </Badge>
                
                {/* User Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {user.name}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={logout} className="text-red-600">
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>


            {/* Main Content Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-6 h-auto gap-1 p-2">
                <TabsTrigger value="recovery" className="h-10">Recovery</TabsTrigger>
                <TabsTrigger value="sleep" className="h-10">Sleep</TabsTrigger>
                <TabsTrigger value="workouts" className="h-10">Workouts</TabsTrigger>
                <TabsTrigger value="nutrition" className="h-10">🍎 Nutrition</TabsTrigger> {/* ← CLICK HERE */}
                <TabsTrigger value="medical" className="h-10">Medical</TabsTrigger>
                <TabsTrigger value="insights" className="h-10">AI Coach</TabsTrigger>
              </TabsList>

              <TabsContent value="recovery" className="space-y-4">
                <div className="space-y-4">
                  <WhoopConnect />
                  <RecoveryDashboard />
                </div>
              </TabsContent>

              <TabsContent value="sleep" className="space-y-4">
                <div className="space-y-4">
                  <WhoopConnect />
                  <SleepAnalysis />
                </div>
              </TabsContent>

              <TabsContent value="workouts" className="space-y-4">
                <div className="space-y-4">
                  <WhoopConnect />
                  <WorkoutAnalysis />
                </div>
              </TabsContent>

              <TabsContent value="nutrition" className="space-y-4">
                {/* ← THE FOOD PHOTO ANALYZER IS HERE */}
                <NutritionDashboard />
              </TabsContent>

              <TabsContent value="medical" className="space-y-4">
                <MedicalLabResults />
              </TabsContent>

              <TabsContent value="insights" className="space-y-4">
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="space-y-4">
                    <HealthRecommendationsPanel />
                  </div>
                  <div>
                    <HealthCoachChat />
                  </div>
                </div>
              </TabsContent>

            </Tabs>
      </div>
    </div>
  )
}
