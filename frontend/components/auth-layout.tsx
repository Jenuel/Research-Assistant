import type React from "react"
import { Brain, MessageSquare, Shield, Upload } from "lucide-react"


export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex">
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
                <h3 className="font-semibold">Secure &amp; Private</h3>
                <p className="text-gray-400 text-sm">
                  Your documents are processed securely with enterprise-grade encryption
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>


      <div className="w-full lg:w-1/2 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
        {children}
      </div>
    </div>
  )
}
