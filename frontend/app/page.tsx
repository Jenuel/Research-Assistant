"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Brain, Sparkles } from "lucide-react"

export default function HomePage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if user is authenticated
    const checkAuth = () => {
      const isAuthenticated = localStorage.getItem("isAuthenticated")

      if (isAuthenticated) {
        router.push("/dashboard")
      } else {
        router.push("/login")
      }
      setIsLoading(false)
    }

    // Small delay to prevent flash
    setTimeout(checkAuth, 500)
  }, [router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-4 rounded-full w-16 h-16 mx-auto mb-6">
            <Brain className="h-8 w-8 text-white mx-auto mt-1" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-4 flex items-center justify-center">
            <Sparkles className="h-6 w-6 mr-2 animate-pulse text-blue-400" />
            DocuChat AI
          </h1>
          <p className="text-gray-400">Initializing your intelligent document workspace...</p>
        </div>
      </div>
    )
  }

  return null
}
