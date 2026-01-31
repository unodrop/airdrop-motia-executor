/**
 * Reusable HTTP client: baseURL, default headers, timeout, unified error handling, optional retry, optional proxy agent.
 * Uses axios; proxy is per-request via options.proxy (agent passed through request config).
 */

import axios, { type AxiosRequestConfig } from 'axios'
import { HttpProxyAgent } from 'http-proxy-agent'
import { HttpsProxyAgent } from 'https-proxy-agent'

export type RequestOptions = {
  baseURL?: string
  headers?: Record<string, string>
  timeoutMs?: number
  retries?: number
  retryDelayMs?: number
  /** Proxy URL for this request only (e.g. http://168.63.76.32:3128). Pass per request; uses HttpProxyAgent/HttpsProxyAgent. */
  proxy?: string
}

const defaultTimeoutMs = 15_000
const defaultRetries = 0
const defaultRetryDelayMs = 1000

function resolveUrl(baseURL: string | undefined, pathOrUrl: string): string {
  if (!pathOrUrl.startsWith('http')) {
    const base = (baseURL ?? '').replace(/\/$/, '')
    const path = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`
    return `${base}${path}`
  }
  return pathOrUrl
}

export class HttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: unknown
  ) {
    super(message)
    this.name = 'HttpError'
  }
}

export async function request<T = unknown>(
  method: string,
  pathOrUrl: string,
  options: RequestOptions & { body?: unknown } = {}
): Promise<T> {
  const {
    baseURL,
    headers: customHeaders = {},
    timeoutMs = defaultTimeoutMs,
    retries = defaultRetries,
    retryDelayMs = defaultRetryDelayMs,
    proxy: proxyUrl,
    body,
  } = options

  const url = resolveUrl(baseURL, pathOrUrl)
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...customHeaders,
  }

  const shouldRetry = (status: number) =>
    status === 429 || (status >= 500 && status < 600)

  let lastError: HttpError | null = null
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const config: AxiosRequestConfig = {
        method,
        url,
        headers,
        data: body,
        timeout: timeoutMs,
        proxy: false,
        validateStatus: () => true,
      }
      if (proxyUrl) {
        config.httpAgent = new HttpProxyAgent(proxyUrl)
        config.httpsAgent = new HttpsProxyAgent(proxyUrl)
      }

      const response = await axios.request(config)
      const status = response.status
      const data = response.data

      if (status < 200 || status >= 300) {
        const error = new HttpError(
          `HTTP ${status}: ${response.statusText}`,
          status,
          data
        )
        if (attempt < retries && shouldRetry(status)) {
          lastError = error
          await new Promise((resolve) => setTimeout(resolve, retryDelayMs * (attempt + 1)))
          continue
        }
        throw error
      }

      return data as T
    } catch (error) {
      if (error instanceof HttpError) throw error
      const status = axios.isAxiosError(error) && error.response?.status != null
        ? error.response.status
        : 0
      const bodyData = axios.isAxiosError(error) ? error.response?.data : undefined
      lastError = error instanceof Error
        ? new HttpError(error.message, status, bodyData)
        : new HttpError(String(error), 0)
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs * (attempt + 1)))
        continue
      }
      throw lastError
    }
  }

  throw lastError ?? new HttpError('Request failed', 0)
}

export function get<T = unknown>(
  pathOrUrl: string,
  options: RequestOptions = {}
): Promise<T> {
  return request<T>('GET', pathOrUrl, options)
}

export function post<T = unknown>(
  pathOrUrl: string,
  body?: unknown,
  options: RequestOptions = {}
): Promise<T> {
  return request<T>('POST', pathOrUrl, { ...options, body })
}
