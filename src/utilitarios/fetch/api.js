export function apiUrl(path) {
  const baseUrl = window.__APP_CONFIG__?.apiBaseUrl || import.meta.env.VITE_API_BASE_URL || ''

  if (!baseUrl) {
    return path
  }

  return `${baseUrl}${path.replace(/^\/api/, '')}`
}
