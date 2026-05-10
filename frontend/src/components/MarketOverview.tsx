import { useState, useEffect, useCallback } from 'react'
import { TrendingUp, TrendingDown, RefreshCw, BarChart2 } from 'lucide-react'
import { resumoMercado } from '../api/stocks'
import type { AcaoResumo } from '../types/stock'
import { SignalBadge } from './SignalBadge'
import clsx from 'clsx'

interface Props {
  onSelectAcao: (symbol: string) => void
  selectedSymbol: string | null
}

export function MarketOverview({ onSelectAcao, selectedSymbol }: Props) {
  const [dados, setDados] = useState<AcaoResumo[]>([])
  const [loading, setLoading] = useState(true)
  const [atualizadoEm, setAtualizadoEm] = useState('')

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const res = await resumoMercado()
      setDados(res.resumo)
      setAtualizadoEm(new Date(res.atualizado_em).toLocaleTimeString('pt-BR'))
    } catch {
      // silencioso
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const formatPreco = (v: number | null) => v != null ? `R$ ${v.toFixed(2)}` : '-'
  const formatVar = (v: number | null) => v != null ? `${v > 0 ? '+' : ''}${v.toFixed(2)}%` : '-'

  return (
    <div className="card h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart2 size={18} className="text-green-400" />
          <h2 className="font-semibold text-white">Visão do Mercado</h2>
        </div>
        <button
          onClick={carregar}
          disabled={loading}
          className="btn-ghost text-xs flex items-center gap-1"
        >
          <RefreshCw size={14} className={clsx(loading && 'animate-spin')} />
          {atualizadoEm || 'Atualizar'}
        </button>
      </div>

      {loading && dados.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-gray-500">
          <RefreshCw size={24} className="animate-spin" />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-1">
          {dados.map((acao) => (
            <button
              key={acao.symbol}
              onClick={() => onSelectAcao(acao.symbol)}
              className={clsx(
                'w-full text-left rounded-lg px-3 py-2.5 transition-colors hover:bg-gray-800',
                selectedSymbol === acao.symbol && 'bg-gray-800 ring-1 ring-green-500/40',
              )}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">
                      {acao.symbol.replace('.SA', '')}
                    </span>
                    <SignalBadge sinal={acao.sinal} size="sm" />
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5 truncate max-w-[140px]">{acao.name}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-white">{formatPreco(acao.preco)}</div>
                  <div
                    className={clsx(
                      'text-xs font-medium flex items-center justify-end gap-0.5',
                      acao.variacao_pct != null && acao.variacao_pct > 0 && 'text-green-400',
                      acao.variacao_pct != null && acao.variacao_pct < 0 && 'text-red-400',
                      acao.variacao_pct === 0 && 'text-gray-400',
                    )}
                  >
                    {acao.variacao_pct != null && acao.variacao_pct > 0 && <TrendingUp size={12} />}
                    {acao.variacao_pct != null && acao.variacao_pct < 0 && <TrendingDown size={12} />}
                    {formatVar(acao.variacao_pct)}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
