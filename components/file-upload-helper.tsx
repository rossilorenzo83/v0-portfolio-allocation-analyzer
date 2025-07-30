"use client"

import { useCallback, useState } from "react"
import { useDropzone } from "react-dropzone"
import { Input } from "@/components/ui/input"
import { FileTextIcon, UploadIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface FileUploadHelperProps {
  onFileChange: (file: File | null) => void
}

export function FileUploadHelper({ onFileChange }: FileUploadHelperProps) {
  const [fileName, setFileName] = useState<string | null>(null)

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0]
        setFileName(file.name)
        onFileChange(file)
      } else {
        setFileName(null)
        onFileChange(null)
      }
    },
    [onFileChange],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      "text/csv": [".csv"], // Only accept CSV files
    },
  })

  const handleClearFile = useCallback(() => {
    setFileName(null)
    onFileChange(null)
  }, [onFileChange])

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          "flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition-colors",
          "cursor-pointer hover:border-primary-foreground",
          isDragActive
            ? "border-primary-foreground bg-gray-50 dark:bg-gray-800"
            : "border-gray-300 dark:border-gray-700",
        )}
      >
        <Input {...getInputProps()} id="file-upload" className="sr-only" />
        <UploadIcon className="h-10 w-10 text-gray-400 dark:text-gray-600" />
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {isDragActive ? "Drop your CSV file here ..." : "Drag and drop your CSV file here, or click to select"}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-500">Only CSV files up to 10MB</p>
      </div>
      {fileName && (
        <div className="flex items-center justify-between rounded-md bg-gray-100 p-3 dark:bg-gray-800">
          <div className="flex items-center gap-2">
            <FileTextIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{fileName}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleClearFile}>
            Clear
          </Button>
        </div>
      )}
    </div>
  )
}
