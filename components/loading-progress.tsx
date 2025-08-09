import { Progress } from "@/components/ui/progress"

interface LoadingProgressProps {
  progress: number
}

export function LoadingProgress({ progress }: LoadingProgressProps) {
  return (
    <div className="w-full">
      <Progress value={progress} className="w-full" />
      <p className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">{progress}% Complete</p>
    </div>
  )
}
