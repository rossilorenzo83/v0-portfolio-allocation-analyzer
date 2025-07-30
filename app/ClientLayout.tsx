"use client" // This component needs to be a client component to use useEffect

import type React from "react"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
// Removed import for configurePDFJS as PDF functionality is removed.

export default function ClientLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Removed useEffect hook that called configurePDFJS.

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
      <Toaster />
    </ThemeProvider>
  )
}
