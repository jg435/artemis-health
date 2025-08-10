"use client"
import { useState, useEffect } from "react"
import { useAuth, useApiHeaders, useEffectiveUser } from "@/context/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Heart, CheckCircle2, AlertCircle, X, User, LogOut, Shield } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { RecoveryDashboard } from "@/components/recovery-dashboard"
import { SleepAnalysis } from "@/components/sleep-analysis"
import { WorkoutAnalysis } from "@/components/workout-analysis"
import { MedicalLabResults } from "@/components/medical-lab-results"
import { HealthCoachChat } from "@/components/health-coach-chat"
import { HealthRecommendationsPanel } from "@/components/health-recommendations-panel"
import { NutritionDashboard } from "@/components/nutrition-dashboard"
import { WhoopConnect } from "@/components/whoop-connect"
import { OuraConnect } from "@/components/oura-connect"
import { GarminConnect } from "@/components/garmin-connect"
import { FitbitConnect } from "@/components/fitbit-connect"
import { AuthDialog } from "@/components/auth-dialog"
import { TrainerClientSwitcher } from "@/components/trainer-client-switcher"
import { ClientTrainerManagement } from "@/components/client-trainer-management"
import { FeedbackButton } from "@/components/feedback-button"
import Image from 'next/image'

export default function HealthDashboard() {
  const { user, isLoading, login, logout } = useAuth()
  const effectiveUser = useEffectiveUser()
  const apiHeaders = useApiHeaders()
  const [activeTab, setActiveTab] = useState("recovery")
  const [showAuthDialog, setShowAuthDialog] = useState(false)
  const [showTrainerManagement, setShowTrainerManagement] = useState(false)
  const [connectionStates, setConnectionStates] = useState({
    whoop: false,
    oura: false,
    garmin: false,
    fitbit: false
  })

  const checkAllConnections = async () => {
    try {
      const [whoopResponse, ouraResponse, garminResponse, fitbitResponse] = await Promise.all([
        fetch('/api/whoop/connection-status', { headers: apiHeaders }),
        fetch('/api/oura/connection-status', { headers: apiHeaders }),
        fetch('/api/garmin/connection-status', { headers: apiHeaders }),
        fetch('/api/fitbit/connection-status', { headers: apiHeaders })
      ])
      
      const whoopData = await whoopResponse.json()
      const ouraData = await ouraResponse.json()
      const garminData = await garminResponse.json()
      const fitbitData = await fitbitResponse.json()
      
      setConnectionStates({
        whoop: whoopData.connected || false,
        oura: ouraData.connected || false,
        garmin: garminData.connected || false,
        fitbit: fitbitData.connected || false
      })
    } catch (error) {
      console.log('Connection check failed:', error)
    }
  }

  useEffect(() => {
    if (effectiveUser && !effectiveUser.isDemo) {
      checkAllConnections()
    }
  }, [effectiveUser])

  // Check for OAuth success/failure parameters and refresh connections
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const whoopConnected = urlParams.get('whoop_connected')
    const ouraConnected = urlParams.get('oura_connected')
    const garminConnected = urlParams.get('garmin_connected')
    
    if (whoopConnected || ouraConnected || garminConnected) {
      // Remove the query parameter from URL
      const newUrl = window.location.pathname
      window.history.replaceState({}, '', newUrl)
      
      // Refresh connection states
      if (user && !user.isDemo) {
        checkAllConnections()
      }
    }
  }, [])


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
          <p className="text-xl text-gray-600 mb-6">
            Your comprehensive health tracking dashboard.<br />
            Get AI powered insights by aggregating your fitness, nutrition and medical data in one place.
          </p>
  
          {/* Logo Row */}
          <div className="flex justify-center gap-6 mb-8">
            <Image src="/logos/whoop.svg" alt="Whoop Logo" width={100} height={30} />
            <Image src="/logos/oura.webp" alt="Oura Logo" width={100} height={30} />
            <Image src="/logos/fitbit.png" alt="Oura Logo" width={400} height={30} />
          </div>
  
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
      <FeedbackButton />
      <div className="flex-1 space-y-4 sm:space-y-6 p-4 sm:p-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Artemis</h1>
                <p className="text-muted-foreground text-sm sm:text-base">
                  Welcome back, {user.name}! <br />
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
                  <DropdownMenuContent align="end" className="w-56">
                    {user.user_type === 'client' && (
                      <>
                        <DropdownMenuItem onClick={() => setShowTrainerManagement(!showTrainerManagement)}>
                          <Shield className="h-4 w-4 mr-2" />
                          Trainer Access
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    <DropdownMenuItem onClick={logout} className="text-red-600">
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>


            {/* Trainer/Client Management */}
            <TrainerClientSwitcher />
            {user.user_type === 'client' && showTrainerManagement && <ClientTrainerManagement />}

            {/* Main Content Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-6 h-auto gap-1 p-2">
                <TabsTrigger value="recovery" className="h-10">Recovery</TabsTrigger>
                <TabsTrigger value="sleep" className="h-10">Sleep</TabsTrigger>
                <TabsTrigger value="workouts" className="h-10">Workouts</TabsTrigger>
                <TabsTrigger value="nutrition" className="h-10">🍎 Nutrition</TabsTrigger> {/* ← CLICK HERE */}
                <TabsTrigger value="lab results" className="h-10">Lab Results</TabsTrigger>
                <TabsTrigger value="insights" className="h-10">AI Coach</TabsTrigger>
              </TabsList>

              <TabsContent value="recovery" className="space-y-4">
                <div className="space-y-4">
                  {user?.user_type !== 'trainer' && (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                      <WhoopConnect onConnect={checkAllConnections} ouraConnected={connectionStates.oura} garminConnected={connectionStates.garmin} fitbitConnected={connectionStates.fitbit} />
                      <OuraConnect onConnect={checkAllConnections} whoopConnected={connectionStates.whoop} garminConnected={connectionStates.garmin} fitbitConnected={connectionStates.fitbit} />
                      <FitbitConnect onConnect={checkAllConnections} whoopConnected={connectionStates.whoop} ouraConnected={connectionStates.oura} garminConnected={connectionStates.garmin} />
                      <GarminConnect onConnect={checkAllConnections} whoopConnected={connectionStates.whoop} ouraConnected={connectionStates.oura} fitbitConnected={connectionStates.fitbit} />
                    </div>
                  )}
                  <RecoveryDashboard />
                </div>
              </TabsContent>

              <TabsContent value="sleep" className="space-y-4">
                <div className="space-y-4">
                  {user?.user_type !== 'trainer' && (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                      <WhoopConnect onConnect={checkAllConnections} ouraConnected={connectionStates.oura} garminConnected={connectionStates.garmin} fitbitConnected={connectionStates.fitbit} />
                      <OuraConnect onConnect={checkAllConnections} whoopConnected={connectionStates.whoop} garminConnected={connectionStates.garmin} fitbitConnected={connectionStates.fitbit} />
                      <FitbitConnect onConnect={checkAllConnections} whoopConnected={connectionStates.whoop} ouraConnected={connectionStates.oura} garminConnected={connectionStates.garmin} />
                      <GarminConnect onConnect={checkAllConnections} whoopConnected={connectionStates.whoop} ouraConnected={connectionStates.oura} fitbitConnected={connectionStates.fitbit} />
                    </div>
                  )}
                  <SleepAnalysis />
                </div>
              </TabsContent>

              <TabsContent value="workouts" className="space-y-4">
                <div className="space-y-4">
                  {user?.user_type !== 'trainer' && (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                      <WhoopConnect onConnect={checkAllConnections} ouraConnected={connectionStates.oura} garminConnected={connectionStates.garmin} fitbitConnected={connectionStates.fitbit} />
                      <OuraConnect onConnect={checkAllConnections} whoopConnected={connectionStates.whoop} garminConnected={connectionStates.garmin} fitbitConnected={connectionStates.fitbit} />
                      <FitbitConnect onConnect={checkAllConnections} whoopConnected={connectionStates.whoop} ouraConnected={connectionStates.oura} garminConnected={connectionStates.garmin} />
                      <GarminConnect onConnect={checkAllConnections} whoopConnected={connectionStates.whoop} ouraConnected={connectionStates.oura} fitbitConnected={connectionStates.fitbit} />
                    </div>
                  )}
                  <WorkoutAnalysis />
                </div>
              </TabsContent>

              <TabsContent value="nutrition" className="space-y-4">
                {/* ← THE FOOD PHOTO ANALYZER IS HERE */}
                <NutritionDashboard />
              </TabsContent>

              <TabsContent value="lab results" className="space-y-4">
                <MedicalLabResults />
              </TabsContent>

              <TabsContent value="insights" className="space-y-4">
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="space-y-4">
                    <HealthRecommendationsPanel />
                  </div>
                  <div>
                    <HealthCoachChat onNavigateToTab={setActiveTab} />
                  </div>
                </div>
              </TabsContent>

            </Tabs>
      </div>
    </div>
  )
}
