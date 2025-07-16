"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"

const healthData = [
  { date: "Jan 1", weight: 168, heartRate: 68, sleep: 7.5 },
  { date: "Jan 2", weight: 167.5, heartRate: 65, sleep: 8.2 },
  { date: "Jan 3", weight: 167, heartRate: 70, sleep: 6.8 },
  { date: "Jan 4", weight: 166.5, heartRate: 67, sleep: 7.8 },
  { date: "Jan 5", weight: 166, heartRate: 69, sleep: 8.0 },
  { date: "Jan 6", weight: 165.5, heartRate: 66, sleep: 7.2 },
  { date: "Jan 7", weight: 165, heartRate: 68, sleep: 7.9 },
]

export function HealthMetrics() {
  return (
    <div className="h-[350px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={healthData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="weight" stroke="#8884d8" strokeWidth={2} name="Weight (lbs)" />
          <Line type="monotone" dataKey="heartRate" stroke="#82ca9d" strokeWidth={2} name="Resting HR (bpm)" />
          <Line type="monotone" dataKey="sleep" stroke="#ffc658" strokeWidth={2} name="Sleep (hours)" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
