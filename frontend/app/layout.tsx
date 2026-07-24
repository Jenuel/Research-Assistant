import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { ClerkProvider } from "@clerk/nextjs"
import "./globals.css"

import ClerkTokenBridge from "@/components/clerk-token-bridge"

const inter = Inter({ subsets: ["latin"] })

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
      <html lang="en">
        <body className={`${inter.className} min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900`}>
          <ClerkTokenBridge />
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}
