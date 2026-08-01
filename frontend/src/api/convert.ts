import axios from 'axios'
import type { ConvertSettings, FormatsResponse, JobResult } from '../types/convert'

const api = axios.create({ baseURL: '/api' })

export interface HealthResponse {
  status: string
  ffmpeg_available: boolean
  ffmpeg_version: string | null
}

export async function getHealth(): Promise<HealthResponse> {
  const { data } = await api.get<HealthResponse>('/health')
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
  return `/api/download/${jobId}`
}
