"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

const fitnessData = [
  { day: "Mon", steps: 8500, calories: 420 },
  { day: "Tue", steps: 9200, calories: 380 },
  { day: "Wed", steps: 7800, calories: 290 },
  { day: "Thu", steps: 10500, calories: 520 },
  { day: "Fri", steps: 9800, calories: 450 },
  { day: "Sat", steps: 12000, calories: 680 },
  { day: "Sun", steps: 8200, calories: 320 },
]

export function FitnessChart() {
  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={fitnessData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="day" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="steps" fill="#8884d8" name="Steps" />
          <Bar dataKey="calories" fill="#82ca9d" name="Calories Burned" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
