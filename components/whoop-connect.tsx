"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/context/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Zap, CheckCircle, AlertCircle } from "lucide-react"

interface WhoopConnectProps {
  onConnect?: () => void
  ouraConnected?: boolean
  garminConnected?: boolean
  fitbitConnected?: boolean
}

export function WhoopConnect({ onConnect, ouraConnected = false, garminConnected = false, fitbitConnected = false }: WhoopConnectProps) {
  const [isConnecting, setIsConnecting] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [isChecking, setIsChecking] = useState(true)
  const [connectionInfo, setConnectionInfo] = useState<{
    connectedAt?: string;
    lastSync?: string;
  }>({})
  const { user, updateUser } = useAuth()

  useEffect(() => {
    checkConnectionStatus()
  }, [user])

  const checkConnectionStatus = async () => {
    try {
      // In demo mode, simulate connection status
      if (user?.isDemo) {
        setIsConnected(true)
        setConnectionInfo({
          connectedAt: new Date().toISOString(),
          lastSync: new Date().toISOString()
        })
        setIsChecking(false)
        return
      }
      
      // Check only Whoop connection status
      const whoopResponse = await fetch('/api/whoop/connection-status')
      
      if (whoopResponse.ok) {
        const whoopData = await whoopResponse.json()
        setIsConnected(whoopData.connected)
        setConnectionInfo({
          connectedAt: whoopData.connectedAt,
          lastSync: whoopData.lastSync
        })
      } else {
        setIsConnected(false)
        setConnectionInfo({})
      }
    } catch (error) {
      console.log('Connection check failed:', error)
      setIsConnected(false)
      setConnectionInfo({})
    } finally {
      setIsChecking(false)
    }
  }

  const handleConnect = async () => {
    // Prevent Whoop connection in demo mode
    if (user?.isDemo) {
      alert('Whoop connection is not available in demo mode. You are already viewing demo data from a connected Whoop device.')
      return
    }
    
    // Prevent connection if another device is already connected
    if (ouraConnected) {
      alert('You already have an Oura Ring connected. Please disconnect your Oura Ring before connecting your Whoop device.')
      return
    }

    if (garminConnected) {
      alert('You already have a Garmin device connected. Please disconnect your Garmin device before connecting your Whoop device.')
      return
    }
    
    setIsConnecting(true)
    try {
      // Redirect to Whoop OAuth
      window.location.href = '/api/auth/whoop'
    } catch (error) {
      console.error('Failed to connect to Whoop:', error)
      setIsConnecting(false)
    }
  }

  if (isChecking) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2">
            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            <span className="text-sm text-muted-foreground">Checking Whoop connection...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  const handleDisconnect = async () => {
    // Prevent disconnection in demo mode
    if (user?.isDemo) {
      alert('Whoop disconnection is not available in demo mode.')
      return
    }
    
    try {
      const response = await fetch('/api/auth/whoop/disconnect', { method: 'POST' })
      if (response.ok) {
        setIsConnected(false)
        setConnectionInfo({})
        // Trigger a refresh of the connection status
        await checkConnectionStatus()
        // Update shared state in parent component
        if (onConnect) onConnect()
      }
    } catch (error) {
      console.error('Failed to disconnect:', error)
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-red-500" />
            Whoop Integration
          </CardTitle>
          <CardDescription>
            {user?.isDemo 
              ? "Demo mode: Viewing sample data from a Whoop device"
              : "Your Whoop device is connected and syncing data"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <Badge variant="outline" className="text-green-700 border-green-300">
                {user?.isDemo ? "Demo Mode" : "Connected"}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={checkConnectionStatus}
                disabled={user?.isDemo}
                className="flex-1"
              >
                Refresh
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleDisconnect}
                disabled={user?.isDemo}
                className="flex-1"
              >
                Disconnect
              </Button>
            </div>
          </div>
          <div className="text-xs text-muted-foreground mt-3 space-y-1">
            <p>Connected: {formatDate(connectionInfo.connectedAt)}</p>
            <p>Last sync: {formatDate(connectionInfo.lastSync)}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const otherDeviceConnected = ouraConnected || garminConnected || fitbitConnected
  const connectedDeviceName = ouraConnected ? 'Oura Ring' : 
                              garminConnected ? 'Garmin device' : 
                              fitbitConnected ? 'Fitbit device' : ''

  return (
    <Card className={otherDeviceConnected ? 'opacity-60' : ''}>
      {otherDeviceConnected ? (
        // Compact layout when another device is connected
        <>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Zap className="h-5 w-5 text-red-500" />
                <CardTitle className="text-lg">
                  Whoop
                </CardTitle>
              </div>
              <Badge variant="outline" className="text-yellow-700 border-yellow-300">
                Not Connected
              </Badge>
            </div>
            <CardDescription>
              {`Disconnect your ${connectedDeviceName} first to connect Whoop`}
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
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-red-500" />
              Connect Whoop
            </CardTitle>
            <CardDescription>
              Sync your recovery, sleep, and workout data from Whoop
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-500" />
              <Badge variant="outline" className="text-yellow-700 border-yellow-300">
                Not Connected
              </Badge>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Connect your Whoop device to get:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Real-time recovery scores</li>
                <li>Detailed sleep analysis</li>
                <li>Workout strain tracking</li>
                <li>Heart rate variability data</li>
              </ul>
            </div>

            <Button 
              onClick={handleConnect} 
              disabled={isConnecting}
              className="w-full"
            >
              {isConnecting ? 'Connecting...' : 'Connect Whoop'}
            </Button>
          </CardContent>
        </>
      )}
    </Card>
  )
}