"use client"

import React from "react"

type FoodItem = {
  name: string
  quantity?: string
  calories?: number
}

type Meal = {
  name: string
  time?: string
  foods?: FoodItem[]
  totalCalories?: number
}

type DailyMenu = {
  day: string
  meals?: Meal[]
  estimatedTotalCalories?: number
}

type NutritionPlanProps = {
  plan: {
    type?: string
    title?: string
    summary?: string
    goals?: string
    daysPerWeek?: number
    dailyMenus?: DailyMenu[]
    shoppingList?: string[]
    tips?: string[]
    alternatives?: { food: string; alternatives: string[] }[]
  }
}

export function NutritionPlan({ plan }: NutritionPlanProps) {
  if (!plan) return null

  return (
    <div className="border rounded-lg p-3 bg-white shadow-sm">
      <div className="mb-2">
        <h3 className="text-sm font-semibold">{plan.title ?? "Nutrition Plan"}</h3>
        {plan.summary && <p className="text-xs text-muted-foreground">{plan.summary}</p>}
        <div className="text-xs text-muted-foreground mt-1">
          {plan.goals && <span className="mr-2">Goals: {plan.goals}</span>}
          {plan.daysPerWeek && <span>Days/Week: {plan.daysPerWeek}</span>}
        </div>
      </div>

      <div className="space-y-3">
        {(plan.dailyMenus || []).map((d, i) => (
          <div key={i} className="p-2 border rounded-md">
            <div className="flex justify-between items-center mb-1">
              <div className="font-medium text-sm">{d.day}</div>
              {d.estimatedTotalCalories !== undefined && (
                <div className="text-xs text-muted-foreground">{d.estimatedTotalCalories} cal</div>
              )}
            </div>

            {(d.meals || []).map((meal, mIdx) => (
              <div key={mIdx} className="mb-2 p-2 bg-gray-50 rounded">
                <div className="flex justify-between items-center">
                  <div className="font-medium text-sm">{meal.name}</div>
                  {meal.time && <div className="text-xs text-muted-foreground">{meal.time}</div>}
                </div>
                <div className="text-xs mt-1">
                  {(meal.foods || []).map((f, fIdx) => (
                    <div key={fIdx} className="flex justify-between">
                      <div>{f.quantity ? `${f.quantity} ${f.name}` : f.name}</div>
                      {f.calories !== undefined && <div className="text-muted-foreground">{f.calories} cal</div>}
                    </div>
                  ))}
                </div>
                {meal.totalCalories !== undefined && (
                  <div className="text-xs mt-1">
                    <strong>Meal total:</strong> {meal.totalCalories} cal
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      {plan.shoppingList && plan.shoppingList.length > 0 && (
        <div className="mt-3 text-xs">
          <strong>Shopping List:</strong>
          <ul className="list-disc ml-5">
            {plan.shoppingList.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      )}

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
                <span className="font-medium">{a.food}:</span> {a.alternatives.join(", ")}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default NutritionPlan
