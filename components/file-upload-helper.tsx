"use client"

import type React from "react"
import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { UploadCloud, Clipboard } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

interface FileUploadHelperProps {
  onFileChange: (file: File | string | null) => void
  isLoading: boolean
}

export function FileUploadHelper({ onFileChange, isLoading }: FileUploadHelperProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [textInput, setTextInput] = useState<string>("")
  const [activeTab, setActiveTab] = useState<"upload" | "paste">("upload")

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0]
        setSelectedFile(file)
        setTextInput("") // Clear text input if file is uploaded
        onFileChange(file)
        toast({
          title: "File selected",
          description: `${file.name} (${(file.size / 1024).toFixed(2)} KB) ready for analysis.`,
        })
      }
    },
    [onFileChange],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/pdf": [".pdf"],
      "text/plain": [".txt"],
    },
    multiple: false,
    disabled: isLoading,
  })

  const handleTextInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTextInput(e.target.value)
    setSelectedFile(null) // Clear file if text is entered
    onFileChange(e.target.value)
  }

  const handleClear = () => {
    setSelectedFile(null)
    setTextInput("")
    onFileChange(null)
    toast({
      title: "Input cleared",
      description: "Ready for new file upload or text paste.",
    })
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center">Upload or Paste Portfolio Data</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex justify-center mb-4 space-x-2">
          <Button
            variant={activeTab === "upload" ? "default" : "outline"}
            onClick={() => setActiveTab("upload")}
            disabled={isLoading}
          >
            <UploadCloud className="mr-2 h-4 w-4" /> Upload File
          </Button>
          <Button
            variant={activeTab === "paste" ? "default" : "outline"}
            onClick={() => setActiveTab("paste")}
            disabled={isLoading}
          >
            <Clipboard className="mr-2 h-4 w-4" /> Paste Text
          </Button>
        </div>

        {activeTab === "upload" && (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed p-6 rounded-lg text-center cursor-pointer transition-colors ${
              isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"
            } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <input {...getInputProps()} disabled={isLoading} />
            <UploadCloud className="mx-auto h-12 w-12 text-gray-400 mb-3" />
            {isDragActive ? (
              <p className="text-gray-600">Drop the files here ...</p>
            ) : (
              <p className="text-gray-600">Drag 'n' drop a CSV, PDF, or TXT file here, or click to select one</p>
            )}
            {selectedFile && <p className="mt-2 text-sm text-green-600">Selected file: {selectedFile.name}</p>}
          </div>
        )}

        {activeTab === "paste" && (
          <div className="grid gap-2">
            <Label htmlFor="portfolio-text">Paste your portfolio data here</Label>
            <Textarea
              id="portfolio-text"
              placeholder="Paste your CSV or PDF text content here..."
              value={textInput}
              onChange={handleTextInputChange}
              rows={10}
              className="resize-y"
              disabled={isLoading}
            />
          </div>
        )}

        <div className="mt-4 flex justify-end space-x-2">
          <Button onClick={handleClear} variant="outline" disabled={isLoading || (!selectedFile && !textInput)}>
            Clear Input
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
