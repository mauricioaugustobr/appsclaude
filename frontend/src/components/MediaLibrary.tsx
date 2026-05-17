import React, { useRef, useState } from 'react';
import { Plus, Film, Music, Image, Trash2, FileVideo } from 'lucide-react';
import { useEditor } from '../store/editorStore';
import { MediaFile, Clip } from '../types/editor';

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

async function getVideoDuration(file: File): Promise<{ duration: number; width: number; height: number; thumbnail: string }> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.src = URL.createObjectURL(file);
    video.onloadeddata = () => {
      video.currentTime = 0.1;
    };
    video.onseeked = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 120;
      canvas.height = 68;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.drawImage(video, 0, 0, 120, 68);
      const thumbnail = canvas.toDataURL('image/jpeg', 0.7);
      resolve({
        duration: video.duration || 10,
        width: video.videoWidth,
        height: video.videoHeight,
        thumbnail,
      });
      URL.revokeObjectURL(video.src);
    };
    video.onerror = () => resolve({ duration: 10, width: 1280, height: 720, thumbnail: '' });
  });
}

async function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const audio = document.createElement('audio');
    audio.src = URL.createObjectURL(file);
    audio.onloadedmetadata = () => {
      resolve(audio.duration || 10);
      URL.revokeObjectURL(audio.src);
    };
    audio.onerror = () => resolve(10);
  });
}

async function getImageDimensions(file: File): Promise<{ width: number; height: number; thumbnail: string }> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight, thumbnail: img.src });
    };
    img.onerror = () => resolve({ width: 1280, height: 720, thumbnail: '' });
  });
}

const TypeIcon = ({ type }: { type: MediaFile['type'] }) => {
  if (type === 'video') return <Film size={14} className="text-blue-400 flex-none" />;
  if (type === 'audio') return <Music size={14} className="text-green-400 flex-none" />;
  return <Image size={14} className="text-purple-400 flex-none" />;
};

export default function MediaLibrary() {
  const { state, dispatch } = useEditor();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setLoading(true);
    for (const file of files) {
      const id = crypto.randomUUID();
      const src = URL.createObjectURL(file);
      let mediaFile: MediaFile;

      if (file.type.startsWith('video/')) {
        const meta = await getVideoDuration(file);
        mediaFile = {
          id,
          name: file.name,
          type: 'video',
          file,
          src,
          duration: meta.duration,
          width: meta.width,
          height: meta.height,
          thumbnail: meta.thumbnail,
        };
      } else if (file.type.startsWith('audio/')) {
        const duration = await getAudioDuration(file);
        mediaFile = { id, name: file.name, type: 'audio', file, src, duration };
      } else {
        const meta = await getImageDimensions(file);
        mediaFile = {
          id,
          name: file.name,
          type: 'image',
          file,
          src,
          duration: 5,
          width: meta.width,
          height: meta.height,
          thumbnail: meta.thumbnail,
        };
      }
      dispatch({ type: 'ADD_MEDIA', payload: mediaFile });
    }
    setLoading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDoubleClick = (media: MediaFile) => {
    let track = 0;
    if (media.type === 'audio') track = 2;
    else if (media.type === 'image') track = 0;

    // Find gap or append after last clip on that track
    const trackClips = state.clips.filter((c) => c.track === track);
    const startTime =
      trackClips.length > 0
        ? Math.max(...trackClips.map((c) => c.startTime + c.duration))
        : state.currentTime;

    const clip: Clip = {
      id: crypto.randomUUID(),
      mediaId: media.id,
      type: media.type === 'audio' ? 'audio' : media.type === 'image' ? 'image' : 'video',
      name: media.name,
      track,
      startTime,
      duration: media.duration,
      trimStart: 0,
      volume: 1,
      muted: false,
      opacity: 1,
    };
    dispatch({ type: 'ADD_CLIP', payload: clip });
    dispatch({ type: 'SELECT_CLIP', payload: clip.id });
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    dispatch({ type: 'REMOVE_MEDIA', payload: id });
  };

  return (
    <div
      className="flex flex-col h-full flex-none overflow-hidden"
      style={{ width: 256, background: '#181818', borderRight: '1px solid #2a2a2a' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 flex-none"
        style={{ borderBottom: '1px solid #2a2a2a' }}
      >
        <span className="text-white font-semibold text-sm">Mídia</span>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1 px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors"
        >
          <Plus size={14} />
          Importar
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*,audio/*,image/*"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* File list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {loading && (
          <div className="text-gray-500 text-xs text-center py-4">Carregando...</div>
        )}
        {state.mediaFiles.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-600">
            <FileVideo size={40} />
            <p className="text-xs text-center">
              Importe vídeos, áudios ou imagens para começar
            </p>
          </div>
        )}
        {state.mediaFiles.map((media) => (
          <div
            key={media.id}
            onDoubleClick={() => handleDoubleClick(media)}
            onMouseEnter={() => setHoveredId(media.id)}
            onMouseLeave={() => setHoveredId(null)}
            className="relative flex items-center gap-2 p-2 rounded cursor-pointer group transition-colors"
            style={{
              background: hoveredId === media.id ? '#2a2a2a' : 'transparent',
            }}
            title="Duplo clique para adicionar à timeline"
          >
            {/* Thumbnail or icon */}
            <div
              className="flex-none rounded overflow-hidden flex items-center justify-center bg-gray-800"
              style={{ width: 52, height: 36 }}
            >
              {media.thumbnail ? (
                <img
                  src={media.thumbnail}
                  alt={media.name}
                  className="w-full h-full object-cover"
                />
              ) : media.type === 'audio' ? (
                <Music size={20} className="text-green-400" />
              ) : (
                <Film size={20} className="text-blue-400" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <TypeIcon type={media.type} />
                <p className="text-white text-xs truncate">{media.name}</p>
              </div>
              <p className="text-gray-500 text-xs mt-0.5">{formatDuration(media.duration)}</p>
            </div>

            {/* Delete button */}
            {hoveredId === media.id && (
              <button
                onClick={(e) => handleDelete(e, media.id)}
                className="flex-none p-1 rounded hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-colors"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        ))}
      </div>

      {state.mediaFiles.length > 0 && (
        <div
          className="px-4 py-2 text-xs text-gray-600 flex-none"
          style={{ borderTop: '1px solid #2a2a2a' }}
        >
          {state.mediaFiles.length} arquivo(s) · Duplo clique para adicionar
        </div>
      )}
    </div>
  );
}
