"use client"

import { create } from "zustand"

export interface Toast {
  id: string
  title: string
  body?: string
}

interface ToastState {
  toasts: Toast[]
  push: (title: string, body?: string) => void
  dismiss: (id: string) => void
}

const DISMISS_AFTER_MS = 4200

export const useToasts = create<ToastState>((set, get) => ({
  toasts: [],

  push: (title, body) => {
    const id = Math.random().toString(36).slice(2)

    set((state) => ({ toasts: [...state.toasts, { id, title, body }] }))
    setTimeout(() => get().dismiss(id), DISMISS_AFTER_MS)
  },

  dismiss: (id) =>
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}))
