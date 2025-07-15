"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Brain, LogOut } from "lucide-react"
import { useDocumentStore } from "@/lib/document-store"
import axios from 'axios';

export default function DashboardHeader() {
  const router = useRouter()
  const { uploadedFiles, userEmail } = useDocumentStore()

  const handleLogout = () => {
    const logoutUser = async () => {
      try {
        await axios.post("http://localhost:5000/auth/logout", {}, {
          withCredentials: true
        })

        router.push("/login")
      } catch (error) {
        console.error("An error has occured in logout:", error)
      }
    }

    logoutUser();
  }

  return (
    <header className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 sticky top-0 z-50">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-2 rounded-lg mr-3">
              <Brain className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              DocuChat AI
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <Badge variant="secondary" className="bg-gray-700 text-gray-200 hidden sm:inline-flex">
              {uploadedFiles.length} documents
            </Badge>
            <span className="text-sm text-gray-300 hidden md:inline">Welcome, {userEmail}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              <LogOut className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
