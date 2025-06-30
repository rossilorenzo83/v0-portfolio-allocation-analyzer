"use client"

import { useState, useEffect } from "react"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Database, PieChart, BarChart3, Loader2, Wifi } from "lucide-react"

interface LoadingProgressProps {
  isLoading: boolean
  currentStep: string
}

export function LoadingProgress({ isLoading, currentStep }: LoadingProgressProps) {
  const [progress, setProgress] = useState(0)
  const [step, setStep] = useState(0)
  const [apiCallsInProgress, setApiCallsInProgress] = useState(false)

  const steps = [
    { icon: FileText, label: "Extracting text from file", duration: 2000 },
    { icon: Database, label: "Parsing portfolio positions", duration: 1500 },
    { icon: Wifi, label: "Fetching real-time prices", duration: 3000 },
    { icon: PieChart, label: "Calculating allocations", duration: 1000 },
    { icon: BarChart3, label: "Generating analysis", duration: 500 },
  ]

  useEffect(() => {
    if (!isLoading) {
      setProgress(0)
      setStep(0)
      setApiCallsInProgress(false)
      return
    }

    let currentProgress = 0
    let currentStepIndex = 0

    const interval = setInterval(() => {
      if (currentStepIndex < steps.length) {
        const stepProgress = (currentProgress % 20) + 1
        setProgress(currentStepIndex * 20 + stepProgress)

        // Show API calls in progress for step 2 (fetching prices)
        if (currentStepIndex === 2) {
          setApiCallsInProgress(true)
        } else {
          setApiCallsInProgress(false)
        }

        if (stepProgress >= 20) {
          currentStepIndex++
          setStep(currentStepIndex)
        }
        currentProgress++
      } else {
        setProgress(100)
        setApiCallsInProgress(false)
        clearInterval(interval)
      }
    }, 150) // Slightly slower for better UX

    return () => clearInterval(interval)
  }, [isLoading])

  if (!isLoading) return null

  const currentStepData = steps[Math.min(step, steps.length - 1)]
  const Icon = currentStepData.icon

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-center">
          <Loader2 className="h-5 w-5 animate-spin" />
          Processing Portfolio
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={progress} className="w-full" />
        <div className="text-center space-y-2">
          <p className="text-sm font-medium flex items-center justify-center gap-2">
            <Icon className={`h-4 w-4 ${apiCallsInProgress ? "animate-pulse" : "animate-spin"}`} />
            {currentStepData.label}
          </p>
          <p className="text-xs text-muted-foreground">
            Step {Math.min(step + 1, steps.length)} of {steps.length}
          </p>
        </div>

        <div className="space-y-2">
          {steps.map((stepItem, index) => {
            const StepIcon = stepItem.icon
            const isActive = index === step
            const isCompleted = index < step

            return (
              <div
                key={index}
                className={`flex items-center gap-2 text-xs ${
                  isActive ? "text-blue-600 font-medium" : isCompleted ? "text-green-600" : "text-muted-foreground"
                }`}
              >
                <StepIcon className={`h-3 w-3 ${isActive ? "animate-pulse" : ""}`} />
                <span>{stepItem.label}</span>
                {isCompleted && <span className="ml-auto">✓</span>}
                {isActive && <Loader2 className="h-3 w-3 animate-spin ml-auto" />}
              </div>
            )
          })}
        </div>

        {step === 0 && (
          <div className="text-xs text-muted-foreground text-center">
            <p>📄 Processing file content...</p>
            <p>This may take a moment for large files</p>
          </div>
        )}

        {step === 2 && (
          <div className="text-xs text-muted-foreground text-center">
            <p>🌐 Fetching real-time data...</p>
            <p>Getting prices and ETF compositions</p>
          </div>
        )}

        {apiCallsInProgress && (
          <div className="flex items-center justify-center gap-2 text-xs text-blue-600">
            <Wifi className="h-3 w-3 animate-pulse" />
            <span>API calls in progress...</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
