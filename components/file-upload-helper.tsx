"use client"

import type React from "react"

import { useState } from "react"
import { Upload, FileText, Copy, CheckCircle, AlertTriangle, Info } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface FileUploadHelperProps {
  onFileUpload: (file: File) => void
  onTextSubmit: (text: string) => void
  isLoading: boolean
  error: string | null
}

export function FileUploadHelper({ onFileUpload, onTextSubmit, isLoading, error }: FileUploadHelperProps) {
  const [pastedText, setPastedText] = useState("")
  const [showCopyInstructions, setShowCopyInstructions] = useState(false)

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      onFileUpload(file)
    }
  }

  const handleTextSubmit = () => {
    if (pastedText.trim()) {
      onTextSubmit(pastedText.trim())
    }
  }

  const sampleText = `Aperçu du compte
Valeur totale du portefeuille CHF 889'528.75
Solde espèces CHF 5'129.55
Valeur des titres CHF 877'853.96

Positions

Actions
AAPL Apple Inc. 100 150.00 USD 15'000.00
MSFT Microsoft Corporation 75 330.00 USD 24'750.00
NESN Nestlé SA 200 120.00 CHF 24'000.00

ETF
VWRL Vanguard FTSE All-World UCITS ETF 500 89.96 CHF 44'980.00
IS3N iShares Core MSCI World UCITS ETF 300 30.50 CHF 9'150.00

Obligations
US Treasury Bond 10 1000.00 USD 10'000.00`

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Portfolio Data
        </CardTitle>
        <CardDescription>Choose the best method to upload your Swiss bank portfolio statement</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="text" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="text">📝 Paste Text (Recommended)</TabsTrigger>
            <TabsTrigger value="file">📄 File Upload</TabsTrigger>
            <TabsTrigger value="sample">🧪 Try Sample</TabsTrigger>
          </TabsList>

          <TabsContent value="text" className="space-y-4">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>✅ Recommended Method</strong> - Works with 100% of PDF files and is fastest!
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div>
                <label htmlFor="portfolio-text" className="block text-sm font-medium mb-2">
                  Paste your portfolio data here:
                </label>
                <Textarea
                  id="portfolio-text"
                  placeholder="Paste your portfolio statement text here..."
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  rows={12}
                  className="w-full font-mono text-sm"
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleTextSubmit} disabled={!pastedText.trim() || isLoading} className="flex-1">
                  {isLoading ? "Analyzing..." : "Analyze Portfolio"}
                </Button>
                <Button variant="outline" onClick={() => setShowCopyInstructions(!showCopyInstructions)}>
                  <Copy className="h-4 w-4 mr-2" />
                  How to Copy
                </Button>
              </div>

              {showCopyInstructions && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <strong>📋 How to copy text from your PDF:</strong>
                    <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
                      <li>Open your portfolio PDF file in any PDF viewer</li>
                      <li>
                        Select all text: <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Ctrl+A</kbd> (or{" "}
                        <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Cmd+A</kbd> on Mac)
                      </li>
                      <li>
                        Copy the text: <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Ctrl+C</kbd> (or{" "}
                        <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Cmd+C</kbd> on Mac)
                      </li>
                      <li>
                        Paste here: <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Ctrl+V</kbd> (or{" "}
                        <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Cmd+V</kbd> on Mac)
                      </li>
                      <li>Click "Analyze Portfolio"</li>
                    </ol>
                    <div className="mt-3 p-2 bg-green-50 rounded text-sm">
                      <p className="text-green-700 font-medium">✅ Why this method works best:</p>
                      <ul className="text-green-600 text-xs mt-1 space-y-1">
                        <li>• No browser compatibility issues</li>
                        <li>• Works with all PDF formats</li>
                        <li>• Faster processing</li>
                        <li>• No file size limits</li>
                      </ul>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </TabsContent>

          <TabsContent value="file" className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>⚠️ PDF Upload Notice:</strong> Due to browser limitations, PDF parsing may fail. If you encounter
                errors, please use the "Paste Text" method instead.
              </AlertDescription>
            </Alert>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
              <input
                type="file"
                accept=".pdf,.txt,.csv"
                onChange={handleFileChange}
                className="hidden"
                id="portfolio-upload"
                disabled={isLoading}
              />
              <label htmlFor="portfolio-upload" className="cursor-pointer">
                <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-lg font-medium">Click to upload file</p>
                <p className="text-sm text-muted-foreground">PDF, TXT, or CSV files supported</p>
                <p className="text-xs text-muted-foreground mt-2">Max file size: 10MB</p>
              </label>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>📄 File Upload Tips:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                  <li>
                    <strong>TXT files:</strong> Most reliable, always work
                  </li>
                  <li>
                    <strong>PDF files:</strong> May have browser compatibility issues
                  </li>
                  <li>
                    <strong>CSV files:</strong> Good for exported data
                  </li>
                  <li>
                    <strong>If PDF fails:</strong> Use the "Paste Text" method instead
                  </li>
                </ul>
                <div className="mt-2 p-2 bg-blue-50 rounded text-xs">
                  <p className="text-blue-700 font-medium">💡 Pro Tip:</p>
                  <p className="text-blue-600">Save your PDF as a .txt file for guaranteed compatibility!</p>
                </div>
              </AlertDescription>
            </Alert>
          </TabsContent>

          <TabsContent value="sample" className="space-y-4">
            <div className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>🧪 Try the analyzer with sample data</strong>
                  <p className="mt-1">
                    This demonstrates all features using realistic Swiss portfolio data from Swissquote format.
                  </p>
                </AlertDescription>
              </Alert>

              <div className="bg-gray-50 p-4 rounded-lg border">
                <h4 className="text-sm font-medium mb-2">Sample Portfolio Statement:</h4>
                <pre className="text-xs text-gray-600 whitespace-pre-wrap overflow-x-auto">{sampleText}</pre>
              </div>

              <Button onClick={() => onTextSubmit(sampleText)} disabled={isLoading} className="w-full">
                {isLoading ? "Analyzing Sample..." : "Analyze Sample Portfolio"}
              </Button>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Sample includes:</strong>
                  <ul className="list-disc list-inside mt-1 text-sm">
                    <li>Swiss and US stocks (AAPL, MSFT, NESN)</li>
                    <li>Global ETFs (VWRL, IS3N)</li>
                    <li>Multi-currency portfolio (CHF, USD)</li>
                    <li>Real-time API integration</li>
                    <li>ETF look-through analysis</li>
                    <li>Bonds and fixed income</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </div>
          </TabsContent>
        </Tabs>

        {error && (
          <Alert className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Error:</strong> {error}
              {error.includes("PDF") && (
                <div className="mt-2 p-2 bg-yellow-50 rounded text-sm">
                  <p className="text-yellow-700 font-medium">💡 Quick Fix:</p>
                  <p className="text-yellow-600">Switch to the "Paste Text" tab for guaranteed success!</p>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
