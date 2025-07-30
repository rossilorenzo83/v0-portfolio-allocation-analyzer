"use client"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

interface LoadingProgressProps {
  progress: number
  message: string
}

export function LoadingProgress({ progress, message }: LoadingProgressProps) {
  return (
    <Card className="w-full max-w-md mx-auto mt-8">
      <CardContent className="flex flex-col items-center justify-center p-6">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500 mb-4" />
        <p className="text-lg font-medium text-gray-700 mb-3 text-center">{message}</p>
        <Progress value={progress} className="w-full" />
        <p className="text-sm text-gray-500 mt-2">{progress.toFixed(0)}% Complete</p>
      </CardContent>
    </Card>
  )
}
