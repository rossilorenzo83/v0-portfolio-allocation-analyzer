import { Progress } from "@/components/ui/progress"

interface LoadingProgressProps {
  progress: number
}

export function LoadingProgress({ progress }: LoadingProgressProps) {
  return (
    <div className="w-full space-y-2">
      <p className="text-center text-sm text-gray-500 dark:text-gray-400">Analyzing portfolio data...</p>
      <Progress value={progress} className="w-full" />
      <p className="text-center text-xs text-gray-400 dark:text-gray-500">{progress}% Complete</p>
    </div>
  )
}
