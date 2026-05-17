import React from 'react';
import { useEditor } from '../store/editorStore';
import { Clip } from '../types/editor';

interface LabeledInputProps {
  label: string;
  children: React.ReactNode;
}
function LabeledInput({ label, children }: LabeledInputProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-400 font-medium">{label}</label>
      {children}
    </div>
  );
}

function inputClass(extra = '') {
  return `w-full rounded px-2 py-1.5 text-sm text-white bg-[#2a2a2a] border border-[#3a3a3a] focus:outline-none focus:border-blue-500 ${extra}`;
}

export default function PropertiesPanel() {
  const { state, dispatch } = useEditor();
  const clip: Clip | undefined = state.clips.find(
    (c) => c.id === state.selectedClipId
  );

  const update = (changes: Partial<Clip>) => {
    if (!clip) return;
    dispatch({ type: 'UPDATE_CLIP', payload: { id: clip.id, changes } });
  };

  return (
    <div
      className="flex flex-col h-full flex-none overflow-hidden"
      style={{ width: 256, background: '#181818', borderLeft: '1px solid #2a2a2a' }}
    >
      <div
        className="flex items-center px-4 py-3 flex-none"
        style={{ borderBottom: '1px solid #2a2a2a' }}
      >
        <span className="text-white font-semibold text-sm">Propriedades</span>
      </div>

      {!clip ? (
        <div className="flex-1 flex items-center justify-center text-gray-600 text-sm text-center px-4">
          Nenhum item selecionado
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {/* Common: name */}
          <LabeledInput label="Nome">
            <input
              type="text"
              className={inputClass()}
              value={clip.name}
              onChange={(e) => update({ name: e.target.value })}
            />
          </LabeledInput>

          {/* Text clip properties */}
          {clip.type === 'text' && (
            <>
              <LabeledInput label="Texto">
                <textarea
                  className={inputClass('resize-none h-20')}
                  value={clip.text ?? ''}
                  onChange={(e) => update({ text: e.target.value })}
                />
              </LabeledInput>

              <LabeledInput label="Família da Fonte">
                <select
                  className={inputClass()}
                  value={clip.fontFamily ?? 'Arial'}
                  onChange={(e) => update({ fontFamily: e.target.value })}
                >
                  {['Arial', 'Roboto', 'Georgia', 'Impact', 'Courier'].map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </LabeledInput>

              <LabeledInput label="Tamanho da Fonte">
                <input
                  type="number"
                  className={inputClass()}
                  value={clip.fontSize ?? 48}
                  min={8}
                  max={200}
                  onChange={(e) => update({ fontSize: Number(e.target.value) })}
                />
              </LabeledInput>

              <div className="grid grid-cols-2 gap-2">
                <LabeledInput label="Cor do Texto">
                  <input
                    type="color"
                    className="w-full h-8 rounded cursor-pointer bg-[#2a2a2a] border border-[#3a3a3a]"
                    value={clip.color ?? '#ffffff'}
                    onChange={(e) => update({ color: e.target.value })}
                  />
                </LabeledInput>
                <LabeledInput label="Cor de Fundo">
                  <input
                    type="color"
                    className="w-full h-8 rounded cursor-pointer bg-[#2a2a2a] border border-[#3a3a3a]"
                    value={clip.bgColor ?? '#000000'}
                    onChange={(e) => update({ bgColor: e.target.value })}
                  />
                </LabeledInput>
              </div>

              <LabeledInput label="Estilo">
                <div className="flex gap-2">
                  <button
                    onClick={() => update({ bold: !clip.bold })}
                    className={`flex-1 py-1.5 rounded text-sm font-bold transition-colors ${
                      clip.bold
                        ? 'bg-blue-600 text-white'
                        : 'bg-[#2a2a2a] text-gray-400 hover:text-white'
                    }`}
                  >
                    N
                  </button>
                  <button
                    onClick={() => update({ italic: !clip.italic })}
                    className={`flex-1 py-1.5 rounded text-sm italic transition-colors ${
                      clip.italic
                        ? 'bg-blue-600 text-white'
                        : 'bg-[#2a2a2a] text-gray-400 hover:text-white'
                    }`}
                  >
                    I
                  </button>
                </div>
              </LabeledInput>

              <LabeledInput label="Alinhamento">
                <div className="flex gap-2">
                  {(['left', 'center', 'right'] as const).map((a) => (
                    <button
                      key={a}
                      onClick={() => update({ align: a })}
                      className={`flex-1 py-1.5 rounded text-xs transition-colors ${
                        (clip.align ?? 'center') === a
                          ? 'bg-blue-600 text-white'
                          : 'bg-[#2a2a2a] text-gray-400 hover:text-white'
                      }`}
                    >
                      {a === 'left' ? '⫷' : a === 'center' ? '≡' : '⫸'}
                    </button>
                  ))}
                </div>
              </LabeledInput>

              <LabeledInput label={`Posição X: ${Math.round((clip.posX ?? 0.5) * 100)}%`}>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round((clip.posX ?? 0.5) * 100)}
                  onChange={(e) => update({ posX: Number(e.target.value) / 100 })}
                  className="w-full accent-blue-500"
                />
              </LabeledInput>

              <LabeledInput label={`Posição Y: ${Math.round((clip.posY ?? 0.8) * 100)}%`}>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round((clip.posY ?? 0.8) * 100)}
                  onChange={(e) => update({ posY: Number(e.target.value) / 100 })}
                  className="w-full accent-blue-500"
                />
              </LabeledInput>
            </>
          )}

          {/* Video / Audio / Image properties */}
          {(clip.type === 'video' || clip.type === 'audio' || clip.type === 'image') && (
            <>
              {(clip.type === 'video' || clip.type === 'audio') && (
                <>
                  <LabeledInput label={`Volume: ${Math.round((clip.volume ?? 1) * 100)}%`}>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={Math.round((clip.volume ?? 1) * 100)}
                      onChange={(e) => update({ volume: Number(e.target.value) / 100 })}
                      className="w-full accent-blue-500"
                    />
                  </LabeledInput>

                  <LabeledInput label="Mudo">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => update({ muted: !clip.muted })}
                        className={`px-3 py-1.5 rounded text-xs transition-colors ${
                          clip.muted
                            ? 'bg-red-600 text-white'
                            : 'bg-[#2a2a2a] text-gray-400 hover:text-white'
                        }`}
                      >
                        {clip.muted ? 'Ativado' : 'Desativado'}
                      </button>
                    </div>
                  </LabeledInput>
                </>
              )}

              {(clip.type === 'video' || clip.type === 'image') && (
                <LabeledInput label={`Opacidade: ${Math.round((clip.opacity ?? 1) * 100)}%`}>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round((clip.opacity ?? 1) * 100)}
                    onChange={(e) => update({ opacity: Number(e.target.value) / 100 })}
                    className="w-full accent-blue-500"
                  />
                </LabeledInput>
              )}

              <div
                className="rounded p-2 space-y-1"
                style={{ background: '#222' }}
              >
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Início do Trim</span>
                  <span className="text-gray-300 font-mono">
                    {clip.trimStart.toFixed(2)}s
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Duração</span>
                  <span className="text-gray-300 font-mono">
                    {clip.duration.toFixed(2)}s
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Início na Timeline</span>
                  <span className="text-gray-300 font-mono">
                    {clip.startTime.toFixed(2)}s
                  </span>
                </div>
              </div>
            </>
          )}

          {/* Delete clip */}
          <button
            onClick={() => dispatch({ type: 'REMOVE_CLIP', payload: clip.id })}
            className="w-full py-2 rounded text-sm text-red-400 hover:bg-red-500/10 border border-red-500/20 transition-colors"
          >
            Remover Clipe
          </button>
        </div>
      )}
    </div>
  );
}
