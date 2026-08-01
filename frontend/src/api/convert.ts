import axios from 'axios'
import type { ConvertSettings, FormatsResponse, JobResult } from '../types/convert'
import { clearSession, getToken, setSession } from './auth'

const api = axios.create({ baseURL: '/api' })

// Anexa o token de sessão em toda requisição
api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers = config.headers ?? {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Callback disparado quando a sessão expira (401)
let onUnauthorized: (() => void) | null = null
export function setUnauthorizedHandler(fn: () => void): void {
  onUnauthorized = fn
}

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error?.response?.status === 401) {
      clearSession()
      if (onUnauthorized) onUnauthorized()
    }
    return Promise.reject(error)
  },
)

export interface HealthResponse {
  status: string
  ffmpeg_available: boolean
  ffmpeg_version: string | null
  auth_default_credentials?: boolean
}

export async function getHealth(): Promise<HealthResponse> {
  const { data } = await api.get<HealthResponse>('/health')
  return data
}

export interface LoginResponse {
  token: string
  email: string
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/login', { email, password })
  setSession(data.token, data.email)
  return data
}

export async function getFormats(): Promise<FormatsResponse> {
  const { data } = await api.get<FormatsResponse>('/formats')
  return data
}

export async function submitConversion(
  file: File,
  settings: ConvertSettings,
  onUploadProgress?: (percent: number) => void,
): Promise<JobResult> {
  const form = new FormData()
  form.append('file', file)
  form.append('output_format', settings.output_format)
  form.append('codec', settings.codec)
  form.append('audio_codec', settings.audio_codec)
  form.append('mode', settings.mode)
  form.append('level', settings.level)
  form.append('target_size_mb', String(settings.target_size_mb))
  form.append('target_percent', String(settings.target_percent))
  form.append('video_bitrate_kbps', String(settings.video_bitrate_kbps))
  form.append('audio_bitrate_kbps', String(settings.audio_bitrate_kbps))
  form.append('resolution', settings.resolution)
  form.append('fps', String(settings.fps))
  form.append('speed', settings.speed)
  form.append('remove_audio', String(settings.remove_audio))
  form.append('two_pass', String(settings.two_pass))

  const { data } = await api.post<JobResult>('/convert', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (onUploadProgress && e.total) {
        onUploadProgress(Math.round((e.loaded / e.total) * 100))
      }
    },
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  })
  return data
}

export async function getJob(jobId: string): Promise<JobResult> {
  const { data } = await api.get<JobResult>(`/jobs/${jobId}`)
  return data
}

export async function cancelJob(jobId: string): Promise<void> {
  await api.post(`/jobs/${jobId}/cancel`)
}

export function downloadUrl(jobId: string): string {
  const token = getToken()
  return `/api/download/${jobId}?token=${encodeURIComponent(token ?? '')}`
}
