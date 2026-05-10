import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import type { CandleData, AnaliseDetalhes } from '../types/stock'

interface Props {
  historico: CandleData[]
  analise: AnaliseDetalhes
}

interface ChartPoint {
  data: string
  fechamento: number | null
  volume: number | null
  sma20?: number
  sma50?: number
  bbSuperior?: number
  bbInferior?: number
  bbMedia?: number
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 text-xs shadow-xl">
      <p className="font-semibold text-gray-300 mb-1">{label}</p>
      {payload.map((entry: { name: string; value: number | null; color: string }, i: number) => (
        entry.value != null && (
          <p key={i} style={{ color: entry.color }}>
            {entry.name}: {entry.name === 'Volume' ? entry.value.toLocaleString('pt-BR') : `R$ ${Number(entry.value).toFixed(2)}`}
          </p>
        )
      ))}
    </div>
  )
}

export function StockChart({ historico, analise }: Props) {
  const sma20 = analise.medias_moveis?.sma20
  const sma50 = analise.medias_moveis?.sma50
  const bbSup = analise.bollinger?.superior
  const bbInf = analise.bollinger?.inferior
  const bbMed = analise.bollinger?.media

  const data: ChartPoint[] = historico.map((d, i) => {
    const totalPontos = historico.length
    const idx = i - (totalPontos - 1)
    return {
      data: new Date(d.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      fechamento: d.fechamento,
      volume: d.volume,
      // Projeta os valores do último ponto (aproximação visual)
      sma20: idx === 0 ? sma20 : undefined,
      sma50: idx === 0 ? sma50 : undefined,
      bbSuperior: idx === 0 ? bbSup : undefined,
      bbInferior: idx === 0 ? bbInf : undefined,
      bbMedia: idx === 0 ? bbMed : undefined,
    }
  })

  // Calcula valores mín/máx para o eixo Y
  const prices = historico.map(d => d.fechamento).filter(Boolean) as number[]
  const minPrice = Math.min(...prices) * 0.98
  const maxPrice = Math.max(...prices) * 1.02

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="70%">
        <ComposedChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis
            dataKey="data"
            tick={{ fill: '#6b7280', fontSize: 10 }}
            interval={Math.floor(data.length / 8)}
            tickLine={false}
          />
          <YAxis
            domain={[minPrice, maxPrice]}
            tick={{ fill: '#6b7280', fontSize: 10 }}
            tickFormatter={(v) => `R$${v.toFixed(0)}`}
            tickLine={false}
            axisLine={false}
            width={60}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            iconType="line"
            wrapperStyle={{ fontSize: '11px', color: '#9ca3af', paddingTop: '8px' }}
          />

          {sma20 && <ReferenceLine y={sma20} stroke="#f59e0b" strokeDasharray="4 2" strokeOpacity={0.6} label={{ value: `MM20 R$${sma20.toFixed(2)}`, fill: '#f59e0b', fontSize: 10, position: 'insideBottomRight' }} />}
          {sma50 && <ReferenceLine y={sma50} stroke="#8b5cf6" strokeDasharray="4 2" strokeOpacity={0.6} label={{ value: `MM50 R$${sma50.toFixed(2)}`, fill: '#8b5cf6', fontSize: 10, position: 'insideTopRight' }} />}
          {bbSup && <ReferenceLine y={bbSup} stroke="#06b6d4" strokeDasharray="2 3" strokeOpacity={0.5} />}
          {bbInf && <ReferenceLine y={bbInf} stroke="#06b6d4" strokeDasharray="2 3" strokeOpacity={0.5} label={{ value: 'Bandas Bollinger', fill: '#06b6d4', fontSize: 10, position: 'insideBottomLeft' }} />}

          <Line
            type="monotone"
            dataKey="fechamento"
            name="Preço"
            stroke="#22c55e"
            dot={false}
            strokeWidth={2}
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>

      <ResponsiveContainer width="100%" height="28%">
        <ComposedChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis dataKey="data" hide />
          <YAxis
            tick={{ fill: '#6b7280', fontSize: 9 }}
            tickFormatter={(v) => v >= 1e6 ? `${(v / 1e6).toFixed(0)}M` : `${(v / 1e3).toFixed(0)}k`}
            tickLine={false}
            axisLine={false}
            width={60}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="volume" name="Volume" fill="#374151" opacity={0.8} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
