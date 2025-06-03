"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import DashboardHeader from "@/components/dashboard-header"
import DocumentList from "@/components/document-list"
import ChatInterface from "@/components/chat-interface"
import { useDocumentStore } from "@/lib/document-store"
import { Brain } from "lucide-react"
import { getLocalStorage } from "@/lib/utils"

export default function DashboardPage() {
  const router = useRouter()
  const { setUserEmail } = useDocumentStore()
  const [mounted, setMounted] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    setMounted(true)

    // Check authentication
    const authStatus = getLocalStorage("isAuthenticated")
    const email = getLocalStorage("userEmail")

    if (!authStatus) {
      router.push("/login")
      return
    }

    setIsAuthenticated(true)
    setUserEmail(email || "")
  }, [router, setUserEmail])

  if (!mounted || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-4 rounded-full w-16 h-16 mx-auto mb-6">
            <Brain className="h-8 w-8 text-white mx-auto mt-1" />
          </div>
          <p className="text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <DashboardHeader />

      <main className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-120px)]">
          {/* Documents Section */}
          <div className="flex flex-col">
            <DocumentList />
          </div>

          {/* Chat Section */}
          <div className="flex flex-col">
            <ChatInterface />
          </div>
        </div>
      </main>
    </div>
  )
}
