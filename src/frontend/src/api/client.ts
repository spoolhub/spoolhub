import axios from 'axios'
import { getToken } from './session'

declare module 'axios' {
  export interface AxiosRequestConfig {
    skipOfflineEvent?: boolean
  }
}

type SavePickerWindow = Window & {
  showSaveFilePicker?: (options?: { suggestedName?: string }) => Promise<FileSystemFileHandle>
}

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use(config => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

async function saveBlobWithPicker(blob: Blob, filename: string): Promise<boolean> {
  const pickerWindow = window as SavePickerWindow
  if (typeof pickerWindow.showSaveFilePicker !== 'function') return false

  try {
    const handle = await pickerWindow.showSaveFilePicker({ suggestedName: filename })
    const writable = await handle.createWritable()
    await writable.write(blob)
    await writable.close()
    return true
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return true
    return false
  }
}

function saveBlobWithAnchor(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Fetch via the API proxy with auth, then save locally — never navigates away from the app. */
export async function downloadBlobFile(
  path: string,
  filename: string,
  params: Record<string, string> = {},
  sizeBytes = 0,
) {
  const timeoutMs = Math.max(30_000, Math.ceil(sizeBytes / 200_000) * 1000)
  const response = await apiClient.get<Blob>(path, {
    params,
    responseType: 'blob',
    skipOfflineEvent: true,
    timeout: timeoutMs,
  })

  const saved = await saveBlobWithPicker(response.data, filename)
  if (!saved) saveBlobWithAnchor(response.data, filename)
}

apiClient.interceptors.response.use(
  response => response,
  error => {
    if (!error.config?.skipOfflineEvent) {
      const isNetworkError = !error.response
      const is5xx = (error.response?.status ?? 0) >= 500
      if (isNetworkError || is5xx) {
        window.dispatchEvent(new CustomEvent('app-offline'))
      }
    }
    return Promise.reject(error)
  }
)
