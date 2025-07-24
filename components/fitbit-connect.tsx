"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/context/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Circle, Loader2 } from "lucide-react"

interface FitbitConnectProps {
  onConnect?: () => void;
  whoopConnected?: boolean;
  ouraConnected?: boolean;
  garminConnected?: boolean;
}

export function FitbitConnect({ 
  onConnect, 
  whoopConnected = false, 
  ouraConnected = false,
  garminConnected = false 
}: FitbitConnectProps) {
  const { user } = useAuth()
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const checkConnection = async () => {
    try {
      // Check only Fitbit connection status
      const fitbitResponse = await fetch('/api/fitbit/connection-status')
      const fitbitData = await fitbitResponse.json()
      
      setIsConnected(fitbitData.connected || false)
    } catch (error) {
      console.log('Connection check failed:', error)
      setIsConnected(false)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    checkConnection()
  }, [])

  const handleConnect = async () => {
    // Prevent Fitbit connection in demo mode
    if (user?.isDemo) {
      alert('Fitbit connection is not available in demo mode. You are already viewing demo data from a connected Fitbit device.')
      return
    }

    // Prevent connection if another device is already connected
    if (whoopConnected) {
      alert('You already have a Whoop device connected. Please disconnect your Whoop device before connecting your Fitbit.')
      return
    }

    if (ouraConnected) {
      alert('You already have an Oura Ring connected. Please disconnect your Oura Ring before connecting your Fitbit.')
      return
    }

    if (garminConnected) {
      alert('You already have a Garmin device connected. Please disconnect your Garmin device before connecting your Fitbit.')
      return
    }

    try {
      setIsConnecting(true)
      
      // Get authorization URL from backend
      const response = await fetch(`/api/auth/fitbit?userId=${user?.id}`)
      const data = await response.json()
      
      if (data.authUrl) {
        // Redirect to Fitbit OAuth
        window.location.href = data.authUrl
      } else {
        throw new Error('Failed to get authorization URL')
      }
    } catch (error) {
      console.error('Failed to connect to Fitbit:', error)
      setIsConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    if (user?.isDemo) {
      alert('Fitbit disconnection is not available in demo mode.')
      return
    }

    try {
      setIsConnecting(true)
      const response = await fetch('/api/auth/fitbit/disconnect', { method: 'POST' })
      
      if (response.ok) {
        setIsConnected(false)
        if (onConnect) onConnect()
      }
    } catch (error) {
      console.error('Failed to disconnect Fitbit:', error)
    } finally {
      setIsConnecting(false)
    }
  }

  if (isLoading && !whoopConnected && !ouraConnected && !garminConnected) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-6">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Checking Fitbit connection...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  const otherDeviceConnected = whoopConnected || ouraConnected || garminConnected
  const connectedDeviceName = whoopConnected ? 'Whoop' : 
                             ouraConnected ? 'Oura Ring' : 
                             garminConnected ? 'Garmin' : ''

  if (isConnected) {
    return (
      <Card className="w-full border-green-200 bg-green-50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <CardTitle className="text-lg">
                Fitbit Integration
              </CardTitle>
            </div>
            <Badge variant="outline" className="text-green-600 border-green-200 bg-green-100">
              Connected
            </Badge>
          </div>
          <CardDescription>
            {user?.isDemo 
              ? "Demo mode: Viewing sample data from a Fitbit device"
              : "Your Fitbit device is connected and syncing data"
            }
          </CardDescription>
        </CardHeader>
        {!user?.isDemo && (
          <CardContent>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleDisconnect}
              disabled={isConnecting}
            >
              {isConnecting ? 'Disconnecting...' : 'Disconnect'}
            </Button>
          </CardContent>
        )}
      </Card>
    )
  }

  return (
    <Card className={`w-full ${otherDeviceConnected ? 'opacity-60' : ''}`}>
      {otherDeviceConnected ? (
        // Compact layout when another device is connected
        <>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Circle className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-lg">
                  Fitbit
                </CardTitle>
              </div>
              <Badge variant="outline" className="text-yellow-700 border-yellow-300">
                Not Connected
              </Badge>
            </div>
            <CardDescription>
              {`Disconnect your ${connectedDeviceName} first to connect Fitbit`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleConnect} 
              disabled={isConnecting || otherDeviceConnected}
              variant="outline"
              size="sm"
              className="w-full"
            >
              {`Disconnect ${connectedDeviceName} First`}
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
                Connect Fitbit
              </CardTitle>
            </div>
            <CardDescription>
              Sync your activity, sleep, and heart rate data from Fitbit
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <p className="mb-2">Connect your Fitbit device to get:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Daily activity and steps</li>
                <li>Sleep stages and efficiency</li>
                <li>Heart rate and zones</li>
                <li>Calories burned</li>
                <li>Active minutes tracking</li>
              </ul>
            </div>
            <Button 
              onClick={handleConnect} 
              disabled={isConnecting}
              className="w-full"
            >
              {isConnecting ? 'Connecting...' : 'Connect Fitbit'}
            </Button>
          </CardContent>
        </>
      )}
    </Card>
  )
}