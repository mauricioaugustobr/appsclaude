import { useCallback, useRef, useState } from 'react'
import { UploadCloud } from 'lucide-react'
import clsx from 'clsx'

interface DropzoneProps {
  onFiles: (files: File[]) => void
  acceptExtensions: string[]
}

export default function Dropzone({ onFiles, acceptExtensions }: DropzoneProps) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const accept = acceptExtensions.map((e) => `.${e}`).join(',')

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      const files = Array.from(e.dataTransfer.files)
      if (files.length) onFiles(files)
    },
    [onFiles],
  )

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={clsx(
        'cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition-colors',
        dragging
          ? 'border-brand-500 bg-brand-500/10'
          : 'border-slate-700 bg-slate-900/40 hover:border-brand-500/60 hover:bg-slate-900/70',
      )}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={accept + ',video/*'}
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files || [])
          if (files.length) onFiles(files)
          e.target.value = ''
        }}
      />
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-600/20">
        <UploadCloud className="h-7 w-7 text-brand-400" />
      </div>
      <p className="mt-4 text-base font-medium text-slate-200">
        Arraste seus vídeos aqui ou clique para selecionar
      </p>
      <p className="mt-1 text-sm text-slate-500">
        Vários arquivos de uma vez · MP4, MOV, AVI, MKV, WEBM, FLV, WMV e muitos outros
      </p>
    </div>
  )
}
