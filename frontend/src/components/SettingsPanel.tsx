import { useMemo, useState } from 'react'
import { ChevronDown, Settings2 } from 'lucide-react'
import clsx from 'clsx'
import type {
  CompressionMode,
  ConvertSettings,
  FormatsResponse,
} from '../types/convert'

interface SettingsPanelProps {
  formats: FormatsResponse
  settings: ConvertSettings
  onChange: (patch: Partial<ConvertSettings>) => void
}

const MODE_LABELS: { id: CompressionMode; label: string; hint: string }[] = [
  { id: 'quality', label: 'Por qualidade', hint: 'Escolha um nível; o tamanho varia conforme o vídeo.' },
  { id: 'target_size', label: 'Tamanho alvo', hint: 'Defina o tamanho final em MB.' },
  { id: 'target_percent', label: 'Reduzir %', hint: 'Reduza para uma porcentagem do tamanho original.' },
  { id: 'bitrate', label: 'Bitrate manual', hint: 'Defina o bitrate de vídeo em kbps.' },
]

export default function SettingsPanel({ formats, settings, onChange }: SettingsPanelProps) {
  const [advanced, setAdvanced] = useState(false)

  const currentFormat = useMemo(
    () => formats.output_formats.find((f) => f.id === settings.output_format),
    [formats, settings.output_format],
  )

  const isAudioOnly = currentFormat?.audio_only
  const isAnimated = currentFormat?.animated_image
  const availableCodecs = currentFormat?.codecs ?? []

  return (
    <div className="card space-y-5">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
        <Settings2 className="h-4 w-4 text-brand-400" />
        Configurações de conversão
      </div>

      {/* Formato de saída */}
      <div>
        <label className="field-label">Formato de saída</label>
        <select
          className="select-input"
          value={settings.output_format}
          onChange={(e) => onChange({ output_format: e.target.value, codec: '' })}
        >
          {formats.output_formats.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      {/* Codec de vídeo */}
      {!isAudioOnly && !isAnimated && availableCodecs.length > 0 && (
        <div>
          <label className="field-label">Codec de vídeo</label>
          <select
            className="select-input"
            value={settings.codec}
            onChange={(e) => onChange({ codec: e.target.value })}
          >
            <option value="">Padrão do formato</option>
            {availableCodecs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Modo de compressão (apenas vídeo) */}
      {!isAudioOnly && !isAnimated && (
        <div>
          <label className="field-label">Modo de compressão</label>
          <div className="grid grid-cols-2 gap-2">
            {MODE_LABELS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => onChange({ mode: m.id })}
                className={clsx(
                  'rounded-lg border px-3 py-2 text-left text-xs transition-colors',
                  settings.mode === m.id
                    ? 'border-brand-500 bg-brand-500/10 text-white'
                    : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:border-slate-600',
                )}
              >
                <div className="font-medium">{m.label}</div>
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-slate-500">
            {MODE_LABELS.find((m) => m.id === settings.mode)?.hint}
          </p>
        </div>
      )}

      {/* Parâmetro específico do modo */}
      {!isAudioOnly && !isAnimated && settings.mode === 'quality' && (
        <div>
          <label className="field-label">Nível de qualidade</label>
          <select
            className="select-input"
            value={settings.level}
            onChange={(e) => onChange({ level: e.target.value })}
          >
            {formats.compression_levels.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {!isAudioOnly && !isAnimated && settings.mode === 'target_size' && (
        <div>
          <label className="field-label">Tamanho alvo (MB)</label>
          <input
            type="number"
            min={1}
            className="select-input"
            value={settings.target_size_mb || ''}
            placeholder="Ex.: 10"
            onChange={(e) => onChange({ target_size_mb: Number(e.target.value) })}
          />
        </div>
      )}

      {!isAudioOnly && !isAnimated && settings.mode === 'target_percent' && (
        <div>
          <label className="field-label">
            Reduzir para {settings.target_percent || 50}% do original
          </label>
          <input
            type="range"
            min={10}
            max={95}
            step={5}
            className="w-full accent-brand-500"
            value={settings.target_percent || 50}
            onChange={(e) => onChange({ target_percent: Number(e.target.value) })}
          />
        </div>
      )}

      {!isAudioOnly && !isAnimated && settings.mode === 'bitrate' && (
        <div>
          <label className="field-label">Bitrate de vídeo (kbps)</label>
          <input
            type="number"
            min={100}
            className="select-input"
            value={settings.video_bitrate_kbps || ''}
            placeholder="Ex.: 2000"
            onChange={(e) => onChange({ video_bitrate_kbps: Number(e.target.value) })}
          />
        </div>
      )}

      {/* Resolução */}
      {!isAudioOnly && (
        <div>
          <label className="field-label">Resolução</label>
          <select
            className="select-input"
            value={settings.resolution}
            onChange={(e) => onChange({ resolution: e.target.value })}
          >
            {formats.resolutions.map((r) => (
              <option key={r} value={r}>
                {r === 'original' ? 'Manter original' : r}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Opções avançadas */}
      <div className="border-t border-slate-800 pt-4">
        <button
          type="button"
          onClick={() => setAdvanced((v) => !v)}
          className="flex w-full items-center justify-between text-sm font-medium text-slate-300"
        >
          Opções avançadas
          <ChevronDown
            className={clsx('h-4 w-4 transition-transform', advanced && 'rotate-180')}
          />
        </button>

        {advanced && (
          <div className="mt-4 space-y-4">
            {!isAudioOnly && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">FPS</label>
                  <select
                    className="select-input"
                    value={settings.fps}
                    onChange={(e) => onChange({ fps: Number(e.target.value) })}
                  >
                    <option value={0}>Original</option>
                    {[60, 30, 25, 24, 15].map((f) => (
                      <option key={f} value={f}>
                        {f} fps
                      </option>
                    ))}
                  </select>
                </div>
                {!isAnimated && (
                  <div>
                    <label className="field-label">Velocidade de encode</label>
                    <select
                      className="select-input"
                      value={settings.speed}
                      onChange={(e) => onChange({ speed: e.target.value })}
                    >
                      {formats.speed_presets.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {!isAnimated && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">Codec de áudio</label>
                  <select
                    className="select-input"
                    value={settings.audio_codec}
                    disabled={settings.remove_audio}
                    onChange={(e) => onChange({ audio_codec: e.target.value })}
                  >
                    <option value="">Padrão</option>
                    {formats.audio_codecs
                      .filter((a) => a !== 'none')
                      .map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="field-label">Bitrate de áudio (kbps)</label>
                  <select
                    className="select-input"
                    value={settings.audio_bitrate_kbps}
                    disabled={settings.remove_audio}
                    onChange={(e) =>
                      onChange({ audio_bitrate_kbps: Number(e.target.value) })
                    }
                  >
                    {[320, 256, 192, 128, 96, 64].map((b) => (
                      <option key={b} value={b}>
                        {b} kbps
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {!isAnimated && (
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-brand-500"
                  checked={settings.remove_audio}
                  onChange={(e) => onChange({ remove_audio: e.target.checked })}
                />
                Remover áudio
              </label>
            )}

            {!isAudioOnly && !isAnimated &&
              (settings.mode === 'target_size' ||
                settings.mode === 'target_percent' ||
                settings.mode === 'bitrate') && (
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-brand-500"
                    checked={settings.two_pass}
                    onChange={(e) => onChange({ two_pass: e.target.checked })}
                  />
                  Codificação em duas passagens (mais preciso, porém mais lento)
                </label>
              )}
          </div>
        )}
      </div>
    </div>
  )
}
