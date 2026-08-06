"use client"

import { create } from "zustand"

import { ragApi } from "@/lib/api"
import { describeFailure, type Failure } from "@/lib/errors"
import { selectedDocuments, useDocuments } from "@/lib/stores/documents"

/**
 * The RAG service returns this exact string when retrieval came back empty —
 * see `generate_response` in rag_service/app/controller/rag_controller.py. It
 * is not an error and not really an answer, so it gets its own presentation.
 * Keep the two in step.
 */
export const NO_MATCH_ANSWER =
  "I could not find any relevant content in the selected documents to answer that."

export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  text: string
  at: Date
  pending?: boolean
  failure?: Failure
  /** The question this assistant turn is answering, so Retry can resend it. */
  question?: string
}

export interface Quota {
  limit: number
  remaining: number
}

interface ChatState {
  messages: ChatMessage[]
  draft: string
  sending: boolean
  /** Which answer's Copy button is currently showing "Copied". */
  copied: string | null
  /**
   * Read from X-RateLimit-* when the service exposes them to the browser. Null
   * until then, and the quota line stays hidden rather than inventing one.
   */
  quota: Quota | null

  setDraft: (draft: string) => void
  send: () => void
  retry: (messageId: string) => void
  copyAnswer: (message: ChatMessage) => void
  reset: () => void
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function readQuota(headers: unknown): Quota | null {
  if (!headers || typeof headers !== "object") return null

  const bag = headers as Record<string, unknown>
  const limit = Number(bag["x-ratelimit-limit"])
  const remaining = Number(bag["x-ratelimit-remaining"])

  if (!Number.isFinite(limit) || !Number.isFinite(remaining)) return null

  return { limit, remaining }
}

export const useChat = create<ChatState>((set, get) => {
  // Shared by a first ask and a retry so the two cannot drift apart.
  async function ask(assistantId: string, question: string) {
    const { documents, selected } = useDocuments.getState()
    const ids = selectedDocuments(documents, selected).map((doc) => doc.id)

    if (!ids.length) return

    set({ sending: true })

    const settle = (patch: Partial<ChatMessage>) =>
      set((state) => ({
        sending: false,
        messages: state.messages.map((message) =>
          message.id === assistantId ? { ...message, pending: false, ...patch } : message,
        ),
      }))

    try {
      const response = await ragApi.post<{ response: string }>("/api/rag/generate", {
        query: question,
        ids,
      })

      const quota = readQuota(response.headers)
      if (quota) set({ quota })

      settle({ text: response.data.response, failure: undefined })
    } catch (error) {
      const quota =
        error && typeof error === "object" && "response" in error
          ? readQuota((error as { response?: { headers?: unknown } }).response?.headers)
          : null
      if (quota) set({ quota })

      settle({ text: "", failure: describeFailure(error, "ask") })
    }
  }

  return {
    messages: [],
    draft: "",
    sending: false,
    copied: null,
    quota: null,

    setDraft: (draft) => set({ draft }),

    send: () => {
      const { draft, sending } = get()
      const question = draft.trim()

      const { documents, selected } = useDocuments.getState()
      if (!question || sending || selectedDocuments(documents, selected).length === 0) return

      const assistantId = newId("a")

      set((state) => ({
        draft: "",
        messages: [
          ...state.messages,
          { id: newId("u"), role: "user", text: question, at: new Date() },
          {
            id: assistantId,
            role: "assistant",
            text: "",
            at: new Date(),
            pending: true,
            question,
          },
        ],
      }))

      void ask(assistantId, question)
    },

    retry: (messageId) => {
      const message = get().messages.find((candidate) => candidate.id === messageId)
      if (!message?.question || get().sending) return

      // Re-runs in place rather than appending a second copy of the same
      // question — the transcript shows one turn per thing the user asked.
      set((state) => ({
        messages: state.messages.map((candidate) =>
          candidate.id === messageId
            ? { ...candidate, pending: true, failure: undefined, text: "", at: new Date() }
            : candidate,
        ),
      }))

      void ask(messageId, message.question)
    },

    copyAnswer: (message) => {
      void navigator.clipboard?.writeText(message.text).catch(() => {
        // Clipboard access can be refused (insecure origin, denied permission).
        // The label reverting says enough.
      })

      set({ copied: message.id })
      setTimeout(
        () => set((state) => (state.copied === message.id ? { copied: null } : state)),
        1600,
      )
    },

    reset: () => set({ messages: [], draft: "", sending: false, copied: null, quota: null }),
  }
})
