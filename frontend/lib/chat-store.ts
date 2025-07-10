"use client"

import { create } from "zustand"
import { useDocumentStore } from "./document-store"

export interface ChatMessage {
  id: string
  type: "user" | "assistant"
  content: string
  timestamp: Date
}

interface ChatState {
  chatMessages: ChatMessage[]
  currentMessage: string
  isLoading: boolean
  setCurrentMessage: (message: string) => void
  handleSendMessage: () => void
}

export const useChatStore = create<ChatState>((set, get) => ({
  chatMessages: [],
  currentMessage: "",
  isLoading: false,

  setCurrentMessage: (message) => set({ currentMessage: message }),

  handleSendMessage: async () => {
    const { currentMessage } = get()

    if (!currentMessage.trim()) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: "user",
      content: currentMessage,
      timestamp: new Date(),
    }

    set((state) => ({
      chatMessages: [...state.chatMessages, userMessage],
      currentMessage: "",
      isLoading: true,
    }))

    // Simulate backend response
    setTimeout(() => {
      const selectedFiles = useDocumentStore.getState().uploadedFiles.filter((file) => file.checked)

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: `I've analyzed your query "${currentMessage}" ${
          selectedFiles.length > 0
            ? `based on ${selectedFiles.length} selected document(s): ${selectedFiles.map((f) => f.name).join(", ")}`
            : "but no documents are currently selected"
        }. This is a simulated response from the backend that would provide intelligent insights from your documents.`,
        timestamp: new Date(),
      }

      set((state) => ({
        chatMessages: [...state.chatMessages, assistantMessage],
        isLoading: false,
      }))
    }, 1500)
  },
}))
