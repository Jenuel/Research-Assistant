"use client"

import { create } from "zustand"
import { useDocumentStore } from "./document-store"
import { isAxiosError } from "axios";

import { ragApi } from "./api";

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
      const response = await ragApi.post("/api/rag/generate", {
        query: currentMessage,
        ids: selectedIds
      });

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
      const status = isAxiosError(error) ? error.response?.status : undefined

      const content =
        status === 401
          ? "Your session has expired. Please sign in again."
          : status === 429
            ? "You have sent too many requests. Please wait a moment and try again."
            : "Something went wrong with the server. Please try again later"

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content,
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
