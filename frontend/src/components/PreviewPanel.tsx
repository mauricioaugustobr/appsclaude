import React, {
  useRef,
  useEffect,
  useCallback,
} from 'react';
import {
  Play,
  Pause,
  SkipBack,
  Volume2,
} from 'lucide-react';
import { useEditor } from '../store/editorStore';
import { Clip } from '../types/editor';

const CANVAS_W = 1280;
const CANVAS_H = 720;

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

interface PreviewPanelProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  activeTool?: string;
}

export default function PreviewPanel({ canvasRef }: PreviewPanelProps) {
  const { state, dispatch } = useEditor();
  const videoEls = useRef<Map<string, HTMLVideoElement>>(new Map());
  const audioEls = useRef<Map<string, HTMLAudioElement>>(new Map());
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const isPlayingRef = useRef(false);
  const currentTimeRef = useRef(state.currentTime);
  const durationRef = useRef(state.duration);
  const previewVolume = useRef(1);
  const previewMuted = useRef(false);

  // keep refs in sync
  isPlayingRef.current = state.isPlaying;
  currentTimeRef.current = state.currentTime;
  durationRef.current = state.duration;

  // Get or create a video element for a media src
  const getVideoEl = useCallback(
    (clip: Clip): HTMLVideoElement | null => {
      if (!clip.mediaId) return null;
      const media = state.mediaFiles.find((m) => m.id === clip.mediaId);
      if (!media) return null;

      let el = videoEls.current.get(clip.mediaId);
      if (!el) {
        el = document.createElement('video');
        el.src = media.src;
        el.preload = 'auto';
        el.muted = true;
        el.crossOrigin = 'anonymous';
        videoEls.current.set(clip.mediaId, el);
      }
      return el;
    },
    [state.mediaFiles]
  );

  const getAudioEl = useCallback(
    (clip: Clip): HTMLAudioElement | null => {
      if (!clip.mediaId) return null;
      const media = state.mediaFiles.find((m) => m.id === clip.mediaId);
      if (!media) return null;

      let el = audioEls.current.get(clip.mediaId);
      if (!el) {
        el = document.createElement('audio');
        el.src = media.src;
        el.preload = 'auto';
        audioEls.current.set(clip.mediaId, el);
      }
      return el;
    },
    [state.mediaFiles]
  );

  const getActiveClips = useCallback(
    (time: number): Clip[] => {
      return state.clips.filter(
        (c) => time >= c.startTime && time < c.startTime + c.duration
      );
    },
    [state.clips]
  );

  const renderFrame = useCallback(
    (time: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      const active = getActiveClips(time);

      // Draw video/image clips (track 0 and 1)
      const mediaClips = active.filter(
        (c) => c.type === 'video' || c.type === 'image'
      );
      for (const clip of mediaClips) {
        ctx.save();
        ctx.globalAlpha = clip.opacity ?? 1;

        if (clip.type === 'video') {
          const el = getVideoEl(clip);
          if (el && el.readyState >= 2) {
            const targetTime = clip.trimStart + (time - clip.startTime);
            if (Math.abs(el.currentTime - targetTime) > 0.15) {
              el.currentTime = targetTime;
            }
            ctx.drawImage(el, 0, 0, CANVAS_W, CANVAS_H);
          }
        } else if (clip.type === 'image') {
          const media = state.mediaFiles.find((m) => m.id === clip.mediaId);
          if (media) {
            const img = new window.Image();
            img.src = media.src;
            if (img.complete) {
              ctx.drawImage(img, 0, 0, CANVAS_W, CANVAS_H);
            }
          }
        }
        ctx.restore();
      }

      // Draw text clips
      const textClips = active.filter((c) => c.type === 'text');
      for (const clip of textClips) {
        if (!clip.text) continue;
        const fontSize = clip.fontSize ?? 48;
        const fontFamily = clip.fontFamily ?? 'Arial';
        const color = clip.color ?? '#ffffff';
        const bold = clip.bold ? 'bold ' : '';
        const italic = clip.italic ? 'italic ' : '';
        ctx.font = `${italic}${bold}${fontSize}px ${fontFamily}`;
        ctx.textAlign = (clip.align as CanvasTextAlign) ?? 'center';
        ctx.textBaseline = 'middle';

        const x = (clip.posX ?? 0.5) * CANVAS_W;
        const y = (clip.posY ?? 0.8) * CANVAS_H;

        if (clip.bgColor && clip.bgColor !== 'transparent') {
          const metrics = ctx.measureText(clip.text);
          const pad = 12;
          ctx.fillStyle = clip.bgColor;
          ctx.fillRect(
            x - metrics.width / 2 - pad,
            y - fontSize / 2 - pad / 2,
            metrics.width + pad * 2,
            fontSize + pad
          );
        }

        ctx.fillStyle = color;
        ctx.fillText(clip.text, x, y);
      }
    },
    [canvasRef, getActiveClips, getVideoEl, state.mediaFiles]
  );

  // Animation loop
  const tick = useCallback(
    (now: number) => {
      if (!isPlayingRef.current) return;

      const delta = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      const newTime = Math.min(
        currentTimeRef.current + delta,
        durationRef.current
      );

      dispatch({ type: 'SET_TIME', payload: newTime });
      renderFrame(newTime);

      if (newTime >= durationRef.current) {
        dispatch({ type: 'SET_PLAYING', payload: false });
        return;
      }

      rafRef.current = requestAnimationFrame(tick);
    },
    [dispatch, renderFrame]
  );

  useEffect(() => {
    if (state.isPlaying) {
      lastTimeRef.current = performance.now();
      rafRef.current = requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(rafRef.current);
      renderFrame(state.currentTime);
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [state.isPlaying, tick, renderFrame, state.currentTime]);

  // Render on seek when not playing
  useEffect(() => {
    if (!state.isPlaying) {
      renderFrame(state.currentTime);
    }
  }, [state.currentTime, state.isPlaying, renderFrame]);

  // Manage audio playback
  useEffect(() => {
    const active = getActiveClips(state.currentTime);
    const audioClips = active.filter((c) => c.type === 'audio');

    if (state.isPlaying) {
      for (const clip of audioClips) {
        const el = getAudioEl(clip);
        if (!el) continue;
        el.volume = clip.muted ? 0 : (clip.volume ?? 1) * previewVolume.current;
        const targetTime = clip.trimStart + (state.currentTime - clip.startTime);
        if (Math.abs(el.currentTime - targetTime) > 0.3) {
          el.currentTime = targetTime;
        }
        el.play().catch(() => {});
      }
    } else {
      audioEls.current.forEach((el) => el.pause());
    }
  }, [state.isPlaying, state.currentTime, getActiveClips, getAudioEl]);

  const togglePlay = () => {
    dispatch({ type: 'SET_PLAYING', payload: !state.isPlaying });
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = parseFloat(e.target.value);
    dispatch({ type: 'SET_TIME', payload: t });
    dispatch({ type: 'SET_PLAYING', payload: false });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      if (e.code === 'Space') {
        e.preventDefault();
        dispatch({ type: 'SET_PLAYING', payload: !isPlayingRef.current });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dispatch]);

  return (
    <div className="flex flex-col flex-1 overflow-hidden items-center justify-center bg-[#111] gap-3 p-4">
      {/* Canvas */}
      <div
        className="relative rounded overflow-hidden shadow-2xl"
        style={{
          aspectRatio: '16/9',
          maxWidth: 640,
          width: '100%',
          background: '#000',
        }}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="w-full h-full"
          style={{ display: 'block' }}
        />
      </div>

      {/* Controls */}
      <div
        className="flex flex-col gap-2 w-full"
        style={{ maxWidth: 640 }}
      >
        {/* Seek bar */}
        <input
          type="range"
          min={0}
          max={state.duration}
          step={0.01}
          value={state.currentTime}
          onChange={handleSeek}
          className="w-full accent-blue-500 h-1 rounded cursor-pointer"
        />

        <div className="flex items-center gap-3">
          {/* Rewind */}
          <button
            onClick={() => {
              dispatch({ type: 'SET_PLAYING', payload: false });
              dispatch({ type: 'SET_TIME', payload: 0 });
            }}
            className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <SkipBack size={18} />
          </button>

          {/* Play/Pause */}
          <button
            onClick={togglePlay}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            {state.isPlaying ? <Pause size={20} /> : <Play size={20} />}
          </button>

          {/* Time */}
          <span className="text-gray-400 text-sm font-mono">
            {formatTime(state.currentTime)} / {formatTime(state.duration)}
          </span>

          <div className="flex-1" />

          {/* Volume */}
          <button
            onClick={() => {
              previewMuted.current = !previewMuted.current;
              previewVolume.current = previewMuted.current ? 0 : 1;
            }}
            className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <Volume2 size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
