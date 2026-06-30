import axios from 'axios'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.response.use(
  response => response,
  error => {
    const isNetworkError = !error.response
    const is5xx = (error.response?.status ?? 0) >= 500
    if (isNetworkError || is5xx) {
      window.dispatchEvent(new CustomEvent('app-offline'))
    }
    return Promise.reject(error)
  }
)
