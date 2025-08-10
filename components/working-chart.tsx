"use client"

import { useState, useEffect } from 'react'
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"

type ChartData = {
  type: 'workout' | 'sleep' | 'recovery' | 'nutrition'
  data: any[]
  title: string
  id?: string
}

interface WorkingChartProps {
  chartData: ChartData
  onRemove: () => void
}

export function WorkingChart({ chartData, onRemove }: WorkingChartProps) {
  const [recharts, setRecharts] = useState<any>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#d084d0']
  
  useEffect(() => {
    const loadCharts = async () => {
      try {
        const rechartsModule = await import('recharts')
        setRecharts(rechartsModule)
        setIsLoaded(true)
      } catch (error) {
        console.error('Failed to load recharts:', error)
        setIsLoaded(true) // Still set loaded to show error state
      }
    }
    
    loadCharts()
  }, [])
  
  if (!chartData || !chartData.data || chartData.data.length === 0) {
    return (
      <div className="relative border rounded-lg p-4 bg-muted/50">
        <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6" onClick={onRemove}>
          <X className="h-4 w-4" />
        </Button>
        <h4 className="text-sm font-medium mb-2">{chartData.title}</h4>
        <div className="h-[200px] flex items-center justify-center text-muted-foreground">
          No data available
        </div>
      </div>
    )
  }
  
  if (!isLoaded) {
    return (
      <div className="relative border rounded-lg p-4">
        <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6" onClick={onRemove}>
          <X className="h-4 w-4" />
        </Button>
        <h4 className="text-sm font-medium mb-2">{chartData.title}</h4>
        <div className="h-[200px] bg-muted animate-pulse rounded flex items-center justify-center text-sm">
          Loading chart...
        </div>
      </div>
    )
  }
  
  if (!recharts) {
    return (
      <div className="relative border rounded-lg p-4">
        <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6" onClick={onRemove}>
          <X className="h-4 w-4" />
        </Button>
        <h4 className="text-sm font-medium mb-2">{chartData.title}</h4>
        <div className="h-[200px] bg-red-50 border border-red-200 rounded flex items-center justify-center text-sm text-red-600">
          Chart library failed to load
        </div>
      </div>
    )
  }
  
  const { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line } = recharts
  
  return (
    <div className="relative border rounded-lg p-4">
      <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6 z-10" onClick={onRemove}>
        <X className="h-4 w-4" />
      </Button>
      <h4 className="text-sm font-medium mb-2">{chartData.title}</h4>
      
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          {chartData.type === 'sleep' && (
            <LineChart data={chartData.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" fontSize={10} />
              <YAxis fontSize={10} />
              <Tooltip />
              <Line type="monotone" dataKey="duration" stroke={COLORS[0]} strokeWidth={2} name="Sleep Hours" />
              <Line type="monotone" dataKey="efficiency" stroke={COLORS[1]} strokeWidth={2} name="Efficiency %" />
            </LineChart>
          )}
          
          {chartData.type === 'workout' && (
            <BarChart data={chartData.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" fontSize={10} />
              <YAxis yAxisId="left" fontSize={10} />
              <YAxis yAxisId="right" orientation="right" fontSize={10} />
              <Tooltip />
              <Bar yAxisId="left" dataKey="strain" fill={COLORS[0]} name="Strain" />
              <Bar yAxisId="right" dataKey="calories" fill={COLORS[1]} name="Calories" />
            </BarChart>
          )}
          
          {chartData.type === 'recovery' && (
            <LineChart data={chartData.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" fontSize={10} />
              <YAxis fontSize={10} />
              <Tooltip />
              <Line type="monotone" dataKey="score" stroke={COLORS[0]} strokeWidth={2} name="Recovery %" />
              <Line type="monotone" dataKey="hrv" stroke={COLORS[1]} strokeWidth={2} name="HRV (ms)" />
            </LineChart>
          )}
          
          {chartData.type === 'nutrition' && (
            <BarChart data={chartData.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" fontSize={10} />
              <YAxis fontSize={10} />
              <Tooltip />
              <Bar dataKey="calories" fill={COLORS[0]} name="Calories" />
              <Bar dataKey="protein" fill={COLORS[1]} name="Protein (g)" />
              <Bar dataKey="carbs" fill={COLORS[2]} name="Carbs (g)" />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  )
}