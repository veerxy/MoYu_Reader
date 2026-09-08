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
import { RecentFileList } from './components/RecentFileList';
import { ReaderView } from './components/ReaderView';
import { MinimizedWidget } from './components/MinimizedWidget';
import { SettingsModal } from './components/SettingsModal';

export default function App() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [activeDoc, setActiveDoc] = useState<DocumentItem | null>(null);
  const [isReading, setIsReading] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [settings, setSettings] = useState<ReaderSettings>(() => loadSettings());
  const [isGlobalSettingsOpen, setIsGlobalSettingsOpen] = useState<boolean>(false);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [isMaximized, setIsMaximized] = useState<boolean>(false);

  // Sync maximization state with Electron if available
  useEffect(() => {
    if (window.electronAPI?.onMaximizedChange) {
      const cleanup = window.electronAPI.onMaximizedChange((max: boolean) => {
        setIsMaximized(max);
      });
      return () => {
        if (typeof cleanup === 'function') cleanup();
      };
    }
  }, []);

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

  // Update settings and persist
  const handleUpdateSettings = (newSettings: ReaderSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  // Open document in reader
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

  // Compute container background based on mode
  const getContainerBgClass = () => {
    if (isReading && !isMinimized) {
      switch (settings.bgColor) {
        case 'dark':
          return 'bg-[#18181b] text-zinc-100';
        case 'white':
          return 'bg-white text-zinc-900';
        case 'book':
          return 'bg-[#f4ecd8] text-[#2c2214]';
        case 'transparent':
        default:
          return 'bg-transparent text-zinc-900';
      }
    }
    return 'bg-[#f8f9fa] text-zinc-800'; // Clean Windows light app background
  };

  return (
    <div
      id="desktop-app-container"
      className={`w-full h-full min-h-screen overflow-hidden flex flex-col font-sans select-none transition-colors duration-200 ${getContainerBgClass()}`}
    >
      {/* Windows Standard Titlebar (shown in home view) */}
      {(!isReading || isMinimized) && (
        <DesktopHeader
          title="文档阅读器"
          onMinimize={() => {}}
          onClose={() => {}}
          isMaximized={isMaximized}
          onToggleMaximize={() => setIsMaximized((prev) => !prev)}
        />
      )}

      {/* Main Workspace */}
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
            onToggleMaximize={() => setIsMaximized((prev) => !prev)}
          />
        )}

        {/* Home View: Clean Single-Pane Dashboard */}
        {(!isReading || isMinimized) && (
          <main className="w-full h-full overflow-y-auto bg-[#f8f9fa]">
            <RecentFileList
              documents={documents}
              onOpenDocument={handleOpenDocument}
              onDeleteDocument={handleDeleteDocument}
              onDocumentImported={handleDocumentImported}
            />
          </main>
        )}
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
