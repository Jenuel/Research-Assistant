"use client"

import { create } from "zustand"
import { useDocumentStore } from "./document-store"
import axios from "axios";

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

    const selectedFiles = useDocumentStore.getState().uploadedFiles.filter((file) => file.checked)
    const selectedIds = selectedFiles.map((file) => file.id)
    
    try {
      console.log(selectedIds)
      const response = await axios.post("http://localhost:7000/api/rag/generate", {
        query: currentMessage,
        ids: selectedIds
      });

      console.log(response)

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: response.data.response,
        timestamp: new Date(),
      }
      
      set((state) => ({
        chatMessages: [...state.chatMessages, assistantMessage],
        isLoading: false,
      }))
    } catch (error) {
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: "Something went wrong with the server. Please try again later",
        timestamp: new Date(),
      }

      console.error("An error have occured:", error)

      set((state) => ({
        chatMessages: [...state.chatMessages, assistantMessage],
        isLoading: false,
      }))
    }
  },
}))
