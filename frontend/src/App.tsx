import { useCallback, useEffect, useRef, useState } from 'react'
import { Trash2, Zap } from 'lucide-react'
import Header from './components/Header'
import Dropzone from './components/Dropzone'
import SettingsPanel from './components/SettingsPanel'
import FileCard from './components/FileCard'
import Login from './components/Login'
import {
  getFormats,
  getHealth,
  getJob,
  setUnauthorizedHandler,
  submitConversion,
} from './api/convert'
import { clearSession, getEmail, getToken } from './api/auth'
import type {
  ConvertSettings,
  FormatsResponse,
  QueueItem,
} from './types/convert'

const DEFAULT_SETTINGS: ConvertSettings = {
  output_format: 'mp4',
  codec: '',
  audio_codec: '',
  mode: 'quality',
  level: 'balanced',
  target_size_mb: 10,
  target_percent: 50,
  video_bitrate_kbps: 2000,
  audio_bitrate_kbps: 128,
  resolution: 'original',
  fps: 0,
  speed: 'medium',
  remove_audio: false,
  two_pass: false,
}

let idCounter = 0
const nextId = () => `f${Date.now()}_${idCounter++}`

export default function App() {
  const [formats, setFormats] = useState<FormatsResponse | null>(null)
  const [ffmpegAvailable, setFfmpegAvailable] = useState<boolean | null>(null)
  const [ffmpegVersion, setFfmpegVersion] = useState<string | null>(null)
  const [settings, setSettings] = useState<ConvertSettings>(DEFAULT_SETTINGS)
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)

  const [authed, setAuthed] = useState<boolean>(() => !!getToken())
  const [email, setEmail] = useState<string | null>(() => getEmail())
  const [defaultCreds, setDefaultCreds] = useState<boolean>(false)

  const pollers = useRef<Record<string, ReturnType<typeof setInterval>>>({})

  // Se a sessão expirar (401), volta para a tela de login
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setAuthed(false)
      setEmail(null)
    })
  }, [])

  // Status do FFmpeg / credenciais padrão (público, não exige login)
  useEffect(() => {
    getHealth()
      .then((h) => {
        setFfmpegAvailable(h.ffmpeg_available)
        setFfmpegVersion(h.ffmpeg_version)
        setDefaultCreds(!!h.auth_default_credentials)
      })
      .catch(() => setFfmpegAvailable(null))
  }, [])

  // Carrega os formatos apenas quando autenticado
  useEffect(() => {
    if (!authed) return
    getFormats()
      .then(setFormats)
      .catch(() =>
        setLoadError('Não foi possível carregar as configurações do servidor.'),
      )
  }, [authed])

  useEffect(() => {
    const active = pollers.current
    return () => {
      Object.values(active).forEach(clearInterval)
    }
  }, [])

  const patchItem = useCallback((localId: string, patch: Partial<QueueItem>) => {
    setQueue((prev) =>
      prev.map((it) => (it.localId === localId ? { ...it, ...patch } : it)),
    )
  }, [])

  const startPolling = useCallback(
    (localId: string, jobId: string) => {
      const interval = setInterval(async () => {
        try {
          const job = await getJob(jobId)
          patchItem(localId, {
            status: job.status,
            progress: job.progress,
            error: job.error,
            result: job,
          })
          if (['done', 'error', 'canceled'].includes(job.status)) {
            clearInterval(interval)
            delete pollers.current[localId]
          }
        } catch {
          clearInterval(interval)
          delete pollers.current[localId]
          patchItem(localId, { status: 'error', error: 'Falha ao consultar o status.' })
        }
      }, 1000)
      pollers.current[localId] = interval
    },
    [patchItem],
  )

  const handleFiles = useCallback((files: File[]) => {
    const items: QueueItem[] = files.map((file) => ({
      localId: nextId(),
      file,
      jobId: null,
      status: 'queued',
      progress: 0,
      error: null,
      result: null,
    }))
    setQueue((prev) => [...items, ...prev])
  }, [])

  const handleConvertAll = useCallback(async () => {
    const pending = queue.filter((it) => it.status === 'queued' && !it.jobId)
    for (const item of pending) {
      patchItem(item.localId, { status: 'uploading', progress: 0 })
      try {
        const job = await submitConversion(item.file, settings, (percent) => {
          patchItem(item.localId, { progress: percent })
        })
        patchItem(item.localId, {
          jobId: job.id,
          status: job.status,
          progress: job.progress,
          result: job,
        })
        startPolling(item.localId, job.id)
      } catch (e: any) {
        const detail =
          e?.response?.data?.detail || e?.message || 'Falha no envio do arquivo.'
        patchItem(item.localId, { status: 'error', error: detail })
      }
    }
  }, [queue, settings, patchItem, startPolling])

  const removeItem = useCallback((localId: string) => {
    if (pollers.current[localId]) {
      clearInterval(pollers.current[localId])
      delete pollers.current[localId]
    }
    setQueue((prev) => prev.filter((it) => it.localId !== localId))
  }, [])

  const clearFinished = useCallback(() => {
    setQueue((prev) =>
      prev.filter((it) => !['done', 'error', 'canceled'].includes(it.status)),
    )
  }, [])

  const handleLogout = useCallback(() => {
    Object.values(pollers.current).forEach(clearInterval)
    pollers.current = {}
    clearSession()
    setQueue([])
    setFormats(null)
    setEmail(null)
    setAuthed(false)
  }, [])

  const pendingCount = queue.filter(
    (it) => it.status === 'queued' && !it.jobId,
  ).length
  const hasFinished = queue.some((it) =>
    ['done', 'error', 'canceled'].includes(it.status),
  )

  // Tela de login
  if (!authed) {
    return (
      <Login
        defaultCredentials={defaultCreds}
        onSuccess={() => {
          setAuthed(true)
          setEmail(getEmail())
        }}
      />
    )
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-8 md:py-12">
        <Header
          ffmpegAvailable={ffmpegAvailable}
          ffmpegVersion={ffmpegVersion}
          email={email}
          onLogout={handleLogout}
        />

        {loadError && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-300">
            {loadError}
          </div>
        )}

        {ffmpegAvailable === false && (
          <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-300">
            O FFmpeg não está instalado no servidor. Instale-o (ex.:{' '}
            <code className="rounded bg-slate-800 px-1.5 py-0.5">apt install ffmpeg</code>)
            para habilitar as conversões.
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* Coluna principal: upload + fila */}
          <div className="space-y-6">
            <Dropzone
              onFiles={handleFiles}
              acceptExtensions={formats?.input_extensions ?? []}
            />

            {queue.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  onClick={handleConvertAll}
                  disabled={pendingCount === 0 || ffmpegAvailable === false}
                  className="btn-primary inline-flex items-center gap-2"
                >
                  <Zap className="h-4 w-4" />
                  Converter {pendingCount > 0 ? `(${pendingCount})` : 'tudo'}
                </button>
                {hasFinished && (
                  <button
                    onClick={clearFinished}
                    className="btn-ghost inline-flex items-center gap-2 text-sm"
                  >
                    <Trash2 className="h-4 w-4" />
                    Limpar concluídos
                  </button>
                )}
              </div>
            )}

            <div className="space-y-3">
              {queue.map((item) => (
                <FileCard key={item.localId} item={item} onRemove={removeItem} />
              ))}
            </div>

            {queue.length === 0 && (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/30 px-4 py-8 text-center text-sm text-slate-500">
                Nenhum arquivo na fila. Adicione vídeos para começar.
              </div>
            )}
          </div>

          {/* Coluna lateral: configurações */}
          <div className="lg:sticky lg:top-8 lg:self-start">
            {formats ? (
              <SettingsPanel
                formats={formats}
                settings={settings}
                onChange={(patch) => setSettings((s) => ({ ...s, ...patch }))}
              />
            ) : (
              <div className="card text-sm text-slate-500">Carregando opções…</div>
            )}
          </div>
        </div>

        <footer className="mt-12 text-center text-xs text-slate-600">
          Processamento local com FFmpeg · Sem limites de conversão
        </footer>
      </div>
    </div>
  )
}
