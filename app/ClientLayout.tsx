"use client" // This component needs to be a client component to use useEffect

import type React from "react"
import { useEffect } from "react" // Import useEffect
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { configurePDFJS } from "@/lib/pdf-config" // Import configurePDFJS
import { DeleteFile } from "@/components/DeleteFile" // Import DeleteFile

export default function ClientLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  useEffect(() => {
    // Configure PDF.js only on the client side after the component mounts
    configurePDFJS()
  }, [])

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
      <DeleteFile />
      <Toaster />
    </ThemeProvider>
  )
}
