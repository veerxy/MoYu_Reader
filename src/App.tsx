import React, { useState, useEffect, useRef } from 'react';
import { DocumentItem, ReaderSettings } from './types';
import {
  getAllDocuments,
  saveDocument,
  updateDocumentProgress,
  deleteDocument,
  loadSettings,
  saveSettings,
} from './utils/storage';
import { getInitialSampleDocuments } from './utils/sampleDocs';
import { DesktopHeader } from './components/DesktopHeader';
import { RecentFileList } from './components/RecentFileList';
import { ReaderView } from './components/ReaderView';
import { MinimizedWidget } from './components/MinimizedWidget';
import { SettingsModal } from './components/SettingsModal';
import { ResizeHandles, ResizeDirection } from './components/ResizeHandles';

interface WindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function App() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [activeDoc, setActiveDoc] = useState<DocumentItem | null>(null);
  const [isReading, setIsReading] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [settings, setSettings] = useState<ReaderSettings>(() => loadSettings());
  const [isGlobalSettingsOpen, setIsGlobalSettingsOpen] = useState<boolean>(false);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  // Floating Window Coordinates & Size
  const [isMaximized, setIsMaximized] = useState<boolean>(false);
  const [isReaderBorderVisible, setIsReaderBorderVisible] = useState<boolean>(false);
  const [windowBounds, setWindowBounds] = useState<WindowBounds>(() => {
    const defaultW = Math.min(1040, window.innerWidth - 48);
    const defaultH = Math.min(680, window.innerHeight - 48);
    const defaultX = Math.max(24, (window.innerWidth - defaultW) / 2);
    const defaultY = Math.max(24, (window.innerHeight - defaultH) / 2);
    return { x: defaultX, y: defaultY, width: defaultW, height: defaultH };
  });

  // Dragging / Resizing Refs
  const isDraggingRef = useRef(false);
  const isResizingRef = useRef(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; initialX: number; initialY: number }>({
    mouseX: 0,
    mouseY: 0,
    initialX: 0,
    initialY: 0,
  });
  const resizeStartRef = useRef<{
    direction: ResizeDirection;
    mouseX: number;
    mouseY: number;
    initialBounds: WindowBounds;
  } | null>(null);

  // Initialize documents from IndexedDB or seed
  useEffect(() => {
    async function initDocs() {
      try {
        const stored = await getAllDocuments();
        if (stored.length > 0) {
          setDocuments(stored);
        } else {
          const samples = getInitialSampleDocuments();
          for (const sample of samples) {
            await saveDocument(sample);
          }
          setDocuments(samples);
        }
      } catch (e) {
        console.error('Failed to init docs', e);
        setDocuments(getInitialSampleDocuments());
      } finally {
        setIsLoaded(true);
      }
    }

    initDocs();
  }, []);

  // Window drag & resize mouse event listeners
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingRef.current) {
        const dx = e.clientX - dragStartRef.current.mouseX;
        const dy = e.clientY - dragStartRef.current.mouseY;
        const newX = Math.max(-100, Math.min(window.innerWidth - 100, dragStartRef.current.initialX + dx));
        const newY = Math.max(0, Math.min(window.innerHeight - 60, dragStartRef.current.initialY + dy));
        setWindowBounds((prev) => ({ ...prev, x: newX, y: newY }));
      } else if (isResizingRef.current && resizeStartRef.current) {
        const { direction, mouseX, mouseY, initialBounds } = resizeStartRef.current;
        const dx = e.clientX - mouseX;
        const dy = e.clientY - mouseY;

        let newX = initialBounds.x;
        let newY = initialBounds.y;
        let newW = initialBounds.width;
        let newH = initialBounds.height;

        const MIN_W = 480;
        const MIN_H = 340;

        // East / West
        if (direction.includes('e')) {
          newW = Math.max(MIN_W, initialBounds.width + dx);
        } else if (direction.includes('w')) {
          const calculatedW = initialBounds.width - dx;
          if (calculatedW >= MIN_W) {
            newW = calculatedW;
            newX = initialBounds.x + dx;
          }
        }

        // South / North
        if (direction.includes('s')) {
          newH = Math.max(MIN_H, initialBounds.height + dy);
        } else if (direction.includes('n')) {
          const calculatedH = initialBounds.height - dy;
          if (calculatedH >= MIN_H) {
            newH = calculatedH;
            newY = initialBounds.y + dy;
          }
        }

        setWindowBounds({
          x: newX,
          y: newY,
          width: newW,
          height: newH,
        });
      }
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      isResizingRef.current = false;
      resizeStartRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handleStartDrag = (e: React.MouseEvent) => {
    if (isMaximized) return;
    if (e.button !== 0) return; // only left click
    isDraggingRef.current = true;
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      initialX: windowBounds.x,
      initialY: windowBounds.y,
    };
  };

  const handleResizeStart = (direction: ResizeDirection, e: React.MouseEvent) => {
    if (isMaximized) return;
    e.preventDefault();
    e.stopPropagation();
    isResizingRef.current = true;
    resizeStartRef.current = {
      direction,
      mouseX: e.clientX,
      mouseY: e.clientY,
      initialBounds: { ...windowBounds },
    };
  };

  // Update settings and persist
  const handleUpdateSettings = (newSettings: ReaderSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  // Open a document to read
  const handleOpenDocument = async (doc: DocumentItem) => {
    const updatedDoc = {
      ...doc,
      lastOpened: Date.now(),
    };
    setActiveDoc(updatedDoc);
    setIsReading(true);
    setIsMinimized(false);

    setDocuments((prev) => [
      updatedDoc,
      ...prev.filter((d) => d.id !== doc.id),
    ]);
    await saveDocument(updatedDoc);
  };

  // Update reading progress
  const handleProgressUpdate = async (progress: number, extra?: any) => {
    if (!activeDoc) return;

    const updated = {
      ...activeDoc,
      progress,
      lastOpened: Date.now(),
      ...extra,
    };
    setActiveDoc(updated);

    setDocuments((prev) =>
      prev.map((d) => (d.id === activeDoc.id ? updated : d))
    );

    await updateDocumentProgress(activeDoc.id, progress, extra);
  };

  // Delete document
  const handleDeleteDocument = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeDoc?.id === id) {
      setActiveDoc(null);
      setIsReading(false);
      setIsMinimized(false);
    }
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    await deleteDocument(id);
  };

  // Handle document newly imported via Importer
  const handleDocumentImported = async (newDoc: DocumentItem) => {
    setDocuments((prev) => [newDoc, ...prev]);
    handleOpenDocument(newDoc);
  };

  // Close reading view
  const handleCloseReading = () => {
    setIsReading(false);
    setIsMinimized(false);
  };

  // Minimize reading view
  const handleMinimizeReading = () => {
    setIsMinimized(true);
  };

  // Restore minimized reading view
  const handleRestoreReading = () => {
    setIsMinimized(false);
    setIsReading(true);
  };

  const isTransparentMode = isReading && settings.bgColor === 'transparent';

  return (
    <div
      id="desktop-app-container"
      className="relative w-screen h-screen overflow-hidden bg-zinc-950 flex flex-col font-sans select-none"
    >
      {/* Background subtle mesh */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      {/* Floating or Maximized Client Window */}
      <div
        id="desktop-main-window"
        style={
          isMaximized
            ? {
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                zIndex: 20,
              }
            : {
                position: 'absolute',
                top: `${windowBounds.y}px`,
                left: `${windowBounds.x}px`,
                width: `${windowBounds.width}px`,
                height: `${windowBounds.height}px`,
                zIndex: 20,
              }
        }
        className={`flex flex-col ${
          isTransparentMode
            ? 'bg-transparent shadow-none border-0'
            : isMaximized
            ? 'bg-zinc-900 border-0 shadow-none'
            : 'bg-zinc-900 rounded-xl shadow-2xl border border-zinc-800/80 overflow-hidden ring-1 ring-white/10'
        }`}
      >
        {/* 8-Direction Resize Handles (when floating) */}
        {!isMaximized && (
          <ResizeHandles
            onResizeStart={handleResizeStart}
            isTransparentMode={isTransparentMode}
            showCornerGrip={!isReading || isReaderBorderVisible}
          />
        )}

        {/* Desktop Titlebar (shown when not reading) */}
        {!isReading && (
          <DesktopHeader
            title="文档阅读器"
            onMinimize={() => {}}
            onClose={() => {}}
            isMaximized={isMaximized}
            onToggleMaximize={() => setIsMaximized((prev) => !prev)}
            onStartDrag={handleStartDrag}
          />
        )}

        {/* Client Window Inner Content */}
        <div className="flex-1 w-full h-full flex overflow-hidden relative">
          {/* Active Document Reader View */}
          {isReading && activeDoc && !isMinimized && (
            <ReaderView
              document={activeDoc}
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              onClose={handleCloseReading}
              onMinimize={handleMinimizeReading}
              onProgressUpdate={handleProgressUpdate}
              onStartDrag={handleStartDrag}
              onToggleMaximize={() => setIsMaximized((prev) => !prev)}
              onBorderVisibilityChange={setIsReaderBorderVisible}
            />
          )}

          {/* Home View: Clean Single-Pane Dashboard without sidebar */}
          {(!isReading || isMinimized) && (
            <main className="w-full h-full overflow-y-auto bg-zinc-50">
              <RecentFileList
                documents={documents}
                onOpenDocument={handleOpenDocument}
                onDeleteDocument={handleDeleteDocument}
                onDocumentImported={handleDocumentImported}
              />
            </main>
          )}
        </div>
      </div>

      {/* Floating Minimized Widget */}
      {isReading && isMinimized && activeDoc && (
        <MinimizedWidget
          document={activeDoc}
          onRestore={handleRestoreReading}
          onClose={handleCloseReading}
        />
      )}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isGlobalSettingsOpen}
        onClose={() => setIsGlobalSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
      />
    </div>
  );
}
