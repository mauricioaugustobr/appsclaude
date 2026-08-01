export interface CodecOption {
  id: string
  label: string
}

export interface OutputFormatOption {
  id: string
  label: string
  ext: string
  codecs: CodecOption[]
  audio_only: boolean
  animated_image: boolean
  default_codec: string
}

export interface LabeledOption {
  id: string
  label: string
}

export interface FormatsResponse {
  input_extensions: string[]
  output_formats: OutputFormatOption[]
  compression_levels: LabeledOption[]
  resolutions: string[]
  speed_presets: string[]
  audio_codecs: string[]
  max_upload_mb: number
}

export type CompressionMode =
  | 'quality'
  | 'target_size'
  | 'target_percent'
  | 'bitrate'
  | 'none'

export interface ConvertSettings {
  output_format: string
  codec: string
  audio_codec: string
  mode: CompressionMode
  level: string
  target_size_mb: number
  target_percent: number
  video_bitrate_kbps: number
  audio_bitrate_kbps: number
  resolution: string
  fps: number
  speed: string
  remove_audio: boolean
  two_pass: boolean
}

export interface VideoInfo {
  duration?: number
  size?: number
  width?: number
  height?: number
  vcodec?: string
  acodec?: string
  fps?: number
  has_audio?: boolean
  has_video?: boolean
}

export type JobStatus =
  | 'queued'
  | 'processing'
  | 'done'
  | 'error'
  | 'canceled'

export interface JobResult {
  id: string
  status: JobStatus
  progress: number
  error: string | null
  original_name: string
  original_size: number
  output_name: string | null
  output_size: number
  saved_percent: number
  info: VideoInfo
  output_format: string
}

export interface QueueItem {
  localId: string
  file: File
  jobId: string | null
  status: JobStatus | 'uploading'
  progress: number
  error: string | null
  result: JobResult | null
}
