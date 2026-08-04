import type React from "react"
import type { Metadata } from "next"
import { Archivo } from "next/font/google"
import { ClerkProvider } from "@clerk/nextjs"
import "./globals.css"
import "./design-system.css"
import "./theme.css"

import ClerkTokenBridge from "@/components/clerk-token-bridge"

// Modernist is set entirely in Archivo. theme.css points both font roles at
// this variable, so no page hard-codes a family name.
const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "600", "800"],
  variable: "--font-archivo",
  display: "swap",
})

export const metadata: Metadata = {
  title: "DocuChat AI",
  description: "Chat with your documents using AI",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className={archivo.variable}>
        <body className={`${archivo.className} min-h-screen`}>
          <ClerkTokenBridge />
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}
