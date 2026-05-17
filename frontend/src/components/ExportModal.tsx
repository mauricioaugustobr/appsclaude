import React, { useState, useRef } from 'react';
import { X, Download, Loader } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  duration: number;
  onSeekTo: (t: number) => void;
  onPlay: (playing: boolean) => void;
}

type Format = 'video/webm' | 'video/mp4';
type Quality = 'high' | 'medium' | 'low';

const QUALITY_LABEL: Record<Quality, string> = {
  high: 'Alta (720p)',
  medium: 'Média (480p)',
  low: 'Baixa (360p)',
};

export default function ExportModal({
  isOpen,
  onClose,
  canvasRef,
  duration,
  onSeekTo,
  onPlay,
}: ExportModalProps) {
  const [format, setFormat] = useState<Format>('video/webm');
  const [quality, setQuality] = useState<Quality>('high');
  const [progress, setProgress] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  if (!isOpen) return null;

  const handleExport = async () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      setError('Canvas não encontrado.');
      return;
    }

    setExporting(true);
    setProgress(0);
    setDownloadUrl(null);
    setError(null);

    try {
      const fps = 30;
      const stream = canvas.captureStream(fps);

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';

      const bitrate: Record<Quality, number> = {
        high: 4_000_000,
        medium: 2_000_000,
        low: 800_000,
      };

      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: bitrate[quality],
      });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setDownloadUrl(url);
        setProgress(100);
        setExporting(false);
      };

      recorder.start(100);

      // Seek to 0 and play frame by frame via timer
      onSeekTo(0);
      onPlay(false);

      const totalFrames = Math.ceil(duration * fps);
      let frame = 0;

      const advanceFrame = () => {
        if (frame >= totalFrames) {
          onPlay(false);
          recorder.stop();
          return;
        }
        const t = frame / fps;
        onSeekTo(t);
        setProgress(Math.round((frame / totalFrames) * 100));
        frame++;
        setTimeout(advanceFrame, 1000 / fps);
      };

      advanceFrame();
    } catch (err) {
      setError('Erro ao exportar: ' + (err instanceof Error ? err.message : String(err)));
      setExporting(false);
    }
  };

  const handleCancel = () => {
    if (mediaRecorderRef.current && exporting) {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    setExporting(false);
    setProgress(0);
    onClose();
  };

  const ext = format === 'video/webm' ? 'webm' : 'mp4';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.7)' }}
    >
      <div
        className="rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
        style={{ background: '#1e1e1e', border: '1px solid #3a3a3a' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid #2a2a2a' }}
        >
          <h2 className="text-white font-semibold text-base flex items-center gap-2">
            <Download size={18} className="text-blue-400" />
            Exportar Vídeo
          </h2>
          <button
            onClick={handleCancel}
            className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">
          {/* Format */}
          <div className="space-y-2">
            <label className="text-xs text-gray-400 font-medium">Formato</label>
            <div className="flex gap-2">
              {(['video/webm', 'video/mp4'] as Format[]).map((f) => (
                <button
                  key={f}
                  disabled={exporting}
                  onClick={() => setFormat(f)}
                  className={`flex-1 py-2 rounded text-sm font-medium transition-colors ${
                    format === f
                      ? 'bg-blue-600 text-white'
                      : 'bg-[#2a2a2a] text-gray-400 hover:text-white'
                  } disabled:opacity-40`}
                >
                  {f === 'video/webm' ? 'WebM' : 'MP4'}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-600">
              {format === 'video/mp4'
                ? 'Nota: MP4 exporta como WebM renomeado (sem re-encode no browser).'
                : 'WebM é o formato nativo do MediaRecorder.'}
            </p>
          </div>

          {/* Quality */}
          <div className="space-y-2">
            <label className="text-xs text-gray-400 font-medium">Qualidade</label>
            <div className="flex gap-2">
              {(['high', 'medium', 'low'] as Quality[]).map((q) => (
                <button
                  key={q}
                  disabled={exporting}
                  onClick={() => setQuality(q)}
                  className={`flex-1 py-2 rounded text-sm font-medium transition-colors ${
                    quality === q
                      ? 'bg-blue-600 text-white'
                      : 'bg-[#2a2a2a] text-gray-400 hover:text-white'
                  } disabled:opacity-40`}
                >
                  {QUALITY_LABEL[q]}
                </button>
              ))}
            </div>
          </div>

          {/* Duration info */}
          <div
            className="rounded p-3 text-sm"
            style={{ background: '#252525' }}
          >
            <div className="flex justify-between text-gray-400">
              <span>Duração total</span>
              <span className="font-mono text-white">
                {Math.floor(duration / 60).toString().padStart(2, '0')}:
                {Math.floor(duration % 60).toString().padStart(2, '0')}
              </span>
            </div>
          </div>

          {/* Progress */}
          {(exporting || downloadUrl) && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-400">
                <span>{exporting ? 'Exportando...' : 'Concluído!'}</span>
                <span>{progress}%</span>
              </div>
              <div
                className="w-full rounded-full overflow-hidden"
                style={{ height: 6, background: '#2a2a2a' }}
              >
                <div
                  className="h-full bg-blue-500 transition-all duration-200 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded p-3 text-sm text-red-400" style={{ background: '#2a1a1a' }}>
              {error}
            </div>
          )}

          {/* Download link */}
          {downloadUrl && (
            <a
              href={downloadUrl}
              download={`video_export.${ext}`}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded bg-green-600 hover:bg-green-500 text-white font-semibold text-sm transition-colors"
            >
              <Download size={16} />
              Baixar Vídeo (.{ext})
            </a>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex gap-3 px-5 py-4"
          style={{ borderTop: '1px solid #2a2a2a' }}
        >
          <button
            onClick={handleCancel}
            className="flex-1 py-2 rounded text-sm text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            {exporting ? 'Cancelar' : 'Fechar'}
          </button>
          {!downloadUrl && (
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex-1 py-2 rounded text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {exporting ? (
                <>
                  <Loader size={14} className="animate-spin" />
                  Exportando...
                </>
              ) : (
                <>
                  <Download size={14} />
                  Exportar
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
