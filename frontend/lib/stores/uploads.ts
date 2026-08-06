"use client"

import { create } from "zustand"

import { documentApi, UPLOAD_TIMEOUT_MS } from "@/lib/api"
import { describeFailure } from "@/lib/errors"
import { extensionOf, pluralize } from "@/lib/format"
import { normalizeDocument, useDocuments } from "@/lib/stores/documents"
import { useToasts } from "@/lib/stores/toasts"

/**
 * Mirrors MAX_UPLOAD_BYTES in document_service/app/core/uploads.py. Checking
 * here is a courtesy, not the enforcement — the service rejects oversize bodies
 * on Content-Length before reading them, and again while reading. The point is
 * that a 12 MB file should not be pushed over the wire just to be told no.
 */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

/** The three formats `extract_text` knows how to read. */
export const ACCEPTED_EXTENSIONS = ["pdf", "docx", "txt"] as const

export const ACCEPT_ATTRIBUTE =
  ".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"

export type UploadStatus = "queued" | "uploading" | "indexing" | "done" | "error"

export interface UploadItem {
  id: string
  file: File
  name: string
  size: number
  status: UploadStatus
  /** Bytes sent, 0–100. Not indexing progress — the service reports none. */
  progress: number
  error: string | null
  /** False for a rejection that resending unchanged cannot fix. */
  retryable: boolean
}

interface UploadState {
  items: UploadItem[]
  running: boolean
  /** A batch has finished at least once, so the summary line is meaningful. */
  finished: boolean
  dragging: boolean

  addFiles: (files: File[]) => void
  runQueue: () => Promise<void>
  retryFailed: () => void
  setDragging: (dragging: boolean) => void
  clear: () => void
}

function precheck(file: File): { error: string | null; retryable: boolean } {
  const extension = extensionOf(file.name)

  if (file.size > MAX_UPLOAD_BYTES) {
    return { error: `${file.name} is larger than the 10 MB limit.`, retryable: false }
  }

  if (!ACCEPTED_EXTENSIONS.includes(extension as (typeof ACCEPTED_EXTENSIONS)[number])) {
    return {
      error: `${file.name} isn't a supported format. Upload a PDF, DOCX, or TXT file.`,
      retryable: false,
    }
  }

  return { error: null, retryable: true }
}

export const useUploads = create<UploadState>((set, get) => ({
  items: [],
  running: false,
  finished: false,
  dragging: false,

  addFiles: (files) => {
    if (!files.length) return

    const items: UploadItem[] = files.map((file) => {
      const { error, retryable } = precheck(file)

      return {
        id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        name: file.name,
        size: file.size,
        status: error ? "error" : "queued",
        progress: 0,
        error,
        retryable,
      }
    })

    set((state) => ({ items: [...state.items, ...items], finished: false }))

    if (!get().running) void get().runQueue()
  },

  runQueue: async () => {
    if (get().running) return

    const patch = (id: string, update: Partial<UploadItem>) =>
      set((state) => ({
        items: state.items.map((item) => (item.id === id ? { ...item, ...update } : item)),
      }))

    set({ running: true, finished: false })

    // Re-read the queue each pass: a file dropped mid-batch should join this
    // run rather than sit until the next one is triggered by hand. Sequential
    // because indexing is CPU-heavy and uploads are capped at 20/minute.
    let next = get().items.find((item) => item.status === "queued")

    while (next) {
      const item = next

      patch(item.id, { status: "uploading", progress: 0, error: null })

      const body = new FormData()
      body.append("document", item.file)

      try {
        const response = await documentApi.post("/api/documents/upload", body, {
          timeout: UPLOAD_TIMEOUT_MS,
          onUploadProgress: (event) => {
            const total = event.total ?? item.size
            if (!total) return

            const sent = Math.min(100, Math.round((event.loaded / total) * 100))

            // The bar stops at the last byte sent; from there the service is
            // extracting text and embedding chunks, which reports nothing, so
            // the status word carries that phase instead of a fake percentage.
            patch(item.id, { progress: sent, status: sent >= 100 ? "indexing" : "uploading" })
          },
        })

        patch(item.id, { status: "done", progress: 100, error: null })
        useDocuments.getState().prependDocument(normalizeDocument(response.data))
      } catch (error) {
        const failure = describeFailure(error)

        patch(item.id, {
          status: "error",
          error: failure.message,
          retryable: failure.retryable,
        })
      }

      next = get().items.find((candidate) => candidate.status === "queued")
    }

    set({ running: false, finished: true })

    const items = get().items
    const done = items.filter((item) => item.status === "done").length

    if (!items.length) return

    if (done === items.length) {
      useToasts.getState().push("Uploaded", `${pluralize(done, "document")} indexed.`)
    } else {
      useToasts
        .getState()
        .push(
          "Partly uploaded",
          `${done} of ${items.length} uploaded. See the dialog for reasons.`,
        )
    }
  },

  retryFailed: () => {
    set((state) => ({
      items: state.items.map((item) =>
        item.status === "error" && item.retryable
          ? { ...item, status: "queued", error: null, progress: 0 }
          : item,
      ),
    }))

    void get().runQueue()
  },

  setDragging: (dragging) => set({ dragging }),

  clear: () => set({ items: [], finished: false, dragging: false }),
}))
