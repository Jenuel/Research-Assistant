"use client"

import { create } from "zustand"

import { documentApi } from "@/lib/api"
import { describeFailure } from "@/lib/errors"
import { extensionOf, parseServerDate } from "@/lib/format"
import { useToasts } from "@/lib/stores/toasts"

export interface DocumentRecord {
  /** The service's SQL primary key. An int — /api/rag/generate rejects strings. */
  id: number
  name: string
  contentType: string
  size: number
  uploadDate: string
}

export type SortKey =
  | "date-desc"
  | "date-asc"
  | "name-asc"
  | "name-desc"
  | "size-desc"
  | "size-asc"

export type LibraryStatus = "idle" | "loading" | "ready" | "error"

interface DocumentState {
  documents: DocumentRecord[]
  /** Which documents are in scope for the next question. */
  selected: Set<number>
  /** Documents with a delete in flight, so the row can say so. */
  deleting: Set<number>
  status: LibraryStatus
  error: string | null
  search: string
  sortKey: SortKey

  fetchDocuments: () => Promise<void>
  toggle: (id: number) => void
  selectMany: (ids: number[]) => void
  deselectMany: (ids: number[]) => void
  clearSelection: () => void
  deleteDocument: (document: DocumentRecord) => Promise<void>
  prependDocument: (document: DocumentRecord) => void
  setSearch: (search: string) => void
  setSortKey: (sortKey: SortKey) => void
  reset: () => void
}

interface RawDocument {
  id: number
  name: string
  content_type: string | null
  size: number | null
  uploadDate: string
}

export function normalizeDocument(raw: RawDocument): DocumentRecord {
  return {
    id: raw.id,
    name: raw.name,
    contentType: raw.content_type ?? "",
    size: raw.size ?? 0,
    uploadDate: raw.uploadDate,
  }
}

export const useDocuments = create<DocumentState>((set, get) => ({
  documents: [],
  selected: new Set(),
  deleting: new Set(),
  status: "idle",
  error: null,
  search: "",
  sortKey: "date-desc",

  fetchDocuments: async () => {
    set({ status: "loading", error: null })

    try {
      const response = await documentApi.get<RawDocument[]>("/api/documents/fetch/all")
      const documents = response.data.map(normalizeDocument)

      set((state) => ({
        documents,
        status: "ready",
        error: null,
        // A refetch must not resurrect a selection for a document that is gone,
        // or the next question would carry an id the RAG service filters out
        // silently and the scope chips would disagree with the library.
        selected: new Set(
          [...state.selected].filter((id) => documents.some((doc) => doc.id === id)),
        ),
      }))
    } catch (error) {
      set({ status: "error", error: describeFailure(error).message })
    }
  },

  toggle: (id) =>
    set((state) => {
      const selected = new Set(state.selected)

      if (selected.has(id)) selected.delete(id)
      else selected.add(id)

      return { selected }
    }),

  selectMany: (ids) =>
    set((state) => {
      const selected = new Set(state.selected)
      ids.forEach((id) => selected.add(id))

      return { selected }
    }),

  deselectMany: (ids) =>
    set((state) => {
      const selected = new Set(state.selected)
      ids.forEach((id) => selected.delete(id))

      return { selected }
    }),

  clearSelection: () => set({ selected: new Set() }),

  deleteDocument: async (document) => {
    // Optimistic: the row leaves at once and comes back if the request fails.
    // There is no other visible response to the click, so waiting on a round
    // trip reads as nothing having happened.
    const snapshot = get().documents

    set((state) => {
      const deleting = new Set(state.deleting)
      deleting.add(document.id)

      const selected = new Set(state.selected)
      selected.delete(document.id)

      return {
        deleting,
        selected,
        documents: state.documents.filter((doc) => doc.id !== document.id),
      }
    })

    try {
      await documentApi.delete(`/api/documents/delete/${document.id}`)

      set((state) => {
        const deleting = new Set(state.deleting)
        deleting.delete(document.id)

        return { deleting }
      })

      useToasts.getState().push("Deleted", `${document.name} and its index are gone.`)
    } catch (error) {
      const failure = describeFailure(error)

      set((state) => {
        const deleting = new Set(state.deleting)
        deleting.delete(document.id)

        // A 404 means it was already gone — rolling the row back would put a
        // document on screen that no longer exists anywhere.
        return failure.kind === "notfound" ? { deleting } : { deleting, documents: snapshot }
      })

      useToasts.getState().push("Delete failed", failure.message)
    }
  },

  prependDocument: (document) =>
    set((state) => ({ documents: [document, ...state.documents] })),

  setSearch: (search) => set({ search }),

  setSortKey: (sortKey) => set({ sortKey }),

  reset: () =>
    set({
      documents: [],
      selected: new Set(),
      deleting: new Set(),
      status: "idle",
      error: null,
      search: "",
    }),
}))

/** The library rows actually on screen: the search filter, in sort order. */
export function visibleDocuments(
  documents: DocumentRecord[],
  search: string,
  sortKey: SortKey,
): DocumentRecord[] {
  const needle = search.trim().toLowerCase()
  const matches = documents.filter(
    (doc) => !needle || doc.name.toLowerCase().includes(needle),
  )

  const [key, direction] = sortKey.split("-")
  const sign = direction === "asc" ? 1 : -1

  return [...matches].sort((a, b) => {
    if (key === "name") return a.name.localeCompare(b.name) * sign
    if (key === "size") return (a.size - b.size) * sign

    return (
      (parseServerDate(a.uploadDate).getTime() - parseServerDate(b.uploadDate).getTime()) *
      sign
    )
  })
}

export function selectedDocuments(
  documents: DocumentRecord[],
  selected: Set<number>,
): DocumentRecord[] {
  return documents.filter((doc) => selected.has(doc.id))
}

export function kindLabel(document: DocumentRecord): string {
  return extensionOf(document.name).toUpperCase()
}
