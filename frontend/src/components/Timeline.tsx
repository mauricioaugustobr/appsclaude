import React, { useRef, useCallback, useEffect } from 'react';
import { ZoomIn, ZoomOut, Clock } from 'lucide-react';
import { useEditor } from '../store/editorStore';
import { Clip } from '../types/editor';

const TRACK_HEIGHT = 56;
const RULER_HEIGHT = 24;
const LABEL_WIDTH = 72;

const TRACK_LABELS = ['Vídeo', 'Vídeo 2', 'Áudio', 'Texto'];
const CLIP_COLORS: Record<string, string> = {
  video: '#3b82f6',
  audio: '#22c55e',
  image: '#a855f7',
  text: '#f97316',
};

function formatRuler(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${s}s`;
}

interface DragState {
  type: 'move' | 'trim-left' | 'trim-right' | 'seek';
  clipId?: string;
  startX: number;
  origStartTime?: number;
  origDuration?: number;
  origTrimStart?: number;
}

export default function Timeline() {
  const { state, dispatch } = useEditor();
  const { clips, currentTime, duration, zoom, selectedClipId } = state;

  const scrollRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);

  const timelineWidth = Math.max(duration * zoom + 200, 800);

  const handleZoomIn = () => dispatch({ type: 'SET_ZOOM', payload: zoom + 20 });
  const handleZoomOut = () => dispatch({ type: 'SET_ZOOM', payload: zoom - 20 });

  // Seek on ruler click
  const handleRulerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const t = Math.max(0, x / zoom);
    dispatch({ type: 'SET_TIME', payload: t });
    dispatch({ type: 'SET_PLAYING', payload: false });
  };

  // Mouse down on clip
  const handleClipMouseDown = useCallback(
    (e: React.MouseEvent, clip: Clip, dragType: 'move' | 'trim-left' | 'trim-right') => {
      e.preventDefault();
      e.stopPropagation();
      dispatch({ type: 'SELECT_CLIP', payload: clip.id });
      dragRef.current = {
        type: dragType,
        clipId: clip.id,
        startX: e.clientX,
        origStartTime: clip.startTime,
        origDuration: clip.duration,
        origTrimStart: clip.trimStart,
      };
    },
    [dispatch]
  );

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      const drag = dragRef.current;
      if (!drag || !drag.clipId) return;

      const dx = e.clientX - drag.startX;
      const dt = dx / zoom;
      const clip = clips.find((c) => c.id === drag.clipId);
      if (!clip) return;

      if (drag.type === 'move') {
        const newStart = Math.max(0, (drag.origStartTime ?? 0) + dt);
        dispatch({
          type: 'UPDATE_CLIP',
          payload: { id: drag.clipId, changes: { startTime: newStart } },
        });
      } else if (drag.type === 'trim-left') {
        const newTrimStart = Math.max(0, (drag.origTrimStart ?? 0) + dt);
        const trimDelta = newTrimStart - (drag.origTrimStart ?? 0);
        const newDuration = Math.max(0.1, (drag.origDuration ?? clip.duration) - trimDelta);
        const newStart = Math.max(0, (drag.origStartTime ?? 0) + trimDelta);
        dispatch({
          type: 'UPDATE_CLIP',
          payload: {
            id: drag.clipId,
            changes: {
              startTime: newStart,
              duration: newDuration,
              trimStart: newTrimStart,
            },
          },
        });
      } else if (drag.type === 'trim-right') {
        const newDuration = Math.max(0.1, (drag.origDuration ?? clip.duration) + dt);
        dispatch({
          type: 'UPDATE_CLIP',
          payload: { id: drag.clipId, changes: { duration: newDuration } },
        });
      }
    };

    const onMouseUp = () => {
      dragRef.current = null;
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [clips, zoom, dispatch]);

  // Auto-scroll playhead into view
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const playheadX = LABEL_WIDTH + currentTime * zoom;
    const scrollLeft = el.scrollLeft;
    const visible = el.clientWidth;
    if (playheadX < scrollLeft + LABEL_WIDTH || playheadX > scrollLeft + visible - 40) {
      el.scrollLeft = Math.max(0, playheadX - visible / 2);
    }
  }, [currentTime, zoom]);

  // Ruler markers
  const markerInterval = zoom < 40 ? 10 : zoom < 80 ? 5 : zoom < 160 ? 2 : 1;
  const markerCount = Math.ceil(duration / markerInterval) + 5;

  return (
    <div
      className="flex flex-col flex-none overflow-hidden select-none"
      style={{
        height: 240,
        background: '#161616',
        borderTop: '1px solid #2a2a2a',
      }}
    >
      {/* Top bar */}
      <div
        className="flex items-center gap-3 px-3 py-1.5 flex-none"
        style={{ borderBottom: '1px solid #2a2a2a', height: 36 }}
      >
        <Clock size={14} className="text-gray-500" />
        <span className="text-gray-400 text-xs font-mono">
          {String(Math.floor(currentTime / 60)).padStart(2, '0')}:
          {String(Math.floor(currentTime % 60)).padStart(2, '0')}
        </span>
        <div className="flex-1" />
        <button
          onClick={handleZoomOut}
          className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          title="Zoom out"
        >
          <ZoomOut size={14} />
        </button>
        <span className="text-gray-600 text-xs">{zoom}px/s</span>
        <button
          onClick={handleZoomIn}
          className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          title="Zoom in"
        >
          <ZoomIn size={14} />
        </button>
      </div>

      {/* Main scrollable area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Track labels */}
        <div
          className="flex flex-col flex-none"
          style={{ width: LABEL_WIDTH, borderRight: '1px solid #2a2a2a' }}
        >
          {/* Ruler label spacer */}
          <div style={{ height: RULER_HEIGHT, borderBottom: '1px solid #2a2a2a' }} />
          {TRACK_LABELS.map((label, i) => (
            <div
              key={i}
              className="flex items-center px-2"
              style={{
                height: TRACK_HEIGHT,
                borderBottom: '1px solid #222',
                background: '#1a1a1a',
              }}
            >
              <span className="text-gray-500 text-xs font-medium truncate">{label}</span>
            </div>
          ))}
        </div>

        {/* Scrollable timeline */}
        <div ref={scrollRef} className="flex-1 overflow-auto relative timeline-scroll">
          <div style={{ width: timelineWidth, position: 'relative' }}>
            {/* Ruler */}
            <div
              className="sticky top-0 z-10 cursor-pointer"
              style={{
                height: RULER_HEIGHT,
                background: '#1e1e1e',
                borderBottom: '1px solid #2a2a2a',
              }}
              onClick={handleRulerClick}
            >
              {Array.from({ length: markerCount }, (_, i) => {
                const t = i * markerInterval;
                const x = t * zoom;
                return (
                  <div
                    key={t}
                    className="absolute top-0 flex flex-col items-start"
                    style={{ left: x }}
                  >
                    <div style={{ width: 1, height: 8, background: '#3a3a3a' }} />
                    <span
                      className="text-gray-600 text-xs"
                      style={{ fontSize: 10, marginLeft: 2, lineHeight: '14px' }}
                    >
                      {formatRuler(t)}
                    </span>
                  </div>
                );
              })}

              {/* Playhead on ruler */}
              <div
                className="absolute top-0 bottom-0 pointer-events-none"
                style={{ left: currentTime * zoom, width: 2, background: '#ef4444' }}
              />
            </div>

            {/* Tracks */}
            {TRACK_LABELS.map((_, trackIndex) => {
              const trackClips = clips.filter((c) => c.track === trackIndex);
              return (
                <div
                  key={trackIndex}
                  className="relative"
                  style={{
                    height: TRACK_HEIGHT,
                    borderBottom: '1px solid #222',
                    background: trackIndex % 2 === 0 ? '#1a1a1a' : '#181818',
                  }}
                >
                  {trackClips.map((clip) => {
                    const left = clip.startTime * zoom;
                    const width = Math.max(clip.duration * zoom, 4);
                    const isSelected = clip.id === selectedClipId;
                    const color = CLIP_COLORS[clip.type] ?? '#6b7280';

                    return (
                      <div
                        key={clip.id}
                        className="absolute top-1 rounded overflow-hidden clip-transition"
                        style={{
                          left,
                          width,
                          height: TRACK_HEIGHT - 8,
                          background: color,
                          opacity: 0.85,
                          outline: isSelected ? '2px solid #fff' : 'none',
                          outlineOffset: 1,
                          cursor: 'grab',
                          userSelect: 'none',
                        }}
                        onMouseDown={(e) => handleClipMouseDown(e, clip, 'move')}
                        onClick={() => dispatch({ type: 'SELECT_CLIP', payload: clip.id })}
                      >
                        {/* Left trim handle */}
                        <div
                          className="absolute left-0 top-0 bottom-0 flex items-center justify-center cursor-ew-resize"
                          style={{ width: 8, background: 'rgba(0,0,0,0.3)' }}
                          onMouseDown={(e) => handleClipMouseDown(e, clip, 'trim-left')}
                        >
                          <div
                            style={{
                              width: 2,
                              height: 16,
                              background: 'rgba(255,255,255,0.5)',
                              borderRadius: 1,
                            }}
                          />
                        </div>

                        {/* Clip name */}
                        <div
                          className="absolute inset-0 flex items-center px-2"
                          style={{ left: 8, right: 8 }}
                        >
                          <span
                            className="text-white font-medium truncate"
                            style={{ fontSize: 11, textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
                          >
                            {clip.name}
                          </span>
                        </div>

                        {/* Right trim handle */}
                        <div
                          className="absolute right-0 top-0 bottom-0 flex items-center justify-center cursor-ew-resize"
                          style={{ width: 8, background: 'rgba(0,0,0,0.3)' }}
                          onMouseDown={(e) => handleClipMouseDown(e, clip, 'trim-right')}
                        >
                          <div
                            style={{
                              width: 2,
                              height: 16,
                              background: 'rgba(255,255,255,0.5)',
                              borderRadius: 1,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {/* Global playhead line */}
            <div
              className="absolute top-0 pointer-events-none"
              style={{
                left: currentTime * zoom,
                width: 2,
                height: RULER_HEIGHT + TRACK_HEIGHT * TRACK_LABELS.length,
                background: '#ef4444',
                zIndex: 20,
              }}
            >
              {/* Playhead triangle */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: -5,
                  width: 0,
                  height: 0,
                  borderLeft: '6px solid transparent',
                  borderRight: '6px solid transparent',
                  borderTop: '8px solid #ef4444',
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
