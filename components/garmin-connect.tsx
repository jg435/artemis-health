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
  fitbitConnected?: boolean;
}

export function GarminConnect({ onConnect, whoopConnected, ouraConnected, fitbitConnected }: GarminConnectProps) {
  // Garmin integration is disabled until API credentials are configured
  const isConnected = false
  const isConnecting = false
  const isLoading = false

  const handleConnect = async () => {
    // Garmin integration coming soon
    alert('Garmin integration is coming soon! We\'re working on adding support for Garmin devices.')
  }

  const otherDeviceConnected = whoopConnected || ouraConnected || fitbitConnected
  const connectedDeviceName = whoopConnected ? 'Whoop' : 
                             ouraConnected ? 'Oura Ring' : 
                             fitbitConnected ? 'Fitbit' : ''

  return (
    <Card className={`w-full ${otherDeviceConnected ? 'opacity-60' : 'opacity-60'}`}>
      {otherDeviceConnected ? (
        // Compact layout when another device is connected
        <>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Circle className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-lg">
                  Garmin
                </CardTitle>
              </div>
              <Badge variant="outline" className="text-gray-500 border-gray-300">
                Coming Soon
              </Badge>
            </div>
            <CardDescription>
              Coming soon! Garmin device integration is in development.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleConnect} 
              disabled={true}
              variant="outline"
              size="sm"
              className="w-full"
            >
              Coming Soon
            </Button>
          </CardContent>
        </>
      ) : (
        // Full layout when no other device is connected
        <>
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
        </>
      )}
    </Card>
  )
}