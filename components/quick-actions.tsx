"use client"

import { Button } from "@/components/ui/button"
import { Apple, Activity, Heart, Calendar, Scale, Droplets } from "lucide-react"

const quickActions = [
  { icon: Apple, label: "Log Meal", color: "bg-green-100 text-green-700 hover:bg-green-200" },
  { icon: Activity, label: "Record Workout", color: "bg-blue-100 text-blue-700 hover:bg-blue-200" },
  { icon: Heart, label: "Check Vitals", color: "bg-red-100 text-red-700 hover:bg-red-200" },
  { icon: Scale, label: "Log Weight", color: "bg-purple-100 text-purple-700 hover:bg-purple-200" },
  { icon: Droplets, label: "Track Water", color: "bg-cyan-100 text-cyan-700 hover:bg-cyan-200" },
  { icon: Calendar, label: "Schedule", color: "bg-orange-100 text-orange-700 hover:bg-orange-200" },
]

export function QuickActions() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {quickActions.map((action, index) => (
        <Button key={index} variant="ghost" className={`h-20 flex-col space-y-2 ${action.color}`}>
          <action.icon className="w-6 h-6" />
          <span className="text-xs font-medium">{action.label}</span>
        </Button>
      ))}
    </div>
  )
}
