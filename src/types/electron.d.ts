export interface ElectronFileResult {
  name: string;
  type: 'txt' | 'pdf';
  size: number;
  content?: string;
  dataUrl?: string;
}

export interface IElectronAPI {
  isElectron: boolean;
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  isMaximized: () => Promise<boolean>;
  setAlwaysOnTop: (flag: boolean) => void;
  openFileDialog: () => Promise<ElectronFileResult | null>;
  onMaximizedChange: (callback: (isMaximized: boolean) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI?: IElectronAPI;
  }
}
