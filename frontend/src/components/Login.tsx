import { useState } from 'react'
import { Film, Loader2, Lock, Mail } from 'lucide-react'
import { login } from '../api/convert'

interface LoginProps {
  onSuccess: () => void
  defaultCredentials?: boolean
}

export default function Login({ onSuccess, defaultCredentials }: LoginProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(email, password)
      onSuccess()
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Falha ao entrar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 shadow-lg shadow-brand-600/30">
            <Film className="h-7 w-7 text-white" />
          </div>
          <h1 className="mt-4 text-xl font-bold tracking-tight">
            Compressor & Conversor de Vídeos
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Entre para acessar a ferramenta
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          <div>
            <label className="field-label">Email</label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@empresa.com"
                className="select-input pl-9"
              />
            </div>
          </div>

          <div>
            <label className="field-label">Senha</label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="select-input pl-9"
              />
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary flex w-full items-center justify-center gap-2"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Entrar
          </button>

          {defaultCredentials && (
            <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
              Usando credenciais padrão:{' '}
              <code className="rounded bg-slate-800 px-1">admin@empresa.com</code> /{' '}
              <code className="rounded bg-slate-800 px-1">admin123</code>. Configure a
              variável <code>AUTH_USERS</code> no servidor para produção.
            </p>
          )}
        </form>
      </div>
    </div>
  )
}
