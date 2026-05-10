import { useState, useRef } from 'react'
import { Search, X } from 'lucide-react'
import { buscarTicker } from '../api/stocks'
import clsx from 'clsx'

interface Props {
  onSelect: (symbol: string) => void
}

export function SearchBar({ onSelect }: Props) {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ found: boolean; symbol: string; preco?: number } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleChange = (v: string) => {
    setQuery(v)
    setResult(null)
    if (timer.current) clearTimeout(timer.current)
    if (v.trim().length < 4) return
    timer.current = setTimeout(async () => {
      setLoading(true)
      try {
        const r = await buscarTicker(v.trim())
        setResult({ found: r.encontrado, symbol: r.symbol, preco: r.preco })
      } finally {
        setLoading(false)
      }
    }, 600)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (result?.found) {
      onSelect(result.symbol)
      setQuery('')
      setResult(null)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="relative w-full max-w-sm">
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value.toUpperCase())}
          placeholder="Buscar ação (ex: PETR4)"
          className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-8 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
        />
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(''); setResult(null) }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {loading && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-gray-800 border border-gray-700 rounded-lg p-2 text-xs text-gray-400">
          Buscando...
        </div>
      )}

      {result && !loading && (
        <div
          className={clsx(
            'absolute top-full mt-1 left-0 right-0 border rounded-lg p-2 text-xs cursor-pointer',
            result.found
              ? 'bg-gray-800 border-green-600/40 text-green-400 hover:bg-gray-700'
              : 'bg-gray-800 border-red-600/40 text-red-400',
          )}
          onClick={() => result.found && onSelect(result.symbol)}
        >
          {result.found
            ? `✓ ${result.symbol} — R$ ${result.preco?.toFixed(2)}`
            : `✗ ${result.symbol} não encontrada`}
        </div>
      )}
    </form>
  )
}
