import React, { createContext, useContext, useReducer } from 'react';
import { MediaFile, Clip } from '../types/editor';

export interface EditorState {
  mediaFiles: MediaFile[];
  clips: Clip[];
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  selectedClipId: string | null;
  zoom: number;
}

export type EditorAction =
  | { type: 'ADD_MEDIA'; payload: MediaFile }
  | { type: 'REMOVE_MEDIA'; payload: string }
  | { type: 'ADD_CLIP'; payload: Clip }
  | { type: 'UPDATE_CLIP'; payload: { id: string; changes: Partial<Clip> } }
  | { type: 'REMOVE_CLIP'; payload: string }
  | { type: 'SPLIT_CLIP'; payload: { clipId: string; splitTime: number } }
  | { type: 'SET_TIME'; payload: number }
  | { type: 'SET_PLAYING'; payload: boolean }
  | { type: 'SELECT_CLIP'; payload: string | null }
  | { type: 'SET_ZOOM'; payload: number };

const computeDuration = (clips: Clip[]): number => {
  if (clips.length === 0) return 30;
  return Math.max(...clips.map((c) => c.startTime + c.duration), 30);
};

const initialState: EditorState = {
  mediaFiles: [],
  clips: [],
  currentTime: 0,
  duration: 30,
  isPlaying: false,
  selectedClipId: null,
  zoom: 80,
};

function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'ADD_MEDIA': {
      const mediaFiles = [...state.mediaFiles, action.payload];
      return { ...state, mediaFiles };
    }

    case 'REMOVE_MEDIA': {
      const mediaFiles = state.mediaFiles.filter((m) => m.id !== action.payload);
      const clips = state.clips.filter((c) => c.mediaId !== action.payload);
      return { ...state, mediaFiles, clips, duration: computeDuration(clips) };
    }

    case 'ADD_CLIP': {
      const clips = [...state.clips, action.payload];
      return { ...state, clips, duration: computeDuration(clips) };
    }

    case 'UPDATE_CLIP': {
      const clips = state.clips.map((c) =>
        c.id === action.payload.id ? { ...c, ...action.payload.changes } : c
      );
      return { ...state, clips, duration: computeDuration(clips) };
    }

    case 'REMOVE_CLIP': {
      const clips = state.clips.filter((c) => c.id !== action.payload);
      const selectedClipId =
        state.selectedClipId === action.payload ? null : state.selectedClipId;
      return { ...state, clips, selectedClipId, duration: computeDuration(clips) };
    }

    case 'SPLIT_CLIP': {
      const { clipId, splitTime } = action.payload;
      const clip = state.clips.find((c) => c.id === clipId);
      if (!clip) return state;

      const splitOffset = splitTime - clip.startTime;
      if (splitOffset <= 0 || splitOffset >= clip.duration) return state;

      const firstClip: Clip = {
        ...clip,
        duration: splitOffset,
      };

      const secondClip: Clip = {
        ...clip,
        id: crypto.randomUUID(),
        startTime: splitTime,
        duration: clip.duration - splitOffset,
        trimStart: clip.trimStart + splitOffset,
      };

      const clips = state.clips
        .filter((c) => c.id !== clipId)
        .concat([firstClip, secondClip]);

      return { ...state, clips, duration: computeDuration(clips) };
    }

    case 'SET_TIME': {
      return { ...state, currentTime: Math.max(0, action.payload) };
    }

    case 'SET_PLAYING': {
      return { ...state, isPlaying: action.payload };
    }

    case 'SELECT_CLIP': {
      return { ...state, selectedClipId: action.payload };
    }

    case 'SET_ZOOM': {
      return { ...state, zoom: Math.max(20, Math.min(300, action.payload)) };
    }

    default:
      return state;
  }
}

interface EditorContextValue {
  state: EditorState;
  dispatch: React.Dispatch<EditorAction>;
}

const EditorContext = createContext<EditorContextValue | null>(null);

export function EditorProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(editorReducer, initialState);
  return (
    <EditorContext.Provider value={{ state, dispatch }}>
      {children}
    </EditorContext.Provider>
  );
}

export function useEditor(): EditorContextValue {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error('useEditor must be used inside EditorProvider');
  return ctx;
}
