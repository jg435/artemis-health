"use client"

import React from "react"

type Exercise = {
  name: string
  description?: string
  sets?: number
  reps?: string
  restSeconds?: number
  estimatedCalories?: number
  equipment?: string
}

type DailyPlan = {
  day: string
  durationMinutes?: number
  warmup?: string[]
  exercises?: Exercise[]
  cooldown?: string[]
  estimatedTotalCalories?: number
}

type WorkoutPlanProps = {
  plan: {
    title?: string
    summary?: string
    fitnessLevel?: string
    goals?: string
    daysPerWeek?: number
    dailyPlans?: DailyPlan[]
    tips?: string[]
    alternatives?: { exercise: string; alternatives: string[] }[]
  }
}

export function WorkoutPlan({ plan }: WorkoutPlanProps) {
  if (!plan) return null

  return (
    <div className="border rounded-lg p-3 bg-white shadow-sm">
      <div className="mb-2">
        <h3 className="text-sm font-semibold">{plan.title ?? "Workout Plan"}</h3>
        {plan.summary && <p className="text-xs text-muted-foreground">{plan.summary}</p>}
        <div className="text-xs text-muted-foreground mt-1">
          {plan.fitnessLevel && <span className="mr-2">Level: {plan.fitnessLevel}</span>}
          {plan.goals && <span className="mr-2">Goals: {plan.goals}</span>}
          {plan.daysPerWeek && <span>Days/Week: {plan.daysPerWeek}</span>}
        </div>
      </div>

      <div className="space-y-3">
        {(plan.dailyPlans || []).map((d, i) => {
          const estimatedFromExercises =
            d.exercises?.reduce((sum, ex) => sum + (ex.estimatedCalories ?? 0), 0) ?? 0
          const estimatedTotal = d.estimatedTotalCalories ?? (estimatedFromExercises || undefined)

          return (
            <div key={i} className="p-2 border rounded-md">
              <div className="flex justify-between items-center mb-1">
                <div className="font-medium text-sm">{d.day}</div>
                {d.durationMinutes && <div className="text-xs text-muted-foreground">{d.durationMinutes} min</div>}
              </div>

              {d.warmup && d.warmup.length > 0 && (
                <div className="text-xs mb-2">
                  <strong>Warmup:</strong> {d.warmup.join(", ")}
                </div>
              )}

              <div className="space-y-2">
                {(d.exercises || []).map((ex, idx) => (
                  <div key={idx} className="p-2 bg-gray-50 rounded">
                    <div className="font-medium text-sm">{ex.name}</div>
                    {ex.description && <div className="text-xs text-muted-foreground">{ex.description}</div>}
                    <div className="text-xs mt-1">
                      {ex.sets !== undefined && <span className="mr-2">Sets: {ex.sets}</span>}
                      {ex.reps && <span className="mr-2">Reps: {ex.reps}</span>}
                      {ex.restSeconds !== undefined && <span className="mr-2">Rest: {ex.restSeconds}s</span>}
                      {ex.equipment && <span className="mr-2">Equipment: {ex.equipment}</span>}
                      {ex.estimatedCalories !== undefined && (
                        <span className="mr-2">Est cal: {ex.estimatedCalories}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {d.cooldown && d.cooldown.length > 0 && (
                <div className="text-xs mt-2">
                  <strong>Cooldown:</strong> {d.cooldown.join(", ")}
                </div>
              )}

              {estimatedTotal !== undefined && (
                <div className="text-xs mt-2">
                  <strong>Estimated Calories:</strong> {estimatedTotal}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {plan.tips && plan.tips.length > 0 && (
        <div className="mt-3 text-xs">
          <strong>Tips:</strong>
          <ul className="list-disc ml-5">
            {plan.tips.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </div>
      )}

      {plan.alternatives && plan.alternatives.length > 0 && (
        <div className="mt-3 text-xs">
          <strong>Alternatives:</strong>
          <ul className="ml-3">
            {plan.alternatives.map((a, i) => (
              <li key={i}>
                <span className="font-medium">{a.exercise}:</span> {a.alternatives.join(", ")}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default WorkoutPlan
