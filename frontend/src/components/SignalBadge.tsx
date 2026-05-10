import type { Sinal } from '../types/stock'
import clsx from 'clsx'

const config: Record<Sinal, { label: string; classes: string }> = {
  'FORTE COMPRA': { label: '▲▲ FORTE COMPRA', classes: 'bg-green-500/20 text-green-400 border border-green-500/40' },
  COMPRA: { label: '▲ COMPRA', classes: 'bg-green-700/20 text-green-500 border border-green-700/40' },
  NEUTRO: { label: '● NEUTRO', classes: 'bg-gray-700/40 text-gray-400 border border-gray-600/40' },
  VENDA: { label: '▼ VENDA', classes: 'bg-red-700/20 text-red-400 border border-red-700/40' },
  'FORTE VENDA': { label: '▼▼ FORTE VENDA', classes: 'bg-red-500/20 text-red-400 border border-red-500/40' },
}

interface Props {
  sinal: Sinal
  size?: 'sm' | 'md' | 'lg'
}

export function SignalBadge({ sinal, size = 'md' }: Props) {
  const { label, classes } = config[sinal] ?? config['NEUTRO']
  return (
    <span
      className={clsx(
        'font-bold rounded-full whitespace-nowrap',
        classes,
        size === 'sm' && 'text-xs px-2 py-0.5',
        size === 'md' && 'text-sm px-3 py-1',
        size === 'lg' && 'text-base px-4 py-1.5',
      )}
    >
      {label}
    </span>
  )
}
