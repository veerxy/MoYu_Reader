import React, { useState, useEffect } from 'react';
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
import { Sidebar } from './components/Sidebar';
import { RecentFileList } from './components/RecentFileList';
import { ReaderView } from './components/ReaderView';
import { MinimizedWidget } from './components/MinimizedWidget';
import { SettingsModal } from './components/SettingsModal';
import { FolderOpen, Settings, Info, Monitor } from 'lucide-react';

export default function App() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [activeDoc, setActiveDoc] = useState<DocumentItem | null>(null);
  const [isReading, setIsReading] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [settings, setSettings] = useState<ReaderSettings>(() => loadSettings());
  const [isDesktopBgActive, setIsDesktopBgActive] = useState<boolean>(true);
  const [isGlobalSettingsOpen, setIsGlobalSettingsOpen] = useState<boolean>(false);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  // Initialize documents from IndexedDB, or seed with initial samples
  useEffect(() => {
    async function initDocs() {
      try {
        const stored = await getAllDocuments();
        if (stored.length > 0) {
          setDocuments(stored);
        } else {
          // Seed with initial realistic samples
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

    // Update in documents list
    setDocuments((prev) => [
      updatedDoc,
      ...prev.filter((d) => d.id !== doc.id),
    ]);
    await saveDocument(updatedDoc);
  };

  // Update reading progress during active reading session
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
    // Automatically open the newly imported document
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

  return (
    <div
      id="desktop-app-container"
      className="relative w-screen h-screen overflow-hidden flex flex-col font-sans select-none"
      style={{
        // Simulated desktop background to show off transparent reading mode
        backgroundImage: isDesktopBgActive
          ? 'radial-gradient(ellipse at top left, #1e293b, #0f172a, #020617)'
          : '#f4f4f5',
      }}
    >
      {/* Subtle simulated desktop elements (icons/wallpaper) to demonstrate transparency */}
      {isDesktopBgActive && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-35 z-0">
          <div className="absolute top-16 left-8 flex flex-col items-center gap-1.5 opacity-60">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300 shadow-lg">
              <FolderOpen className="w-6 h-6" />
            </div>
            <span className="text-[11px] text-zinc-300 font-medium tracking-wide">我的书架</span>
          </div>

          <div className="absolute top-36 left-8 flex flex-col items-center gap-1.5 opacity-60">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shadow-lg">
              <Monitor className="w-6 h-6" />
            </div>
            <span className="text-[11px] text-zinc-300 font-medium tracking-wide">桌面工作区</span>
          </div>

          <div className="absolute right-12 bottom-12 text-right opacity-40">
            <div className="text-3xl font-light text-zinc-400 font-mono tracking-widest">
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="text-xs text-zinc-500 mt-1">
              桌面端环境 · 支持透明阅读与按键显隐
            </div>
          </div>
        </div>
      )}

      {/* Main Client Window Wrapper */}
      <div
        id="desktop-main-window"
        className={`relative z-10 w-full h-full flex flex-col transition-all duration-300 ${
          isReading && !isMinimized
            ? 'p-0 sm:p-2 md:p-4' // Full reading stage
            : 'p-0'
        }`}
      >
        <div
          className={`w-full h-full flex flex-col overflow-hidden transition-all duration-300 ${
            isReading && !isMinimized
              ? settings.bgColor === 'transparent'
                ? 'bg-transparent shadow-none' // Transparent reading container
                : 'rounded-xl shadow-2xl overflow-hidden'
              : 'bg-zinc-100 rounded-none shadow-none'
          }`}
        >
          {/* Show standard desktop titlebar when NOT actively reading in fullscreen */}
          {(!isReading || isMinimized) && (
            <DesktopHeader
              title={
                activeDoc && isMinimized
                  ? `[已最小化] ${activeDoc.name} - 文档阅读器`
                  : '文档阅读器 (桌面客户端)'
              }
              onClose={() => {
                if (isReading) {
                  handleCloseReading();
                }
              }}
              onMinimize={() => {
                if (isReading) {
                  handleMinimizeReading();
                }
              }}
              isDesktopBgActive={isDesktopBgActive}
              onToggleDesktopBg={() => setIsDesktopBgActive((prev) => !prev)}
            />
          )}

          {/* Body Content */}
          <div className="flex-1 w-full h-full flex overflow-hidden relative">
            {/* Reading View (Active Document) */}
            {isReading && activeDoc && !isMinimized && (
              <ReaderView
                document={activeDoc}
                settings={settings}
                onUpdateSettings={handleUpdateSettings}
                onClose={handleCloseReading}
                onMinimize={handleMinimizeReading}
                onProgressUpdate={handleProgressUpdate}
              />
            )}

            {/* Home Dashboard: Sidebar + Recent Files List */}
            {(!isReading || isMinimized) && (
              <div className="w-full h-full flex overflow-hidden">
                {/* 1. Sidebar with recent files quick switch */}
                <Sidebar
                  documents={documents}
                  activeDocId={activeDoc?.id || null}
                  onSelectDocument={handleOpenDocument}
                  onDeleteDocument={handleDeleteDocument}
                  onOpenImporter={() => {
                    const el = document.getElementById('drop-zone-container');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                />

                {/* 2. Main Recent Files & Importer Dashboard */}
                <main className="flex-1 h-full overflow-y-auto bg-zinc-50/90 backdrop-blur-md">
                  <RecentFileList
                    documents={documents}
                    onOpenDocument={handleOpenDocument}
                    onDeleteDocument={handleDeleteDocument}
                    onDocumentImported={handleDocumentImported}
                  />
                </main>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Minimized Widget when reading is minimized */}
      {isReading && isMinimized && activeDoc && (
        <MinimizedWidget
          document={activeDoc}
          onRestore={handleRestoreReading}
          onClose={handleCloseReading}
        />
      )}

      {/* Global Settings Modal (if opened outside reader) */}
      <SettingsModal
        isOpen={isGlobalSettingsOpen}
        onClose={() => setIsGlobalSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
      />
    </div>
  );
}
