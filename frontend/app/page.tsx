"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@clerk/nextjs"
import { Brain, Sparkles } from "lucide-react"

export default function HomePage() {
  const router = useRouter()
  const { isLoaded, isSignedIn } = useAuth()

  useEffect(() => {
    if (!isLoaded) return

    router.replace(isSignedIn ? "/dashboard" : "/login")
  }, [isLoaded, isSignedIn, router])

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
