"use client"

import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import dynamic from 'next/dynamic'

// Dynamically import the chart renderer to avoid SSR issues
const ChartRenderer = dynamic(() => import('./chart-renderer'), {
  ssr: false,
  loading: () => (
    <div className="h-[200px] bg-muted animate-pulse rounded flex items-center justify-center text-sm">
      Loading chart...
    </div>
  ),
})

type ChartData = {
  type: 'workout' | 'sleep' | 'recovery' | 'nutrition'
  data: any[]
  title: string
  id?: string
}

interface ChartDisplayProps {
  chartData: ChartData
  onRemove: () => void
}

export function ChartDisplay({ chartData, onRemove }: ChartDisplayProps) {
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
        <ChartRenderer chartData={chartData} />
      </div>
    </div>
  )
}

// Also export as default for dynamic import compatibility
export default ChartDisplay