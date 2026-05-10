import type { Analise } from '../types/stock'
import { SignalBadge } from './SignalBadge'
import type { Sinal } from '../types/stock'
import clsx from 'clsx'

interface Props {
  analise: Analise
}

function IndicadorRow({ label, valor, sinal }: { label: string; valor?: string; sinal?: string }) {
  const isBuy = sinal?.includes('COMPRA')
  const isSell = sinal?.includes('VENDA')
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-800/60 last:border-0">
      <div>
        <div className="text-sm font-medium text-gray-200">{label}</div>
        {valor && <div className="text-xs text-gray-500">{valor}</div>}
      </div>
      {sinal && (
        <span
          className={clsx(
            'text-xs font-semibold px-2 py-0.5 rounded',
            isBuy && 'text-green-400 bg-green-400/10',
            isSell && 'text-red-400 bg-red-400/10',
            !isBuy && !isSell && 'text-gray-400 bg-gray-700/40',
          )}
        >
          {sinal}
        </span>
      )}
    </div>
  )
}

function ScoreBar({ score }: { score: number }) {
  const pct = ((score + 8) / 16) * 100
  const clamped = Math.max(0, Math.min(100, pct))
  return (
    <div className="mt-1">
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>Venda</span>
        <span className="font-medium text-gray-300">Score: {score > 0 ? `+${score}` : score}</span>
        <span>Compra</span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={clsx(
            'h-full rounded-full transition-all duration-500',
            score >= 2 ? 'bg-green-500' : score <= -2 ? 'bg-red-500' : 'bg-yellow-500',
          )}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  )
}

export function IndicatorPanel({ analise }: Props) {
  const { sinal, score, detalhes } = analise

  return (
    <div className="card h-full flex flex-col">
      <h2 className="font-semibold text-white mb-3">Análise Técnica</h2>

      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-400">Sinal Geral</span>
        <SignalBadge sinal={sinal as Sinal} size="lg" />
      </div>

      <ScoreBar score={score} />

      <div className="mt-4 flex-1 overflow-y-auto">
        {detalhes.rsi && (
          <IndicadorRow
            label="RSI (14)"
            valor={`${detalhes.rsi.valor?.toFixed(1)}`}
            sinal={detalhes.rsi.sinal}
          />
        )}
        {detalhes.macd && (
          <IndicadorRow
            label="MACD (12/26/9)"
            valor={`MACD ${detalhes.macd.macd?.toFixed(3)} | Sinal ${detalhes.macd.signal?.toFixed(3)}`}
            sinal={detalhes.macd.sinal}
          />
        )}
        {detalhes.medias_moveis && (
          <IndicadorRow
            label="Médias Móveis"
            valor={`MM20 R$${detalhes.medias_moveis.sma20?.toFixed(2)} | MM50 R$${detalhes.medias_moveis.sma50?.toFixed(2)}`}
            sinal={detalhes.medias_moveis.sinal}
          />
        )}
        {detalhes.bollinger && (
          <IndicadorRow
            label="Bandas de Bollinger"
            valor={`%B: ${(detalhes.bollinger.pct_b ?? 0 * 100).toFixed(0)}% | R$${detalhes.bollinger.inferior?.toFixed(2)} - R$${detalhes.bollinger.superior?.toFixed(2)}`}
            sinal={detalhes.bollinger.sinal}
          />
        )}
      </div>

      <p className="text-xs text-gray-600 mt-3 pt-3 border-t border-gray-800">
        Indicadores baseados em análise técnica. Não constitui recomendação de investimento.
      </p>
    </div>
  )
}
