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

export const documentApi = withAuth(axios.create({ baseURL: DOCUMENT_API_URL }))

export const ragApi = withAuth(axios.create({ baseURL: RAG_API_URL }))
