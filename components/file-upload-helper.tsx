"use client"

import type React from "react"
import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, UploadCloud, FileText } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

interface FileUploadHelperProps {
  onFileUpload: (file: File) => Promise<void>
  isLoading: boolean
  acceptedFileTypes?: string[]
  maxFileSizeMb?: number
  sampleCsvUrl?: string
}

export function FileUploadHelper({
  onFileUpload,
  isLoading,
  acceptedFileTypes = [".csv"],
  maxFileSizeMb = 5,
  sampleCsvUrl,
}: FileUploadHelperProps) {
  const [isDragging, setIsDragging] = useState(false)

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setIsDragging(false)
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0]
        if (file.size > maxFileSizeMb * 1024 * 1024) {
          toast({
            title: "File too large",
            description: `Please upload a file smaller than ${maxFileSizeMb}MB.`,
            variant: "destructive",
          })
          return
        }
        if (!acceptedFileTypes.some((type) => file.name.endsWith(type))) {
          toast({
            title: "Invalid file type",
            description: `Please upload a file of type: ${acceptedFileTypes.join(", ")}.`,
            variant: "destructive",
          })
          return
        }
        await onFileUpload(file)
      }
    },
    [onFileUpload, maxFileSizeMb, acceptedFileTypes],
  )

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: acceptedFileTypes.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
    maxFiles: 1,
    onDragEnter: () => setIsDragging(true),
    onDragLeave: () => setIsDragging(false),
  })

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0]
      if (file.size > maxFileSizeMb * 1024 * 1024) {
        toast({
          title: "File too large",
          description: `Please upload a file smaller than ${maxFileSizeMb}MB.`,
          variant: "destructive",
        })
        return
      }
      if (!acceptedFileTypes.some((type) => file.name.endsWith(type))) {
        toast({
          title: "Invalid file type",
          description: `Please upload a file of type: ${acceptedFileTypes.join(", ")}.`,
          variant: "destructive",
        })
        return
      }
      await onFileUpload(file)
    }
  }

  const handleSampleData = async () => {
    if (!sampleCsvUrl) return
    try {
      const response = await fetch(sampleCsvUrl)
      if (!response.ok) {
        throw new Error(`Failed to fetch sample data: ${response.statusText}`)
      }
      const blob = await response.blob()
      const file = new File([blob], "sample-portfolio.csv", { type: "text/csv" })
      await onFileUpload(file)
    } catch (error: any) {
      toast({
        title: "Error loading sample data",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle>Upload Your Portfolio</CardTitle>
        <CardDescription>Upload a CSV file to analyze your investment portfolio.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div
          {...getRootProps()}
          className={`flex flex-col items-center justify-center rounded-md border-2 border-dashed p-6 text-center transition-colors ${
            isDragging
              ? "border-primary bg-muted"
              : "border-gray-300 hover:border-gray-400 dark:border-gray-700 dark:hover:border-gray-600"
          } cursor-pointer`}
        >
          <Input {...getInputProps()} id="file-upload" type="file" className="sr-only" onChange={handleFileSelect} />
          {isLoading ? (
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          ) : (
            <UploadCloud className="h-8 w-8 text-gray-500 dark:text-gray-400" />
          )}
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {isLoading ? "Processing..." : "Drag & drop your CSV here, or click to select"}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500">
            Max file size: {maxFileSizeMb}MB. Accepted: {acceptedFileTypes.join(", ")}
          </p>
        </div>
        <div className="relative flex items-center justify-center text-xs uppercase text-gray-600 dark:text-gray-400">
          <span className="bg-background px-2">Or</span>
        </div>
        <Label htmlFor="file-upload" className="sr-only">
          Upload file
        </Label>
        <Button onClick={() => document.getElementById("file-upload")?.click()} disabled={isLoading} className="w-full">
          <FileText className="mr-2 h-4 w-4" />
          Choose File
        </Button>
        {sampleCsvUrl && (
          <Button onClick={handleSampleData} disabled={isLoading} variant="outline" className="w-full bg-transparent">
            Load Sample Data
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
