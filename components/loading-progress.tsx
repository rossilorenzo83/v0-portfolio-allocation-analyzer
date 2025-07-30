import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

interface LoadingProgressProps {
  progress: number
  message: string
}

export function LoadingProgress({ progress, message }: LoadingProgressProps) {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle>Analyzing Portfolio</CardTitle>
        <CardDescription>Please wait while we process your data.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center gap-4 p-6">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <Progress value={progress} className="w-full" />
        <p className="text-sm text-gray-600 dark:text-gray-400">{message}</p>
      </CardContent>
    </Card>
  )
}
