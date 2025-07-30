"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, UploadCloud, FileText, XCircle } from "lucide-react"
import { parsePortfolioCsv, type SwissPortfolioData } from "@/portfolio-parser" // Import parsePortfolioCsv

interface FileUploadHelperProps {
  onFileUpload: (data: SwissPortfolioData) => void
  onLoadingChange: (isLoading: boolean) => void
  onError: (message: string) => void
}

export function FileUploadHelper({ onFileUpload, onLoadingChange, onError }: FileUploadHelperProps) {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const uploadedFile = acceptedFiles[0]
      if (uploadedFile.type === "text/csv" || uploadedFile.name.endsWith(".csv")) {
        setFile(uploadedFile)
        setError(null)
      } else {
        setError("Invalid file type. Please upload a CSV file.")
        setFile(null)
      }
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
    },
    multiple: false,
  })

  const handleParseFile = async () => {
    if (!file) {
      setError("Please select a CSV file to upload.")
      return
    }

    setLoading(true)
    onLoadingChange(true)
    setError(null)

    try {
      const fileContent = await file.text()
      const parsedData = parsePortfolioCsv(fileContent) // Use parsePortfolioCsv
      onFileUpload(parsedData)
    } catch (e: any) {
      console.error("Error parsing file:", e)
      const errorMessage = e.message || "Failed to parse file. Please check the format."
      setError(errorMessage)
      onError(errorMessage)
    } finally {
      setLoading(false)
      onLoadingChange(false)
    }
  }

  const handleRemoveFile = () => {
    setFile(null)
    setError(null)
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
            <Button variant="ghost" size="icon" onClick={handleRemoveFile}>
              <XCircle className="w-4 h-4 text-gray-500" />
            </Button>
          </div>
        )}

        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

        <Button onClick={handleParseFile} disabled={!file || loading} className="w-full">
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {loading ? "Parsing..." : "Analyze Portfolio"}
        </Button>

        <div className="text-center text-sm text-gray-500 mt-4">
          <p>Supported formats: CSV (.csv)</p>
          <p>For best results, ensure your CSV includes columns like Symbol, Quantity, Price, and Currency.</p>
        </div>
      </CardContent>
    </Card>
  )
}
