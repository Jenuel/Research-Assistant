"use client"

import type React from "react"
import axios from "axios"
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
      await axios.delete(`http://localhost:6060/api/documents/delete/${fileId}`)

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
    set({ isLoadingDocuments: true });

    try {
      const response = await axios.get("http://localhost:6060/api/documents/fetch/all");
      const fetchedDocuments = response.data;

      const normalizedDocuments = fetchedDocuments.map((file: any) => ({
        ...file,
        uploadDate: new Date(file.uploadDate),
        checked: false,
      }));

      set({ uploadedFiles: normalizedDocuments });
    } catch (error) {
      console.error("Failed to fetch documents:", error);
    } finally {
      set({ isLoadingDocuments: false });
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
          const formData = new FormData();
          formData.append("document", file)
          const response = await axios.post("http://localhost:6060/api/documents/upload", formData, {
            headers: {
              "Content-type": "multipart/form-data"
            },
          });

          const uploadedFile = {
            id: response.data.id,
            name: response.data.name,
            type: response.data.content_type,
            size: response.data. size,
            uploadDate: new Date(response.data.uploadDate),
            checked: false,
          }

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