"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

interface User {
  id: string
  email: string
  name: string
  whoop_connected: boolean
  user_type: 'client' | 'trainer'
  isDemo?: boolean
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  currentClient: User | null
  isViewingAsTrainer: boolean
  selectedWearable: 'whoop' | 'oura' | 'garmin' | null
  login: (user: User) => void
  logout: () => void
  updateUser: (updates: Partial<User>) => void
  switchToClient: (client: User) => void
  switchBackToTrainer: () => void
  selectWearable: (wearable: 'whoop' | 'oura' | 'garmin' | null) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentClient, setCurrentClient] = useState<User | null>(null)
  const [isViewingAsTrainer, setIsViewingAsTrainer] = useState(false)
  const [selectedWearable, setSelectedWearable] = useState<'whoop' | 'oura' | 'garmin' | null>(null)

  // Check if user is authenticated on mount
  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me')
      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
      }
    } catch (error) {
      console.log('Not authenticated')
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (userData: User) => {
    setUser(userData)
    
    // If this is a demo user, store it in a session cookie
    if (userData.isDemo) {
      document.cookie = `user_session=${userData.id}; path=/; max-age=${60 * 60 * 24 * 7}; samesite=lax`
    }
  }

  const logout = async () => {
    try {
      // For demo users, just clear the cookie without API call
      if (user?.isDemo) {
        document.cookie = 'user_session=; path=/; max-age=0'
      } else {
        await fetch('/api/auth/logout', { method: 'POST' })
      }
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setUser(null)
      setCurrentClient(null)
      setIsViewingAsTrainer(false)
      setSelectedWearable(null)
    }
  }

  const updateUser = (updates: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...updates })
    }
  }

  const switchToClient = (client: User) => {
    if (user?.user_type === 'trainer') {
      setCurrentClient(client)
      setIsViewingAsTrainer(true)
    }
  }

  const switchBackToTrainer = () => {
    setCurrentClient(null)
    setIsViewingAsTrainer(false)
    setSelectedWearable(null)
  }

  const selectWearable = (wearable: 'whoop' | 'oura' | 'garmin' | null) => {
    setSelectedWearable(wearable)
  }

  const value = {
    user,
    isLoading,
    currentClient,
    isViewingAsTrainer,
    selectedWearable,
    login,
    logout,
    updateUser,
    switchToClient,
    switchBackToTrainer,
    selectWearable
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Helper hook to get the effective user for data operations
// Returns the current client if trainer is viewing, otherwise the authenticated user
export function useEffectiveUser() {
  const { user, currentClient, isViewingAsTrainer } = useAuth()
  return isViewingAsTrainer && currentClient ? currentClient : user
}

// Helper hook to get headers for API requests that includes trainer viewing context
export function useApiHeaders() {
  const { currentClient, isViewingAsTrainer, selectedWearable } = useAuth()
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json'
  }
  
  if (isViewingAsTrainer && currentClient) {
    headers['x-viewing-client-id'] = currentClient.id
  }
  
  if (selectedWearable) {
    headers['x-selected-wearable'] = selectedWearable
  }
  
  return headers
}