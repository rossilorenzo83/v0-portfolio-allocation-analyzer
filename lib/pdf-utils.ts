// PDF parsing utilities with local worker and better error handling

import * as pdfjs from "pdfjs-dist"
import { PDF_WORKER_URL } from "./pdf-config"

pdfjs.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL

export async function safePDFExtraction(file: File): Promise<string> {
  // Try multiple approaches for PDF text extraction in order of reliability

  // Approach 1: Try as text file first (for .txt files)
  if (file.type === "text/plain" || file.name.endsWith(".txt")) {
    try {
      const text = await file.text()
      if (text && text.trim().length > 0) {
        console.log("Successfully read as text file")
        return text
      }
    } catch (error) {
      console.warn("Text extraction failed:", error)
    }
  }

  // Approach 2: Try reading PDF as text (some PDFs work this way)
  try {
    const text = await file.text()
    if (text && text.trim().length > 0 && !text.startsWith("%PDF")) {
      console.log("Successfully read PDF as text")
      return text
    }
  } catch (error) {
    console.warn("PDF as text extraction failed:", error)
  }

  // Approach 3: PDF.js with local worker (no CDN dependency)
  try {
    return await extractWithLocalPDFJS(file)
  } catch (error) {
    console.warn("PDF.js extraction failed:", error)
  }

  // Approach 4: Binary text extraction
  try {
    return await extractTextFromBinary(file)
  } catch (error) {
    console.warn("Binary text extraction failed:", error)
  }

  // Approach 5: FileReader extraction
  try {
    return await extractWithFileReader(file)
  } catch (error) {
    console.warn("FileReader extraction failed:", error)
  }

  // Final fallback with helpful error message
  throw new Error(
    "Unable to extract text from the PDF file. Please try:\n\n" +
      "📋 **Copy-Paste Method (Recommended):**\n" +
      "1. Open your PDF file\n" +
      "2. Select all text (Ctrl+A or Cmd+A)\n" +
      "3. Copy the text (Ctrl+C or Cmd+C)\n" +
      "4. Use the 'Paste Text' tab in the upload area\n" +
      "5. Paste and click 'Analyze Portfolio'\n\n" +
      "📄 **Alternative:**\n" +
      "• Save your PDF as a text file (.txt)\n" +
      "• Upload the .txt file instead\n\n" +
      "✅ This ensures 100% compatibility with all PDF formats.",
  )
}

async function extractWithLocalPDFJS(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer()
    console.log("Starting PDF.js extraction with local worker...")

    const pdf = await loadPdf(arrayBuffer)
    console.log(`PDF loaded successfully. Pages: ${pdf.numPages}`)

    return await getPdfText(pdf)
  } catch (error) {
    console.error("PDF extraction failed:", error)
    throw new Error("Text extraction failed: " + error.message)
  }
}

// Alternative extraction method using different approach
async function extractTextFromBinary(file: File): Promise<string> {
  try {
    console.log("Attempting binary text extraction...")

    // Try to read the file as ArrayBuffer and look for text patterns
    const arrayBuffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)

    // Convert to string and look for readable text
    let text = ""
    let consecutiveReadableChars = 0
    const minConsecutiveChars = 3

    for (let i = 0; i < uint8Array.length; i++) {
      const char = uint8Array[i]

      // Check for printable ASCII characters and common whitespace
      if ((char >= 32 && char <= 126) || char === 10 || char === 13 || char === 9) {
        text += String.fromCharCode(char)
        consecutiveReadableChars++
      } else if (char >= 160 && char <= 255) {
        // Extended ASCII for European characters
        text += String.fromCharCode(char)
        consecutiveReadableChars++
      } else {
        // Non-printable character
        if (consecutiveReadableChars >= minConsecutiveChars) {
          text += " " // Add space to separate words
        }
        consecutiveReadableChars = 0
      }
    }

    // Clean up the extracted text
    text = text
      .replace(/\s+/g, " ") // Replace multiple whitespace with single space
      .replace(/[^\w\s\-.,;:()[\]{}'"€$£¥%]/g, " ") // Keep common characters
      .trim()

    // Filter out lines that are too short or look like binary data
    const lines = text.split("\n").filter((line) => {
      const cleanLine = line.trim()
      return cleanLine.length > 5 && !/^[0-9a-f\s]+$/i.test(cleanLine)
    })

    const cleanedText = lines.join("\n")

    if (cleanedText.length < 100) {
      throw new Error("Insufficient readable text extracted from binary")
    }

    console.log("Binary text extraction successful, text length:", cleanedText.length)
    return cleanedText
  } catch (error) {
    console.error("Binary extraction failed:", error)
    throw error
  }
}

// Fallback method using FileReader
async function extractWithFileReader(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (event) => {
      try {
        const result = event.target?.result as string
        if (result && result.length > 10) {
          console.log("FileReader extraction successful")
          resolve(result)
        } else {
          reject(new Error("No content extracted with FileReader"))
        }
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => {
      reject(new Error("FileReader failed to read file"))
    }

    // Try reading as text first
    reader.readAsText(file, "utf-8")
  })
}

// Example placeholder for a server-side PDF generation function
export async function generatePdfFromHtml(htmlContent: string): Promise<Buffer> {
  // In a real application, you would use a library like Puppeteer or Playwright
  // to render HTML to PDF on the server.
  // This is a placeholder and won't work directly in the browser or without a server setup.
  console.warn("PDF generation is a server-side operation. This function is a placeholder.")
  console.log("Simulating PDF generation for HTML content (first 100 chars):", htmlContent.substring(0, 100))

  // Return a dummy buffer for demonstration purposes
  return Buffer.from("This is a dummy PDF content generated from HTML.")
}

export async function loadPdf(file: File | ArrayBuffer | string): Promise<pdfjs.PDFDocumentProxy> {
  const loadingTask = pdfjs.getDocument(
    typeof file === "string" ? file : file instanceof File ? await file.arrayBuffer() : file,
  )
  return loadingTask.promise
}

export async function getPdfText(pdf: pdfjs.PDFDocumentProxy): Promise<string> {
  let fullText = ""
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const textContent = await page.getTextContent()
    fullText += textContent.items.map((item: any) => item.str).join(" ") + "\n"
  }
  return fullText
}
