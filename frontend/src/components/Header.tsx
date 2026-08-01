import { Film, ShieldCheck, Infinity as InfinityIcon, LogOut, User } from 'lucide-react'

interface HeaderProps {
  ffmpegAvailable: boolean | null
  ffmpegVersion: string | null
  email?: string | null
  onLogout?: () => void
}

export default function Header({ ffmpegAvailable, ffmpegVersion, email, onLogout }: HeaderProps) {
  return (
    <header className="mb-8">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 shadow-lg shadow-brand-600/30">
          <Film className="h-6 w-6 text-white" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">
            Compressor & Conversor de Vídeos
          </h1>
          <p className="text-sm text-slate-400">
            Comprima e converta vídeos em diversos formatos — sem limites de conversão.
          </p>
        </div>
        {email && (
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-1.5 text-sm text-slate-400 sm:flex">
              <User className="h-4 w-4" />
              {email}
            </span>
            <button
              onClick={onLogout}
              className="btn-ghost inline-flex items-center gap-1.5 text-sm"
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800/80 px-3 py-1 text-slate-300">
          <InfinityIcon className="h-3.5 w-3.5 text-brand-400" />
          Sem limite de tamanho ou quantidade
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800/80 px-3 py-1 text-slate-300">
          <ShieldCheck className="h-3.5 w-3.5 text-brand-400" />
          Processado no seu próprio servidor
        </span>
        {ffmpegAvailable === true && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            FFmpeg ativo
            {ffmpegVersion ? ` · ${ffmpegVersion.replace('ffmpeg version', '').trim().split(' ')[0]}` : ''}
          </span>
        )}
        {ffmpegAvailable === false && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-3 py-1 text-red-400">
            <span className="h-2 w-2 rounded-full bg-red-400" />
            FFmpeg não instalado no servidor
          </span>
        )}
      </div>
    </header>
  )
}
