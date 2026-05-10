export interface AcaoResumo {
  symbol: string
  name: string
  sector: string
  preco: number | null
  variacao_pct: number | null
  sinal: Sinal
  score: number
}

export interface DetalhesIndicador {
  valor?: number
  sinal: string
  macd?: number
  signal?: number
  sma20?: number
  sma50?: number
  preco?: number
  superior?: number
  media?: number
  inferior?: number
  pct_b?: number
}

export interface AnaliseDetalhes {
  rsi?: DetalhesIndicador
  macd?: DetalhesIndicador
  medias_moveis?: DetalhesIndicador
  bollinger?: DetalhesIndicador
}

export interface Analise {
  sinal: Sinal
  score: number
  detalhes: AnaliseDetalhes
}

export interface CandleData {
  data: string
  abertura: number | null
  maxima: number | null
  minima: number | null
  fechamento: number | null
  volume: number | null
}

export interface AcaoInfo {
  nome: string
  setor?: string
  industria?: string
  market_cap?: number
  pe_ratio?: number
  dividend_yield?: number
  '52w_high'?: number
  '52w_low'?: number
}

export interface AcaoDetalhe {
  symbol: string
  info: AcaoInfo
  preco_atual: number | null
  variacao: number | null
  variacao_pct: number | null
  historico: CandleData[]
  analise: Analise
}

export type Sinal = 'FORTE COMPRA' | 'COMPRA' | 'NEUTRO' | 'VENDA' | 'FORTE VENDA'

export type Periodo = '1mo' | '3mo' | '6mo' | '1y'
