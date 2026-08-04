import axios, { type AxiosInstance } from "axios"

export const DOCUMENT_API_URL =
  process.env.NEXT_PUBLIC_DOCUMENT_API_URL ?? "http://localhost:6060"

export const RAG_API_URL =
  process.env.NEXT_PUBLIC_RAG_API_URL ?? "http://localhost:7000"

type TokenGetter = () => Promise<string | null>

let getToken: TokenGetter | null = null

export function registerTokenGetter(getter: TokenGetter | null) {
  getToken = getter
}

function withAuth(instance: AxiosInstance): AxiosInstance {
  instance.interceptors.request.use(async (config) => {
    const token = await getToken?.()

    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    return config
  })

  return instance
}

// axios defaults to no timeout at all, which turns a hung backend into a
// spinner that never resolves. The budgets differ because the work does: a
// generate call waits on Gemini, an upload is parsed, chunked and embedded.
export const documentApi = withAuth(
  axios.create({ baseURL: DOCUMENT_API_URL, timeout: 30_000 }),
)

export const ragApi = withAuth(
  axios.create({ baseURL: RAG_API_URL, timeout: 90_000 }),
)

export const UPLOAD_TIMEOUT_MS = 120_000
