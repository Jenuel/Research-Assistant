"use client"

import type React from "react"

import { create } from "zustand"

export interface UploadedFile {
  id: string
  name: string
  type: string
  size: number
  uploadDate: Date
  checked: boolean
}

interface DocumentState {
  uploadedFiles: UploadedFile[]
  userEmail: string
  selectedFilesCount: number
  isUploading: boolean
  isLoadingDocuments: boolean
  isDeletingFile: boolean
  deletingFileId: string | null
  setUserEmail: (email: string) => void
  toggleFileCheck: (fileId: string) => void
  handleFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void
  deleteFile: (fileId: string) => void
  fetchDocuments: () => Promise<void>
  setLoadingDocuments: (loading: boolean) => void
}

export const useDocumentStore = create<DocumentState>((set, get) => ({
  uploadedFiles: [],
  userEmail: "",
  selectedFilesCount: 0,
  isUploading: false,
  isLoadingDocuments: false,
  isDeletingFile: false,
  deletingFileId: null,

  setUserEmail: (email) => set({ userEmail: email }),

  setLoadingDocuments: (loading) => set({ isLoadingDocuments: loading }),

  toggleFileCheck: (fileId) => {
    set((state) => {
      const updatedFiles = state.uploadedFiles.map((file) =>
        file.id === fileId ? { ...file, checked: !file.checked } : file,
      )

      return {
        uploadedFiles: updatedFiles,
        selectedFilesCount: updatedFiles.filter((file) => file.checked).length,
      }
    })
  },

  deleteFile: async (fileId) => {
    set({ isDeletingFile: true, deletingFileId: fileId })

    try {
      // Simulate API call - replace with your actual API call
      await simulateDeleteAPICall(fileId)

      set((state) => {
        const updatedFiles = state.uploadedFiles.filter((file) => file.id !== fileId)

        return {
          uploadedFiles: updatedFiles,
          selectedFilesCount: updatedFiles.filter((file) => file.checked).length,
          isDeletingFile: false,
          deletingFileId: null,
        }
      })
    } catch (error) {
      console.error("Failed to delete document:", error)
      set({ isDeletingFile: false, deletingFileId: null })
    }
  },

  fetchDocuments: async () => {
    set({ isLoadingDocuments: true })

    try {
      // Simulate API call to fetch documents - replace with your actual API call
      const fetchedDocuments = await simulateFetchDocuments()

      // Set the fetched documents (these are already uploaded)
      set({ uploadedFiles: fetchedDocuments })
    } catch (error) {
      console.error("Failed to fetch documents:", error)
    } finally {
      set({ isLoadingDocuments: false })
    }
  },

  handleFileUpload: async (event) => {
    const files = event.target.files
    if (!files) return

    set({ isUploading: true })

    // Process each file
    for (const file of Array.from(files)) {
      if (
        file.type === "application/pdf" ||
        file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        file.type === "application/msword"
      ) {
        try {
          const response = await simulateAPICall(file)

          const uploadedFile = {
            id: response.id,
            name: response.name,
            type: response.type,
            size: response.size,
            uploadDate: new Date(response.uploadDate),
            checked: false,
          }

          // Add to uploaded files only after successful upload
          set((state) => ({
            uploadedFiles: [...state.uploadedFiles, uploadedFile],
          }))
        } catch (error) {
          console.error("Upload failed:", error)
        }
      }
    }

    set({ isUploading: false })

    // Reset file input
    event.target.value = ""
  },
}))

// Simulate API call to fetch documents - replace with your actual API call
async function simulateFetchDocuments(): Promise<UploadedFile[]> {
  // Simulate network delay
  const delay = Math.random() * 1000 + 1000 // 1-2 seconds
  await new Promise((resolve) => setTimeout(resolve, delay))

  // Return some mock documents (in real app, this would come from your API)
  return [
    {
      id: "doc1",
      name: "Sample Document.pdf",
      type: "application/pdf",
      size: 1024000,
      uploadDate: new Date(Date.now() - 86400000), // 1 day ago
      checked: false,
    },
    {
      id: "doc2",
      name: "Report.docx",
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      size: 512000,
      uploadDate: new Date(Date.now() - 172800000), // 2 days ago
      checked: false,
    },
  ]
}

// Simulate API call for upload - replace with your actual API call
async function simulateAPICall(file: File) {
  // Simulate API response time (2-4 seconds)
  const delay = Math.random() * 2000 + 2000
  await new Promise((resolve) => setTimeout(resolve, delay))

  // Simulate potential upload failure (10% chance)
  if (Math.random() < 0.1) {
    throw new Error("Upload failed")
  }

  // Return mock response that matches your API structure
  return {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    name: file.name,
    type: file.type,
    size: file.size,
    uploadDate: new Date().toISOString(),
    status: "uploaded",
  }
}

// Simulate API call for delete - replace with your actual API call
async function simulateDeleteAPICall(fileId: string) {
  // Simulate API response time (1-2 seconds)
  const delay = Math.random() * 1000 + 1000
  await new Promise((resolve) => setTimeout(resolve, delay))

  // Simulate potential delete failure (5% chance)
  if (Math.random() < 0.05) {
    throw new Error("Delete failed")
  }
}
