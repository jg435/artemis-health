"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { UserPlus, Trash2, Shield, CheckCircle, AlertTriangle } from "lucide-react"
import { useAuth } from "@/context/auth-context"

interface Trainer {
  id: string
  trainer_id: string
  client_id: string
  trainer_name: string
  trainer_email: string
  client_name: string
  client_email: string
  granted_at: string
}

export function ClientTrainerManagement() {
  const { user } = useAuth()
  const [trainers, setTrainers] = useState<Trainer[]>([])
  const [trainerEmail, setTrainerEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    if (user?.user_type === 'client') {
      fetchTrainers()
    }
  }, [user])

  const fetchTrainers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/client/grant-trainer-access')
      if (response.ok) {
        const data = await response.json()
        setTrainers(data.trainers || [])
      }
    } catch (error) {
      console.error('Error fetching trainers:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleGrantAccess = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!trainerEmail.trim()) return

    try {
      setSubmitting(true)
      setMessage(null)

      const response = await fetch('/api/client/grant-trainer-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          trainerEmail: trainerEmail.trim()
        })
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: data.message })
        setTrainerEmail("")
        fetchTrainers() // Refresh the list
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to grant access' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error occurred' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleRevokeAccess = async (trainerId: string) => {
    if (!confirm('Are you sure you want to revoke this trainer\'s access to your data?')) {
      return
    }

    try {
      const response = await fetch('/api/client/grant-trainer-access', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ trainerId })
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: data.message })
        fetchTrainers() // Refresh the list
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to revoke access' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error occurred' })
    }
  }

  // Only show for clients
  if (user?.user_type !== 'client') {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Trainer Access Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Grant Access Form */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium mb-2">Grant Trainer Access</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Enter your trainer's email address to give them read-only access to your health data.
            </p>
          </div>

          <form onSubmit={handleGrantAccess} className="flex gap-2">
            <Input
              type="email"
              placeholder="trainer@example.com"
              value={trainerEmail}
              onChange={(e) => setTrainerEmail(e.target.value)}
              disabled={submitting}
              required
            />
            <Button
              type="submit"
              disabled={submitting || !trainerEmail.trim()}
              className="flex items-center gap-2"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
              Grant Access
            </Button>
          </form>

          {message && (
            <Alert className={message.type === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
              {message.type === 'error' ? (
                <AlertTriangle className="h-4 w-4 text-red-600" />
              ) : (
                <CheckCircle className="h-4 w-4 text-green-600" />
              )}
              <AlertDescription className={message.type === 'error' ? 'text-red-800' : 'text-green-800'}>
                {message.text}
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Current Trainers */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Trainers with Access</h3>
          
          {loading ? (
            <div className="text-center py-4">
              <div className="animate-pulse">Loading trainers...</div>
            </div>
          ) : trainers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No trainers have access to your data</p>
              <p className="text-sm">Use the form above to grant access to your trainer</p>
            </div>
          ) : (
            <div className="space-y-3">
              {trainers.map((trainer) => (
                <div key={trainer.trainer_id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback>
                        {trainer.trainer_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{trainer.trainer_name}</p>
                      <p className="text-sm text-muted-foreground">{trainer.trainer_email}</p>
                      <p className="text-xs text-muted-foreground">
                        Access granted: {new Date(trainer.granted_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary">Read-only</Badge>
                    <Button
                      onClick={() => handleRevokeAccess(trainer.trainer_id)}
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}