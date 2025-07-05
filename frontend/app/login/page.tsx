"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { MessageSquare, Upload, Sparkles, Brain, Shield } from "lucide-react"
import axios from "axios"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setMounted(true)

    const verifyToken = async () => {
      try {
        const response = await axios.get("http://localhost:5000/auth/verify", { 
          withCredentials: true,
        });

        if (response.status === 200) {
          router.push("/dashboard");
        }
      } catch (error) {
        console.error("Token verification failed:", error);
      }
    }
    verifyToken();
  }, [router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      if (email && password) {
        const response = await axios.post(
          "http://localhost:5000/login",
          { email, password },
          {
            withCredentials: true,
            headers: {
              "Content-Type": "application/json"
            }
          }
        )
        if (response.status === 200) {
          router.push("/dashboard")
        }
        else {
          setError("Invalid email or password")
        }
      } else {
        setError("Please enter both email and password")
      }
    } catch (err) {
      setError("Authentication failed. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-4 rounded-full w-16 h-16 mx-auto mb-6">
            <Brain className="h-8 w-8 text-white mx-auto mt-1" />
          </div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex">
      {/* Left Side - App Info */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-12 text-white">
        <div className="max-w-md">
          <div className="flex items-center mb-8">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-3 rounded-xl mr-4">
              <Brain className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              DocuChat AI
            </h1>
          </div>

          <h2 className="text-4xl font-bold mb-6 leading-tight">
            Transform Your Documents Into
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              {" "}
              Intelligent Conversations
            </span>
          </h2>

          <p className="text-xl text-gray-300 mb-8">
            Upload your PDFs and Word documents, then chat with them using advanced AI. Get instant answers, summaries,
            and insights from your document library.
          </p>

          <div className="space-y-4">
            <div className="flex items-center">
              <div className="bg-blue-500/20 p-2 rounded-lg mr-4">
                <Upload className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold">Smart Document Upload</h3>
                <p className="text-gray-400 text-sm">Supports PDF and DOCX formats with instant processing</p>
              </div>
            </div>

            <div className="flex items-center">
              <div className="bg-purple-500/20 p-2 rounded-lg mr-4">
                <MessageSquare className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <h3 className="font-semibold">AI-Powered Chat</h3>
                <p className="text-gray-400 text-sm">Ask questions and get contextual answers from your documents</p>
              </div>
            </div>

            <div className="flex items-center">
              <div className="bg-green-500/20 p-2 rounded-lg mr-4">
                <Shield className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <h3 className="font-semibold">Secure & Private</h3>
                <p className="text-gray-400 text-sm">
                  Your documents are processed securely with enterprise-grade encryption
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md bg-gray-800/50 border-gray-700 backdrop-blur-sm">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4 lg:hidden">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-3 rounded-xl">
                <Brain className="h-8 w-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-white">Welcome Back</CardTitle>
            <CardDescription className="text-gray-400">
              Sign in to access your intelligent document workspace
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-200">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-400 focus:border-blue-500"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-200">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-400 focus:border-blue-500"
                  required
                />
              </div>
              {error && (
                <Alert variant="destructive" className="bg-red-900/50 border-red-700">
                  <AlertDescription className="text-red-200">{error}</AlertDescription>
                </Alert>
              )}
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-2.5"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <Sparkles className="h-4 w-4 mr-2 animate-spin" />
                    Signing in...
                  </div>
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-400">Demo credentials: Use any email and password</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
