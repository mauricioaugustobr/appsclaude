import {
  CheckCircle2,
  Download,
  FileVideo,
  Loader2,
  X,
  XCircle,
} from 'lucide-react'
import clsx from 'clsx'
import type { QueueItem } from '../types/convert'
import { downloadUrl } from '../api/convert'
import { formatBytes, formatDuration } from '../utils/format'

interface FileCardProps {
  item: QueueItem
  onRemove: (localId: string) => void
}

export default function FileCard({ item, onRemove }: FileCardProps) {
  const { status, progress, result } = item

  const statusLabel: Record<string, string> = {
    uploading: 'Enviando…',
    queued: 'Na fila…',
    processing: 'Convertendo…',
    done: 'Concluído',
    error: 'Erro',
    canceled: 'Cancelado',
  }

  const isActive = status === 'uploading' || status === 'queued' || status === 'processing'
  const info = result?.info

  return (
    <div className="card flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-800">
          <FileVideo className="h-5 w-5 text-brand-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-100" title={item.file.name}>
            {item.file.name}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {formatBytes(item.file.size)}
            {info?.width && info?.height ? ` · ${info.width}×${info.height}` : ''}
            {info?.duration ? ` · ${formatDuration(info.duration)}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={clsx(
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
              status === 'done' && 'bg-emerald-500/10 text-emerald-400',
              status === 'error' && 'bg-red-500/10 text-red-400',
              status === 'canceled' && 'bg-slate-700/50 text-slate-400',
              isActive && 'bg-brand-500/10 text-brand-300',
            )}
          >
            {isActive && <Loader2 className="h-3 w-3 animate-spin" />}
            {status === 'done' && <CheckCircle2 className="h-3 w-3" />}
            {status === 'error' && <XCircle className="h-3 w-3" />}
            {statusLabel[status]}
          </span>
          <button
            onClick={() => onRemove(item.localId)}
            className="rounded-md p-1 text-slate-500 hover:bg-slate-800 hover:text-slate-300"
            title="Remover"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Barra de progresso */}
      {isActive && (
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full bg-brand-500 transition-all duration-300"
            style={{ width: `${Math.max(2, progress)}%` }}
          />
        </div>
      )}

      {/* Erro */}
      {status === 'error' && item.error && (
        <p className="rounded-lg bg-red-500/5 px-3 py-2 text-xs text-red-300">
          {item.error}
        </p>
      )}

      {/* Resultado */}
      {status === 'done' && result && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-800/50 px-3 py-2.5">
          <div className="text-xs text-slate-300">
            <span className="text-slate-500">Resultado: </span>
            {formatBytes(result.output_size)}
            {result.saved_percent > 0 && (
              <span className="ml-2 rounded-full bg-emerald-500/15 px-2 py-0.5 font-semibold text-emerald-400">
                −{result.saved_percent}%
              </span>
            )}
            {result.saved_percent < 0 && (
              <span className="ml-2 rounded-full bg-amber-500/15 px-2 py-0.5 font-semibold text-amber-400">
                +{Math.abs(result.saved_percent)}%
              </span>
            )}
          </div>
          <a
            href={downloadUrl(result.id)}
            download={result.output_name || undefined}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-500"
          >
            <Download className="h-3.5 w-3.5" />
            Baixar {result.output_name?.split('.').pop()?.toUpperCase()}
          </a>
        </div>
      )}
    </div>
  )
}
