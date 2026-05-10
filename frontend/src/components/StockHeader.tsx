import { TrendingUp, TrendingDown, Minus, Search } from 'lucide-react'
import type { AcaoDetalhe, Periodo } from '../types/stock'
import clsx from 'clsx'

interface Props {
  acao: AcaoDetalhe
  periodo: Periodo
  onPeriodoChange: (p: Periodo) => void
}

const periodos: { value: Periodo; label: string }[] = [
  { value: '1mo', label: '1M' },
  { value: '3mo', label: '3M' },
  { value: '6mo', label: '6M' },
  { value: '1y', label: '1A' },
]

function formatMktCap(v?: number | null) {
  if (!v) return null
  if (v >= 1e12) return `R$ ${(v / 1e12).toFixed(1)}T`
  if (v >= 1e9) return `R$ ${(v / 1e9).toFixed(1)}B`
  if (v >= 1e6) return `R$ ${(v / 1e6).toFixed(1)}M`
  return `R$ ${v.toFixed(0)}`
}

export function StockHeader({ acao, periodo, onPeriodoChange }: Props) {
  const { symbol, info, preco_atual, variacao, variacao_pct } = acao
  const isUp = (variacao ?? 0) > 0
  const isDown = (variacao ?? 0) < 0

  return (
    <div className="card">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-600/20 border border-green-600/30 flex items-center justify-center">
              <Search size={18} className="text-green-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{symbol.replace('.SA', '')}</h1>
              <p className="text-sm text-gray-400">{info.nome || symbol}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mt-3">
            {info.setor && (
              <span className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded">{info.setor}</span>
            )}
            {info.market_cap && (
              <span className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded">
                Market Cap: {formatMktCap(info.market_cap)}
              </span>
            )}
            {info.pe_ratio && (
              <span className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded">
                P/L: {info.pe_ratio.toFixed(1)}
              </span>
            )}
            {info.dividend_yield && (
              <span className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded">
                DY: {(info.dividend_yield * 100).toFixed(1)}%
              </span>
            )}
          </div>
        </div>

        <div className="text-right">
          <div className="text-3xl font-bold text-white">
            {preco_atual != null ? `R$ ${preco_atual.toFixed(2)}` : '-'}
          </div>
          <div
            className={clsx(
              'flex items-center justify-end gap-1 text-sm font-medium mt-1',
              isUp && 'text-green-400',
              isDown && 'text-red-400',
              !isUp && !isDown && 'text-gray-400',
            )}
          >
            {isUp && <TrendingUp size={16} />}
            {isDown && <TrendingDown size={16} />}
            {!isUp && !isDown && <Minus size={16} />}
            {variacao != null && variacao_pct != null
              ? `${isUp ? '+' : ''}R$ ${variacao.toFixed(2)} (${isUp ? '+' : ''}${variacao_pct.toFixed(2)}%)`
              : '-'}
          </div>
          {info['52w_high'] && info['52w_low'] && (
            <div className="text-xs text-gray-500 mt-1">
              52s: R${info['52w_low'].toFixed(2)} – R${info['52w_high'].toFixed(2)}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-1 mt-4">
        {periodos.map((p) => (
          <button
            key={p.value}
            onClick={() => onPeriodoChange(p.value)}
            className={clsx(
              'px-3 py-1 rounded text-sm font-medium transition-colors',
              periodo === p.value
                ? 'bg-green-600 text-white'
                : 'text-gray-400 hover:bg-gray-800',
            )}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  )
}
