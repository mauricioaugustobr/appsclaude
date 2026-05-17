import { useState, useRef, useCallback } from 'react';
import { EditorProvider, useEditor } from './store/editorStore';
import Toolbar, { ToolType } from './components/Toolbar';
import MediaLibrary from './components/MediaLibrary';
import PreviewPanel from './components/PreviewPanel';
import PropertiesPanel from './components/PropertiesPanel';
import Timeline from './components/Timeline';
import ExportModal from './components/ExportModal';

// Inner app that has access to EditorProvider context
function EditorApp() {
  const { state, dispatch } = useEditor();
  const [activeTool, setActiveTool] = useState<ToolType>('select');
  const [showExport, setShowExport] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleSeekTo = useCallback(
    (t: number) => {
      dispatch({ type: 'SET_TIME', payload: t });
    },
    [dispatch]
  );

  const handlePlay = useCallback(
    (playing: boolean) => {
      dispatch({ type: 'SET_PLAYING', payload: playing });
    },
    [dispatch]
  );

  return (
    <div className="flex flex-col h-screen" style={{ background: '#111' }}>
      {/* Top toolbar */}
      <Toolbar
        activeTool={activeTool}
        onToolChange={setActiveTool}
        onExport={() => setShowExport(true)}
      />

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Media Library */}
        <MediaLibrary />

        {/* Center: Preview */}
        <PreviewPanel canvasRef={canvasRef} activeTool={activeTool} />

        {/* Right: Properties */}
        <PropertiesPanel />
      </div>

      {/* Bottom: Timeline */}
      <Timeline />

      {/* Export modal */}
      <ExportModal
        isOpen={showExport}
        onClose={() => setShowExport(false)}
        canvasRef={canvasRef}
        duration={state.duration}
        onSeekTo={handleSeekTo}
        onPlay={handlePlay}
      />
    </div>
  );
}

export default function App() {
  return (
    <EditorProvider>
      <EditorApp />
    </EditorProvider>
  );
}
