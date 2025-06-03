"use client"

import type React from "react"
import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

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
  setUserEmail: (email: string) => void
  toggleFileCheck: (fileId: string) => void
  handleFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void
  deleteFile: (fileId: string) => void
}

export const useDocumentStore = create<DocumentState>()(
  persist(
    (set, get) => ({
      uploadedFiles: [],
      userEmail: "",
      selectedFilesCount: 0,

      setUserEmail: (email) => set({ userEmail: email }),

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

      deleteFile: (fileId) => {
        set((state) => {
          const updatedFiles = state.uploadedFiles.filter((file) => file.id !== fileId)

          return {
            uploadedFiles: updatedFiles,
            selectedFilesCount: updatedFiles.filter((file) => file.checked).length,
          }
        })
      },

      handleFileUpload: (event) => {
        const files = event.target.files
        if (!files) return

        const newFiles: UploadedFile[] = []

        Array.from(files).forEach((file) => {
          if (
            file.type === "application/pdf" ||
            file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
            file.type === "application/msword"
          ) {
            newFiles.push({
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
              name: file.name,
              type: file.type,
              size: file.size,
              uploadDate: new Date(),
              checked: false,
            })
          }
        })

        set((state) => ({
          uploadedFiles: [...state.uploadedFiles, ...newFiles],
        }))

        // Reset the input
        event.target.value = ""
      },
    }),
    {
      name: 'document-store',
      storage: createJSONStorage(() => sessionStorage),
      skipHydration: true,
    }
  )
) 