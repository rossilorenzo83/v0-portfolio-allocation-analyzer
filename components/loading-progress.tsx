import { Progress } from "@/components/ui/progress"

interface LoadingProgressProps {
  progress: number
  message: string
}

export function LoadingProgress({ progress, message }: LoadingProgressProps) {
  return (
    <div className="flex flex-col items-center justify-center p-4">
      <Progress value={progress} className="w-full max-w-md" />
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
    </div>
  )
}
