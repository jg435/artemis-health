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

interface SimpleChartProps {
  chartData: ChartData
  onRemove: () => void
}

export function SimpleChart({ chartData, onRemove }: SimpleChartProps) {
  const [RechartsComponents, setRechartsComponents] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#d084d0']
  
  useEffect(() => {
    let mounted = true
    
    const loadRecharts = async () => {
      try {
        const recharts = await import('recharts')
        if (mounted) {
          setRechartsComponents(recharts)
          setIsLoading(false)
        }
      } catch (err) {
        console.error('Failed to load Recharts:', err)
        if (mounted) {
          setError('Failed to load chart library')
          setIsLoading(false)
        }
      }
    }
    
    loadRecharts()
    
    return () => {
      mounted = false
    }
  }, [])
  
  if (!chartData || !chartData.data || chartData.data.length === 0) {
    return (
      <div className="relative border rounded-lg p-4 bg-muted/50">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-6 w-6"
          onClick={onRemove}
        >
          <X className="h-4 w-4" />
        </Button>
        <h4 className="text-sm font-medium mb-2">{chartData.title}</h4>
        <div className="h-[200px] flex items-center justify-center text-muted-foreground">
          No data available
        </div>
      </div>
    )
  }
  
  return (
    <div className="relative border rounded-lg p-4">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-6 w-6 z-10"
        onClick={onRemove}
      >
        <X className="h-4 w-4" />
      </Button>
      <h4 className="text-sm font-medium mb-2">{chartData.title}</h4>
      
      <div className="h-[200px]">
        {isLoading && (
          <div className="h-full bg-muted animate-pulse rounded flex items-center justify-center text-sm">
            Loading chart...
          </div>
        )}
        
        {error && (
          <div className="h-full bg-red-50 border border-red-200 rounded flex items-center justify-center text-sm text-red-600">
            {error}
          </div>
        )}
        
        {!isLoading && !error && RechartsComponents && (
          <RechartsComponents.ResponsiveContainer width="100%" height="100%">
            {chartData.type === 'workout' && (
              <RechartsComponents.BarChart data={chartData.data}>
                <RechartsComponents.CartesianGrid strokeDasharray="3 3" />
                <RechartsComponents.XAxis dataKey="date" fontSize={10} />
                <RechartsComponents.YAxis yAxisId="left" fontSize={10} />
                <RechartsComponents.YAxis yAxisId="right" orientation="right" fontSize={10} />
                <RechartsComponents.Tooltip />
                <RechartsComponents.Bar yAxisId="left" dataKey="strain" fill={COLORS[0]} name="Strain" />
                <RechartsComponents.Bar yAxisId="right" dataKey="calories" fill={COLORS[1]} name="Calories" />
              </RechartsComponents.BarChart>
            )}
            
            {chartData.type === 'sleep' && (
              <RechartsComponents.LineChart data={chartData.data}>
                <RechartsComponents.CartesianGrid strokeDasharray="3 3" />
                <RechartsComponents.XAxis dataKey="date" fontSize={10} />
                <RechartsComponents.YAxis fontSize={10} />
                <RechartsComponents.Tooltip />
                <RechartsComponents.Line type="monotone" dataKey="duration" stroke={COLORS[0]} strokeWidth={2} name="Sleep Hours" />
                <RechartsComponents.Line type="monotone" dataKey="efficiency" stroke={COLORS[1]} strokeWidth={2} name="Efficiency %" />
              </RechartsComponents.LineChart>
            )}
            
            {chartData.type === 'recovery' && (
              <RechartsComponents.LineChart data={chartData.data}>
                <RechartsComponents.CartesianGrid strokeDasharray="3 3" />
                <RechartsComponents.XAxis dataKey="date" fontSize={10} />
                <RechartsComponents.YAxis fontSize={10} />
                <RechartsComponents.Tooltip />
                <RechartsComponents.Line type="monotone" dataKey="score" stroke={COLORS[0]} strokeWidth={2} name="Recovery %" />
                <RechartsComponents.Line type="monotone" dataKey="hrv" stroke={COLORS[1]} strokeWidth={2} name="HRV (ms)" />
              </RechartsComponents.LineChart>
            )}
            
            {chartData.type === 'nutrition' && (
              <RechartsComponents.BarChart data={chartData.data}>
                <RechartsComponents.CartesianGrid strokeDasharray="3 3" />
                <RechartsComponents.XAxis dataKey="date" fontSize={10} />
                <RechartsComponents.YAxis fontSize={10} />
                <RechartsComponents.Tooltip />
                <RechartsComponents.Bar dataKey="calories" fill={COLORS[0]} name="Calories" />
                <RechartsComponents.Bar dataKey="protein" fill={COLORS[1]} name="Protein (g)" />
                <RechartsComponents.Bar dataKey="carbs" fill={COLORS[2]} name="Carbs (g)" />
              </RechartsComponents.BarChart>
            )}
          </RechartsComponents.ResponsiveContainer>
        )}
      </div>
    </div>
  )
}