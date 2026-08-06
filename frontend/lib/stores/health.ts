"use client"

import axios from "axios"
import { create } from "zustand"

import { DOCUMENT_API_URL } from "@/lib/api"

interface HealthState {
  /** The document service did not answer its health check. */
  degraded: boolean
  probing: boolean
  probe: () => Promise<boolean>
}

/**
 * The service root, which is exempt from the pre-auth IP throttle
 * (PREAUTH_EXEMPT_PATHS) and needs no token — so polling it can neither spend
 * the caller's budget nor fail merely because a session went stale.
 */
const HEALTH_URL = `${DOCUMENT_API_URL}/`

export const useHealth = create<HealthState>((set) => ({
  degraded: false,
  probing: false,

  probe: async () => {
    set({ probing: true })

    try {
      await axios.get(HEALTH_URL, { timeout: 5000 })
      set({ degraded: false, probing: false })

      return true
    } catch {
      set({ degraded: true, probing: false })

      return false
    }
  },
}))
