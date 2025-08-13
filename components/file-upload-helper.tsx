"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { UploadCloud, FileText, XCircle } from "lucide-react"


interface FileUploadHelperProps {
  onFileChange: (file: File | null) => void
}

export function FileUploadHelper({ onFileChange }: FileUploadHelperProps) {
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const uploadedFile = acceptedFiles[0]
      if (uploadedFile.type === "text/csv" || uploadedFile.name.endsWith(".csv")) {
        setFile(uploadedFile)
        setError(null)
        onFileChange(uploadedFile)
      } else {
        setError("Invalid file type. Please upload a CSV file.")
        setFile(null)
        onFileChange(null)
      }
    }
  }, [onFileChange])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
    },
    multiple: false,
  })



  const handleRemoveFile = () => {
    setFile(null)
    setError(null)
    onFileChange(null)
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Upload Portfolio CSV</CardTitle>
        <CardDescription>Drag and drop your CSV file here, or click to select.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          {...getRootProps()}
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 transition-colors"
        >
          <input {...getInputProps()} />
          {isDragActive ? (
            <p className="text-gray-600">Drop the CSV file here ...</p>
          ) : (
            <div className="flex flex-col items-center justify-center space-y-2">
              <UploadCloud className="w-12 h-12 text-gray-400" />
              <p className="text-gray-600">Drag 'n' drop a CSV file here, or click to select one</p>
              <Button type="button" variant="outline" className="mt-2 bg-transparent">
                Select File
              </Button>
            </div>
          )}
        </div>

        {file && (
          <div className="flex items-center justify-between p-3 border rounded-md bg-gray-50">
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-blue-500" />
              <span className="text-sm font-medium">{file.name}</span>
            </div>
            <Button aria-label="Remove file" variant="ghost" size="icon" onClick={handleRemoveFile}>
              <XCircle className="w-4 h-4 text-gray-500" />
            </Button>
          </div>
        )}

        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

        <div className="text-center text-sm text-gray-500 mt-4">
          <p>Supported formats: CSV (.csv)</p>
          <p>For best results, ensure your CSV includes columns like Symbol, Quantity, Price, and Currency.</p>
        </div>
      </CardContent>
    </Card>
  )
}
