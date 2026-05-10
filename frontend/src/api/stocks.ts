import axios from 'axios'
import type { AcaoDetalhe, AcaoResumo, Periodo } from '../types/stock'

const api = axios.create({ baseURL: '/api' })

export async function listarAcoes(): Promise<{ symbol: string; name: string; sector: string }[]> {
  const { data } = await api.get('/acoes')
  return data.acoes
}

export async function buscarAcao(symbol: string, periodo: Periodo = '3mo'): Promise<AcaoDetalhe> {
  const { data } = await api.get(`/acao/${symbol}`, { params: { periodo } })
  return data
}

export async function resumoMercado(): Promise<{ resumo: AcaoResumo[]; atualizado_em: string }> {
  const { data } = await api.get('/resumo')
  return data
}

export async function buscarTicker(q: string): Promise<{ encontrado: boolean; symbol: string; preco?: number }> {
  const { data } = await api.get('/buscar', { params: { q } })
  return data
}
