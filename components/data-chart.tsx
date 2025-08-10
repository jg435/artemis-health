"use client"

import { X } from "lucide-react"
import { Button } from "@/components/ui/button"

type ChartData = {
  type: 'workout' | 'sleep' | 'recovery' | 'nutrition'
  data: any[]
  title: string
  id?: string
}

interface DataChartProps {
  chartData: ChartData
  onRemove: () => void
}

export function DataChart({ chartData, onRemove }: DataChartProps) {
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

  const renderSleepData = () => (
    <div className="space-y-2">
      <div className="grid grid-cols-6 gap-2 text-xs font-medium text-muted-foreground border-b pb-1">
        <div>Date</div>
        <div>Duration</div>
        <div>Efficiency</div>
        <div>Deep Sleep</div>
        <div>REM Sleep</div>
        <div>Score</div>
      </div>
      <div className="max-h-40 overflow-y-auto space-y-1">
        {chartData.data.slice(0, 10).map((item, index) => (
          <div key={index} className="grid grid-cols-6 gap-2 text-xs py-1 hover:bg-muted/50 rounded">
            <div className="font-medium">{item.date}</div>
            <div>{item.duration || 0}h</div>
            <div>{item.efficiency || 0}%</div>
            <div>{item.deepSleep || 0}h</div>
            <div>{item.remSleep || 0}h</div>
            <div className={`font-medium ${item.score >= 75 ? 'text-green-600' : item.score >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
              {item.score || 0}%
            </div>
          </div>
        ))}
      </div>
      {chartData.data.length > 10 && (
        <div className="text-xs text-muted-foreground text-center pt-2">
          Showing latest 10 of {chartData.data.length} entries
        </div>
      )}
    </div>
  )

  const renderWorkoutData = () => (
    <div className="space-y-2">
      <div className="grid grid-cols-5 gap-2 text-xs font-medium text-muted-foreground border-b pb-1">
        <div>Date</div>
        <div>Sport</div>
        <div>Strain</div>
        <div>Calories</div>
        <div>Avg HR</div>
      </div>
      <div className="max-h-40 overflow-y-auto space-y-1">
        {chartData.data.slice(0, 10).map((item, index) => (
          <div key={index} className="grid grid-cols-5 gap-2 text-xs py-1 hover:bg-muted/50 rounded">
            <div className="font-medium">{item.date}</div>
            <div>{item.sport || 'Unknown'}</div>
            <div className={`font-medium ${item.strain >= 15 ? 'text-red-600' : item.strain >= 10 ? 'text-yellow-600' : 'text-green-600'}`}>
              {item.strain}
            </div>
            <div>{item.calories}</div>
            <div>{item.avgHR} bpm</div>
          </div>
        ))}
      </div>
    </div>
  )

  const renderRecoveryData = () => (
    <div className="space-y-2">
      <div className="grid grid-cols-4 gap-2 text-xs font-medium text-muted-foreground border-b pb-1">
        <div>Date</div>
        <div>Recovery</div>
        <div>HRV</div>
        <div>RHR</div>
      </div>
      <div className="max-h-40 overflow-y-auto space-y-1">
        {chartData.data.slice(0, 10).map((item, index) => (
          <div key={index} className="grid grid-cols-4 gap-2 text-xs py-1 hover:bg-muted/50 rounded">
            <div className="font-medium">{item.date}</div>
            <div className={`font-medium ${item.score >= 75 ? 'text-green-600' : item.score >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
              {item.score}%
            </div>
            <div>{item.hrv}ms</div>
            <div>{item.rhr} bpm</div>
          </div>
        ))}
      </div>
    </div>
  )

  const renderNutritionData = () => (
    <div className="space-y-2">
      <div className="grid grid-cols-5 gap-2 text-xs font-medium text-muted-foreground border-b pb-1">
        <div>Date</div>
        <div>Calories</div>
        <div>Protein</div>
        <div>Carbs</div>
        <div>Fat</div>
      </div>
      <div className="max-h-40 overflow-y-auto space-y-1">
        {chartData.data.slice(0, 10).map((item, index) => (
          <div key={index} className="grid grid-cols-5 gap-2 text-xs py-1 hover:bg-muted/50 rounded">
            <div className="font-medium">{item.date}</div>
            <div>{item.calories}</div>
            <div>{item.protein}g</div>
            <div>{item.carbs}g</div>
            <div>{item.fat}g</div>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="relative border rounded-lg p-4">
      <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6 z-10" onClick={onRemove}>
        <X className="h-4 w-4" />
      </Button>
      <h4 className="text-sm font-medium mb-3">{chartData.title}</h4>
      
      <div className="h-[200px] overflow-auto">
        {chartData.type === 'sleep' && renderSleepData()}
        {chartData.type === 'workout' && renderWorkoutData()}
        {chartData.type === 'recovery' && renderRecoveryData()}
        {chartData.type === 'nutrition' && renderNutritionData()}
      </div>
      
      <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
        📊 {chartData.data.length} data points • {chartData.type} data
      </div>
    </div>
  )
}