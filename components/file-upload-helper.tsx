"use client"

import type React from "react"

import { useCallback, useState } from "react"
import { FileText, Upload } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

interface FileUploadHelperProps {
  onFileUpload: (file: File | string) => Promise<void>
  isLoading: boolean
  error: string | null
  acceptedFileTypes?: string // e.g., ".csv,.pdf"
  sampleDataUrl?: string // URL to a sample file for quick testing
  sampleDataName?: string
}

export function FileUploadHelper({
  onFileUpload,
  isLoading,
  error,
  acceptedFileTypes = ".csv,.pdf",
  sampleDataUrl,
  sampleDataName = "sample file",
}: FileUploadHelperProps) {
  const [progress, setProgress] = useState(0)

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (file) {
        // Simulate progress for large files, or just set to 100 if processing is fast
        setProgress(0)
        const reader = new FileReader()
        reader.onprogress = (e) => {
          if (e.lengthComputable) {
            setProgress(Math.round((e.loaded * 100) / e.total))
          }
        }
        reader.onloadend = async () => {
          await onFileUpload(file)
          setProgress(100)
        }
        reader.readAsArrayBuffer(file) // Or readAsText if it's a text file
      }
    },
    [onFileUpload],
  )

  const handleSampleDataLoad = useCallback(async () => {
    if (sampleDataUrl) {
      setProgress(0)
      try {
        const response = await fetch(sampleDataUrl)
        if (!response.ok) {
          throw new Error(`Failed to fetch sample data: ${response.statusText}`)
        }
        const blob = await response.blob()
        const file = new File([blob], sampleDataName, { type: blob.type })
        await onFileUpload(file)
        setProgress(100)
      } catch (err) {
        console.error("Error loading sample data:", err)
        // setError is handled by the parent component's onFileUpload
      }
    }
  }, [onFileUpload, sampleDataUrl, sampleDataName])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Portfolio Data
        </CardTitle>
        <CardDescription>
          Upload a {acceptedFileTypes.split(",").join(" or ")} file containing your portfolio information.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <input
            type="file"
            accept={acceptedFileTypes}
            onChange={handleFileChange}
            className="hidden"
            id="file-upload"
            disabled={isLoading}
          />
          <label htmlFor="file-upload" className="cursor-pointer">
            <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-lg font-medium">Click to upload file</p>
            <p className="text-sm text-muted-foreground">Supports {acceptedFileTypes} files</p>
          </label>
        </div>
        {isLoading && (
          <div className="mt-4">
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-muted-foreground mt-2">Processing file...</p>
          </div>
        )}
        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {sampleDataUrl && !isLoading && (
          <div className="mt-4 text-center">
            <Button variant="outline" onClick={handleSampleDataLoad} disabled={isLoading}>
              Load Sample {sampleDataName}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
