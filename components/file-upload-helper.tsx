"use client"

import type React from "react"

import { useCallback, useState } from "react"
import { useDropzone } from "react-dropzone"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface FileUploadHelperProps {
  onFileChange: (file: File | null) => void
}

export function FileUploadHelper({ onFileChange }: FileUploadHelperProps) {
  const [fileName, setFileName] = useState<string | null>(null)

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0]
        if (file.type === "text/csv") {
          // Only accept CSV files
          setFileName(file.name)
          onFileChange(file)
        } else {
          alert("Please upload a CSV file.")
          setFileName(null)
          onFileChange(null)
        }
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
      "text/csv": [".csv"],
    },
  })

  const handleManualFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0] || null
      if (file) {
        if (file.type === "text/csv") {
          // Only accept CSV files
          setFileName(file.name)
          onFileChange(file)
        } else {
          alert("Please upload a CSV file.")
          setFileName(null)
          onFileChange(null)
        }
      } else {
        setFileName(null)
        onFileChange(null)
      }
    },
    [onFileChange],
  )

  return (
    <div className="grid w-full items-center gap-1.5">
      <Label htmlFor="file-upload">Upload CSV File</Label>
      <div
        {...getRootProps()}
        className={cn(
          "flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-gray-300 bg-gray-50 p-4 text-center transition-colors hover:border-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600",
          isDragActive && "border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20",
        )}
      >
        <Input {...getInputProps()} id="file-upload" className="hidden" />
        {isDragActive ? (
          <p className="text-gray-600 dark:text-gray-400">Drop the CSV file here ...</p>
        ) : (
          <p className="text-gray-600 dark:text-gray-400">Drag 'n' drop a CSV file here, or click to select one</p>
        )}
        {fileName && <p className="mt-2 text-sm text-gray-500 dark:text-gray-300">Selected: {fileName}</p>}
      </div>
      <p className="text-center text-sm text-gray-500 dark:text-gray-400">(Only CSV files are supported)</p>
    </div>
  )
}
