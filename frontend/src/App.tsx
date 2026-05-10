import { useState, useEffect, useCallback } from 'react'
import { TrendingUp, RefreshCw, AlertCircle } from 'lucide-react'
import { buscarAcao } from './api/stocks'
import type { AcaoDetalhe, Periodo } from './types/stock'
import { MarketOverview } from './components/MarketOverview'
import { StockChart } from './components/StockChart'
import { StockHeader } from './components/StockHeader'
import { IndicatorPanel } from './components/IndicatorPanel'
import { SearchBar } from './components/SearchBar'

const ACAO_PADRAO = 'PETR4.SA'

export default function App() {
  const [selectedSymbol, setSelectedSymbol] = useState<string>(ACAO_PADRAO)
  const [periodo, setPeriodo] = useState<Periodo>('3mo')
  const [acao, setAcao] = useState<AcaoDetalhe | null>(null)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const carregarAcao = useCallback(async (symbol: string, p: Periodo) => {
    setLoading(true)
    setErro(null)
    try {
      const data = await buscarAcao(symbol, p)
      setAcao(data)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao carregar dados da ação.'
      setErro(msg)
      setAcao(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    carregarAcao(selectedSymbol, periodo)
  }, [selectedSymbol, periodo, carregarAcao])

  const handleSelectAcao = (symbol: string) => {
    setSelectedSymbol(symbol)
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between gap-4 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
            <TrendingUp size={18} className="text-white" />
          </div>
          <div>
            <span className="font-bold text-white text-lg">AçõesBR</span>
            <span className="text-xs text-gray-500 ml-2 hidden sm:inline">Rastreador de Ações Brasileiras</span>
          </div>
        </div>

        <SearchBar onSelect={handleSelectAcao} />
      </header>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 min-w-[240px] border-r border-gray-800 p-3 hidden md:flex flex-col overflow-hidden">
          <MarketOverview onSelectAcao={handleSelectAcao} selectedSymbol={selectedSymbol} />
        </aside>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading && (
            <div className="flex items-center justify-center h-64">
              <div className="flex flex-col items-center gap-3 text-gray-400">
                <RefreshCw size={32} className="animate-spin text-green-500" />
                <p>Carregando dados da ação...</p>
              </div>
            </div>
          )}

          {erro && !loading && (
            <div className="flex items-center justify-center h-64">
              <div className="card max-w-md text-center">
                <AlertCircle size={40} className="text-red-400 mx-auto mb-3" />
                <p className="text-red-400 font-semibold mb-1">Erro ao carregar dados</p>
                <p className="text-gray-500 text-sm mb-4">{erro}</p>
                <button
                  onClick={() => carregarAcao(selectedSymbol, periodo)}
                  className="btn-primary"
                >
                  Tentar Novamente
                </button>
              </div>
            </div>
          )}

          {acao && !loading && !erro && (
            <>
              <StockHeader
                acao={acao}
                periodo={periodo}
                onPeriodoChange={setPeriodo}
              />

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                {/* Chart — 2/3 */}
                <div className="xl:col-span-2 card" style={{ minHeight: 420 }}>
                  <h2 className="font-semibold text-white mb-3">
                    Histórico de Preços — {acao.symbol.replace('.SA', '')}
                  </h2>
                  <div style={{ height: 380 }}>
                    <StockChart historico={acao.historico} analise={acao.analise.detalhes} />
                  </div>
                </div>

                {/* Indicators — 1/3 */}
                <div className="xl:col-span-1" style={{ minHeight: 420 }}>
                  <IndicatorPanel analise={acao.analise} />
                </div>
              </div>

              {/* Mobile market overview */}
              <div className="md:hidden">
                <MarketOverview onSelectAcao={handleSelectAcao} selectedSymbol={selectedSymbol} />
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
