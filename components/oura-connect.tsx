"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/context/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Circle, Loader2 } from "lucide-react"

interface OuraConnectProps {
  onConnect?: () => void;
  whoopConnected?: boolean;
  garminConnected?: boolean;
}

export function OuraConnect({ onConnect, whoopConnected = false, garminConnected = false }: OuraConnectProps) {
  const { user } = useAuth()
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const checkConnection = async () => {
    try {
      // Check only Oura connection status
      const ouraResponse = await fetch('/api/oura/connection-status')
      const ouraData = await ouraResponse.json()
      
      setIsConnected(ouraData.connected || false)
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
    // Prevent Oura connection in demo mode
    if (user?.isDemo) {
      alert('Oura connection is not available in demo mode. You are already viewing demo data from a connected Oura device.')
      return
    }

    // Prevent connection if another device is already connected
    if (whoopConnected) {
      alert('You already have a Whoop device connected. Please disconnect your Whoop device before connecting your Oura Ring.')
      return
    }

    if (garminConnected) {
      alert('You already have a Garmin device connected. Please disconnect your Garmin device before connecting your Oura Ring.')
      return
    }

    try {
      setIsConnecting(true)
      // Redirect to Oura OAuth
      window.location.href = '/api/auth/oura'
    } catch (error) {
      console.error('Failed to connect to Oura:', error)
      setIsConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    if (user?.isDemo) {
      alert('Oura disconnection is not available in demo mode.')
      return
    }

    try {
      setIsConnecting(true)
      const response = await fetch('/api/auth/oura/disconnect', { method: 'POST' })
      
      if (response.ok) {
        setIsConnected(false)
        if (onConnect) onConnect()
      }
    } catch (error) {
      console.error('Failed to disconnect Oura:', error)
    } finally {
      setIsConnecting(false)
    }
  }

  if (isLoading && !whoopConnected && !garminConnected) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-6">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Checking Oura connection...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  const otherDeviceConnected = whoopConnected || garminConnected
  const connectedDeviceName = whoopConnected ? 'Whoop' : garminConnected ? 'Garmin' : ''

  if (isConnected) {
    return (
      <Card className="w-full border-green-200 bg-green-50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <CardTitle className="text-lg">
                Oura Integration
              </CardTitle>
            </div>
            <Badge variant="outline" className="text-green-600 border-green-200 bg-green-100">
              Connected
            </Badge>
          </div>
          <CardDescription>
            {user?.isDemo 
              ? "Demo mode: Viewing sample data from an Oura Ring"
              : "Your Oura Ring is connected and syncing data"
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
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Circle className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-lg">
            Connect Oura
          </CardTitle>
        </div>
        <CardDescription>
          {otherDeviceConnected 
            ? `Disconnect your ${connectedDeviceName} device first to connect Oura Ring`
            : "Sync your sleep, readiness, and activity data from Oura Ring"
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {otherDeviceConnected && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              Only one wearable device can be connected at a time. Please disconnect your {connectedDeviceName} device to connect your Oura Ring.
            </p>
          </div>
        )}
        <div className="text-sm text-muted-foreground">
          <p className="mb-2">Connect your Oura Ring to get:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Sleep quality and stages</li>
            <li>Readiness and recovery scores</li>
            <li>Daily activity and movement</li>
            <li>Heart rate variability</li>
            <li>Body temperature trends</li>
          </ul>
        </div>
        <Button 
          onClick={handleConnect} 
          disabled={isConnecting || otherDeviceConnected}
          className="w-full"
        >
          {isConnecting ? 'Connecting...' : otherDeviceConnected ? `Disconnect ${connectedDeviceName} First` : 'Connect Oura'}
        </Button>
      </CardContent>
    </Card>
  )
}