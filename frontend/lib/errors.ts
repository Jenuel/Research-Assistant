import { isAxiosError } from "axios"

export type FailureKind =
  | "timeout"
  | "unreachable"
  | "unauthorized"
  | "ratelimit"
  | "toolarge"
  | "unsupported"
  | "notfound"
  | "server"

export interface Failure {
  kind: FailureKind
  message: string
  /** Whether offering a Retry button makes sense. */
  retryable: boolean
  retryAfter?: number
}

/**
 * Seconds from a 429's `Retry-After`.
 *
 * Usually absent in the browser: both services enable slowapi's
 * `headers_enabled`, but their CORS middleware sets no `expose_headers`, and a
 * cross-origin response only surfaces the CORS-safelisted headers to JS. Treat
 * a countdown as a bonus, never as something the copy depends on.
 */
function retryAfterSeconds(headers: unknown): number | undefined {
  if (!headers || typeof headers !== "object") return undefined

  const raw = (headers as Record<string, unknown>)["retry-after"]
  const seconds = Number(raw)

  return Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds) : undefined
}

/** FastAPI puts its reason in `detail`; slowapi's 429 handler uses `error`. */
function serverDetail(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined

  const body = data as Record<string, unknown>
  const detail = body.detail ?? body.error

  return typeof detail === "string" ? detail : undefined
}

/**
 * Turn a thrown request into copy the UI can show. The distinction that matters
 * to a reader is what to do next — wait, retry, change the input, sign in again.
 */
export function describeFailure(error: unknown, context: "ask" | "documents" = "documents"): Failure {
  if (!isAxiosError(error)) {
    return {
      kind: "server",
      message: "Something went wrong on our side. Try again.",
      retryable: true,
    }
  }

  if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
    return {
      kind: "timeout",
      message:
        context === "ask"
          ? "That took too long. Try a shorter question or fewer documents."
          : "That took too long. Try again.",
      retryable: true,
    }
  }

  // No response at all: DNS, refused connection, a CORS rejection, or offline.
  // All of them look the same from here and have the same next step.
  if (!error.response) {
    return {
      kind: "unreachable",
      message: "Can't reach the service. Check your connection.",
      retryable: true,
    }
  }

  const { status, headers, data } = error.response
  const detail = serverDetail(data)

  if (status === 401 || status === 403) {
    return {
      kind: "unauthorized",
      message: "Your session has expired. Sign in again.",
      retryable: false,
    }
  }

  if (status === 429) {
    const retryAfter = retryAfterSeconds(headers)

    return {
      kind: "ratelimit",
      message: retryAfter
        ? `You've hit the request limit. Try again in ${retryAfter}s.`
        : "You've hit the request limit. Wait a moment and try again.",
      retryable: true,
      retryAfter,
    }
  }

  if (status === 413) {
    return {
      kind: "toolarge",
      message: "That file is larger than the 10 MB limit.",
      retryable: false,
    }
  }

  if (status === 415 || status === 422) {
    // The service's own detail reads "Unsupported document type:
    // application/msword" — accurate, and no use to someone deciding what to do
    // next. Reaching here means the extension passed the client check but the
    // content type didn't, i.e. the file isn't what its name says.
    return {
      kind: "unsupported",
      message: "That file isn't a supported format. Upload a PDF, DOCX, or TXT file.",
      retryable: false,
    }
  }

  if (status === 404) {
    return {
      kind: "notfound",
      message: "That document is no longer there. It may already have been deleted.",
      retryable: false,
    }
  }

  if (status === 400) {
    return {
      kind: "server",
      message: detail ?? "That request wasn't accepted. Try again.",
      retryable: false,
    }
  }

  return {
    kind: "server",
    message: "Something went wrong on our side. Try again.",
    retryable: true,
  }
}
