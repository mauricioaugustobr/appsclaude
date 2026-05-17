import React from 'react';
import { Film, MousePointer2, Scissors, Type, Volume2, Download } from 'lucide-react';
import clsx from 'clsx';

export type ToolType = 'select' | 'split' | 'text' | 'volume';

interface ToolbarProps {
  activeTool: ToolType;
  onToolChange: (tool: ToolType) => void;
  onExport: () => void;
}

const tools: { id: ToolType; icon: React.ReactNode; label: string }[] = [
  { id: 'select', icon: <MousePointer2 size={18} />, label: 'Selecionar' },
  { id: 'split', icon: <Scissors size={18} />, label: 'Dividir' },
  { id: 'text', icon: <Type size={18} />, label: 'Texto' },
  { id: 'volume', icon: <Volume2 size={18} />, label: 'Volume' },
];

export default function Toolbar({ activeTool, onToolChange, onExport }: ToolbarProps) {
  return (
    <div
      className="flex items-center h-12 px-4 gap-4 flex-none"
      style={{ background: '#1a1a1a', borderBottom: '1px solid #2a2a2a' }}
    >
      {/* Left: App title */}
      <div className="flex items-center gap-2 text-white font-bold text-lg select-none">
        <Film size={22} className="text-blue-400" />
        <span>VideoEditor</span>
      </div>

      <div className="flex-1" />

      {/* Center: Tool buttons */}
      <div className="flex items-center gap-1">
        {tools.map((tool) => (
          <button
            key={tool.id}
            title={tool.label}
            onClick={() => onToolChange(tool.id)}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors',
              activeTool === tool.id
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-white/10'
            )}
          >
            {tool.icon}
            <span className="hidden sm:inline">{tool.label}</span>
          </button>
        ))}
      </div>

      <div className="flex-1" />

      {/* Right: Export */}
      <button
        onClick={onExport}
        className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded font-semibold text-sm transition-colors"
      >
        <Download size={16} />
        Exportar
      </button>
    </div>
  );
}
