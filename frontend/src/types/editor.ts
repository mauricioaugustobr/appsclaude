export type ClipType = 'video' | 'audio' | 'image' | 'text';

export interface MediaFile {
  id: string;
  name: string;
  type: 'video' | 'audio' | 'image';
  file: File;
  src: string;       // object URL
  duration: number;  // seconds
  width?: number;
  height?: number;
  thumbnail?: string;
}

export interface Clip {
  id: string;
  mediaId: string | null;   // null for text clips
  type: ClipType;
  name: string;
  track: number;            // 0=video, 1=video2, 2=audio, 3=text
  startTime: number;        // timeline start in seconds
  duration: number;         // duration on timeline
  trimStart: number;        // trim from start of source (seconds)
  // text-specific
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  bgColor?: string;
  posX?: number;            // 0-1 relative X position
  posY?: number;            // 0-1 relative Y position
  bold?: boolean;
  italic?: boolean;
  align?: 'left' | 'center' | 'right';
  // media-specific
  volume?: number;          // 0-1
  muted?: boolean;
  opacity?: number;         // 0-1
}
