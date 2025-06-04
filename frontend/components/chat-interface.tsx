"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { MessageSquare, Send, Brain, Sparkles } from "lucide-react"
import { useChatStore } from "@/lib/chat-store"

export default function ChatInterface() {
  const { chatMessages, currentMessage, setCurrentMessage, handleSendMessage, isLoading } = useChatStore()

  return (
    <Card className="bg-gray-800/50 border-gray-700 h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-white flex items-center">
          <MessageSquare className="h-5 w-5 mr-2 text-purple-400" />
          AI Document Chat
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-6">
        {/* Chat Messages */}
        <ScrollArea className="flex-1 mb-4">
          {chatMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-4 rounded-full mb-6">
                <Brain className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Start a Conversation</h3>
              <p className="text-gray-400 mb-6 max-w-md">
                Ask questions about your documents and get intelligent answers powered by AI
              </p>
              <div className="bg-gray-700/50 rounded-lg p-4 max-w-sm">
                <p className="text-sm text-gray-300 mb-3 font-medium">Try asking:</p>
                <ul className="text-sm text-gray-400 space-y-2">
                  <li className="flex items-center">
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-2"></span>
                    "Summarize the main points"
                  </li>
                  <li className="flex items-center">
                    <span className="w-1.5 h-1.5 bg-purple-400 rounded-full mr-2"></span>
                    "What are the key findings?"
                  </li>
                  <li className="flex items-center">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full mr-2"></span>
                    "Extract important dates"
                  </li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {chatMessages.map((message) => (
                <div key={message.id} className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`flex items-start space-x-3 max-w-[80%]`}>
                    {message.type === "assistant" && (
                      <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-2 rounded-full flex-shrink-0">
                        <Brain className="h-4 w-4 text-white" />
                      </div>
                    )}
                    <div
                      className={`p-4 rounded-2xl ${
                        message.type === "user"
                          ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white"
                          : "bg-gray-700/50 text-gray-100 border border-gray-600"
                      }`}
                    >
                      <p className="text-sm leading-relaxed">{message.content}</p>
                      <p className={`text-xs mt-2 ${message.type === "user" ? "text-blue-100" : "text-gray-400"}`}>
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                    {message.type === "user" && (
                      <div className="bg-gray-600 p-2 rounded-full flex-shrink-0">
                        <MessageSquare className="h-4 w-4 text-gray-300" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex items-start space-x-3">
                    <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-2 rounded-full">
                      <Sparkles className="h-4 w-4 text-white animate-pulse" />
                    </div>
                    <div className="bg-gray-700/50 border border-gray-600 p-4 rounded-2xl">
                      <p className="text-sm text-gray-300">Analyzing your documents...</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        <Separator className="mb-4 bg-gray-700" />

        {/* Message Input */}
        <div className="flex space-x-3">
          <Input
            placeholder="Ask anything about your documents..."
            value={currentMessage}
            onChange={(e) => setCurrentMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            disabled={isLoading}
            className="flex-1 bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-400 focus:border-blue-500"
          />
          <Button
            onClick={handleSendMessage}
            disabled={isLoading || !currentMessage.trim()}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 px-6"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
