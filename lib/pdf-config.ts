// PDF.js configuration without external dependencies

export const PDF_OPTIONS = {
  format: "A4",
  printBackground: true,
  margin: {
    top: "20mm",
    right: "20mm",
    bottom: "20mm",
    left: "20mm",
  },
}

export const PDF_WORKER_URL = `https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js`

export function configurePDFJS() {
  // Only configure if we're in the browser
  if (typeof window === "undefined") return

  // Try to configure PDF.js without external worker
  try {
    import("pdfjs-dist")
      .then((pdfjsLib) => {
        // Disable worker to avoid CDN issues
        pdfjsLib.GlobalWorkerOptions.workerSrc = ""

        // Use a simple inline worker
        const workerCode = `
        // Minimal PDF.js worker
        self.onmessage = function(e) {
          // Simple message handling
          self.postMessage({ type: 'ready' });
        };
      `

        const blob = new Blob([workerCode], { type: "application/javascript" })
        const workerUrl = URL.createObjectURL(blob)

        pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

        console.log("PDF.js configured with local worker")
      })
      .catch((error) => {
        console.warn("PDF.js configuration failed:", error)
      })
  } catch (error) {
    console.warn("PDF.js not available:", error)
  }
}
