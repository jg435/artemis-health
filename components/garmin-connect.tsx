"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/context/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Circle, Loader2 } from "lucide-react"

interface GarminConnectProps {
  onConnect?: () => void;
  whoopConnected?: boolean;
  ouraConnected?: boolean;
}

export function GarminConnect({ onConnect, whoopConnected, ouraConnected }: GarminConnectProps) {
  // Garmin integration is disabled until API credentials are configured
  const isConnected = false
  const isConnecting = false
  const isLoading = false

  const handleConnect = async () => {
    // Garmin integration coming soon
    alert('Garmin integration is coming soon! We\'re working on adding support for Garmin devices.')
  }

  return (
    <Card className="w-full opacity-60">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Circle className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-lg">
            Garmin Integration
          </CardTitle>
        </div>
        <CardDescription>
          Coming soon! Garmin device integration is currently in development.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-800">
            🚀 We're working on adding Garmin device support. This will include activity tracking, sleep analysis, Body Battery, and wellness metrics.
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          <p className="mb-2">Planned Garmin features:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Activity and workout tracking</li>
            <li>Sleep analysis and recovery</li>
            <li>Body Battery and stress levels</li>
            <li>Heart rate and wellness metrics</li>
            <li>Steps and daily movement</li>
          </ul>
        </div>
        <Button 
          onClick={handleConnect} 
          disabled={true}
          className="w-full"
        >
          Coming Soon
        </Button>
      </CardContent>
    </Card>
  )
}