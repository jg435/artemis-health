"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Bot, Send, Sparkles, AlertCircle, CheckCircle2, Database, Mic } from "lucide-react"
import { isSupabaseConfigured } from "@/lib/supabase"
import { useAuth } from "@/context/auth-context"
import { VoiceConversation } from "./voice-conversation"

interface Message {
  id: string
  content: string
  isUser: boolean
  timestamp: Date
  category?: string
  priority?: "low" | "medium" | "high"
  contextData?: any
}

interface HealthCoachChatProps {
  userId?: string
  onNavigateToTab?: (tab: string) => void
}

export function HealthCoachChat({ userId = "550e8400-e29b-41d4-a716-446655440000", onNavigateToTab }: HealthCoachChatProps) {
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content: isSupabaseConfigured()
        ? `Hi ${user?.name || 'there'}! I'm your AI Health Coach capable of taking your data and answering any questions you have about it. \n\nHow are you feeling today? Is there anything specific about your health or fitness you'd like to discuss?\n\n💬 Use text chat below or 🎤 try voice conversation!`
        : `Hi ${user?.name || 'there'}! I'm your AI Health Coach. 👋\n\nI'm currently running in demo mode since your Supabase database isn't configured yet. I can still provide general health advice and answer questions about nutrition, fitness, and wellness!\n\nTo unlock personalized insights based on your actual health data, you'll need to set up your Supabase connection. What would you like to know about health and wellness?`,
      isUser: false,
      timestamp: new Date(),
      category: "general",
      priority: "low",
    },
  ])
  const [inputMessage, setInputMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showVoiceMode, setShowVoiceMode] = useState(true)
  const [healthData, setHealthData] = useState<any>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  const quickQuestions = [
    "How can I improve my cholesterol?",
    "What should I eat post-workout?",
    "Why am I not losing weight?",
    "How can I sleep better?",
    "Am I eating enough protein?",
    "Should I increase my cardio?",
  ]

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

  // Fetch health data when component mounts
  useEffect(() => {
    const fetchHealthData = async () => {
      try {
        // This would fetch the same data the health coach API uses
        const response = await fetch('/api/health-coach', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            message: 'get-health-context',
            userId,
            conversationHistory: []
          })
        })
        
        if (response.ok) {
          const data = await response.json()
          setHealthData(data.contextData)
        }
      } catch (error) {
        console.log('Could not fetch health data for voice mode:', error)
      }
    }

    fetchHealthData()
  }, [userId])

  const sendMessage = async (content: string) => {
    if (!content.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      isUser: true,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputMessage("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/health-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          userId,
          conversationHistory: messages.slice(-5), // Send last 5 messages for context
        }),
      })

      const data = await response.json()

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.response,
        isUser: false,
        timestamp: new Date(),
        category: data.category,
        priority: data.priority,
        contextData: data.contextData,
      }

      setMessages((prev) => [...prev, botMessage])
    } catch (error) {
      console.error("Error sending message:", error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "I'm sorry, I'm having trouble connecting right now. Please try again in a moment.",
        isUser: false,
        timestamp: new Date(),
        category: "error",
        priority: "low",
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(inputMessage)
  }

  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case "nutrition":
        return <span className="text-green-500">🍎</span>
      case "fitness":
        return <span className="text-blue-500">💪</span>
      case "medical":
        return <span className="text-red-500">🏥</span>
      case "sleep":
        return <span className="text-purple-500">😴</span>
      case "achievement":
        return <CheckCircle2 className="w-4 h-4 text-green-500" />
      case "alert":
        return <AlertCircle className="w-4 h-4 text-yellow-500" />
      default:
        return <Sparkles className="w-4 h-4 text-blue-500" />
    }
  }

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case "high":
        return "border-l-red-500 bg-red-50"
      case "medium":
        return "border-l-yellow-500 bg-yellow-50"
      case "low":
        return "border-l-green-500 bg-green-50"
      default:
        return "border-l-blue-500 bg-blue-50"
    }
  }

  return (
    <Card className="flex flex-col h-full flex flex-col max-h-[600px]">
      <CardHeader className="pb-3">
        <div className="flex items-center space-x-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src="/health-coach-avatar.png" />
            <AvatarFallback className="bg-blue-100">
              <Bot className="h-4 w-4 text-blue-600" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <CardTitle className="text-lg">AI Health Coach</CardTitle>
            <CardDescription className="text-sm">
              {isSupabaseConfigured() ? "Personalized wellness guidance" : "Demo mode - General wellness advice"}
            </CardDescription>
          </div>
          <Button
            variant={showVoiceMode ? "default" : "outline"}
            size="sm"
            onClick={() => setShowVoiceMode(!showVoiceMode)}
            className="ml-2"
          >
            <Mic className="h-4 w-4 mr-1" />
            {showVoiceMode ? "Text" : "Voice"}
          </Button>
        </div>

        {!isSupabaseConfigured() && (
          <Alert className="mt-2">
            <Database className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Configure Supabase to unlock personalized health insights based on your data.
            </AlertDescription>
          </Alert>
        )}
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-4 min-h-0">
        {showVoiceMode ? (
          /* Voice Mode */
          <VoiceConversation healthData={healthData} onNavigateToTab={onNavigateToTab} />
        ) : (
          /* Text Chat Mode */
          <>
            {/* Messages */}
            <div 
              className="flex-1 overflow-y-scroll min-h-0 border border-gray-200 rounded-lg p-2 mb-4" 
              ref={scrollAreaRef}
              style={{ 
                height: '350px',
                scrollbarWidth: 'thin',
                scrollbarColor: '#cbd5e0 #f7fafc'
              }}
            >
          <div className="space-y-4">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.isUser ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.isUser
                      ? "bg-primary text-primary-foreground"
                      : `border-l-4 ${getPriorityColor(message.priority)}`
                  }`}
                >
                  {!message.isUser && (
                    <div className="flex items-center space-x-2 mb-2">
                      {getCategoryIcon(message.category)}
                      {message.priority && (
                        <Badge variant={message.priority === "high" ? "destructive" : "secondary"} className="text-xs">
                          {message.priority}
                        </Badge>
                      )}
                    </div>
                  )}
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <p className="text-xs opacity-70 mt-2">
                    {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg p-3 max-w-[80%]">
                  <div className="flex items-center space-x-2">
                    <div className="animate-pulse flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {isSupabaseConfigured() ? "Analyzing your health data..." : "Thinking..."}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Questions */}
        <div className="space-y-2 flex-shrink-0">
          <p className="text-sm font-medium text-muted-foreground">Quick questions:</p>
          <div className="flex flex-wrap gap-2">
            {quickQuestions.slice(0, 3).map((question, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                className="text-xs bg-transparent"
                onClick={() => sendMessage(question)}
                disabled={isLoading}
              >
                {question}
              </Button>
            ))}
          </div>
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="flex space-x-2 flex-shrink-0">
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Ask me anything about your health..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" disabled={isLoading || !inputMessage.trim()}>
            <Send className="h-4 w-4" />
          </Button>
            </form>
          </>
        )}
      </CardContent>
    </Card>
  )
}
