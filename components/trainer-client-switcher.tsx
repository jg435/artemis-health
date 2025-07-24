"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Users, Eye, ArrowLeft, Watch } from "lucide-react"
import { useAuth } from "@/context/auth-context"

interface Client {
  id: string
  trainer_id: string
  client_id: string
  trainer_name: string
  trainer_email: string
  client_name: string
  client_email: string
  granted_at: string
}

export function TrainerClientSwitcher() {
  const { user, currentClient, isViewingAsTrainer, selectedWearable, switchToClient, switchBackToTrainer, selectWearable } = useAuth()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user?.user_type === 'trainer') {
      fetchClients()
    }
  }, [user])

  const fetchClients = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/trainer/clients')
      if (response.ok) {
        const data = await response.json()
        setClients(data.clients || [])
      }
    } catch (error) {
      console.error('Error fetching clients:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleClientSwitch = (clientId: string) => {
    const client = clients.find(c => c.client_id === clientId)
    if (client) {
      switchToClient({
        id: client.client_id,
        email: client.client_email,
        name: client.client_name,
        whoop_connected: false, // We don't have this info, but it's not critical for viewing
        user_type: 'client'
      })
    }
  }

  // Only show for trainers
  if (user?.user_type !== 'trainer') {
    return null
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Client Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isViewingAsTrainer && currentClient ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border">
              <div className="flex items-center space-x-3">
                <Avatar className="w-10 h-10">
                  <AvatarFallback>
                    {currentClient.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">Viewing: {currentClient.name}</p>
                  <p className="text-sm text-muted-foreground">{currentClient.email}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  Read-only mode
                </Badge>
                <Button
                  onClick={switchBackToTrainer}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Trainer View
                </Button>
              </div>
            </div>

            {/* Wearable Selection */}
            <div className="p-4 bg-gray-50 rounded-lg border">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Watch className="w-4 h-4" />
                  <span className="font-medium">Select Wearable Data Source</span>
                </div>
                <Select 
                  value={selectedWearable || ""} 
                  onValueChange={(value: 'whoop' | 'oura' | 'garmin' | 'fitbit') => selectWearable(value)}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Choose wearable" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whoop">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span>Whoop</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="oura">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span>Oura Ring</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="garmin">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span>Garmin</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="fitbit">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-teal-500 rounded-full"></div>
                        <span>Fitbit</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {selectedWearable && (
                <p className="text-sm text-muted-foreground mt-2">
                  Showing data from {selectedWearable.charAt(0).toUpperCase() + selectedWearable.slice(1)} only
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-4">
                <div className="animate-pulse">Loading clients...</div>
              </div>
            ) : clients.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No clients have granted you access yet</p>
                <p className="text-sm">Ask your clients to add your email in their trainer settings</p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Select a client to view their health data:
                </p>
                <Select onValueChange={handleClientSwitch}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a client to view" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.client_id} value={client.client_id}>
                        <div className="flex items-center space-x-2">
                          <Avatar className="w-6 h-6">
                            <AvatarFallback className="text-xs">
                              {client.client_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <span className="font-medium">{client.client_name}</span>
                            <span className="text-muted-foreground ml-2">({client.client_email})</span>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <div className="text-xs text-muted-foreground">
                  You have access to {clients.length} client{clients.length !== 1 ? 's' : ''}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}