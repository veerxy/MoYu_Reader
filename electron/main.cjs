const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;

function createWindow() {
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  mainWindow = new BrowserWindow({
    width: 1040,
    height: 720,
    minWidth: 420,
    minHeight: 300,
    frame: false, // 无边框窗口，由应用内自定义标题栏控制
    transparent: true, // 支持透明背景，使透明阅读模式文字悬浮在桌面
    hasShadow: true,
    backgroundColor: '#00000000', // 完全透明底层
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false, // 允许读取本地文件/blob
    },
  });

  // 加载页面：若显式传入本地开发服务 URL 则连接，否则直接以纯客户端模式加载本地静态文件
  if (process.env.ELECTRON_START_URL) {
    mainWindow.loadURL(process.env.ELECTRON_START_URL);
  } else if (process.env.ELECTRON_DEV === 'true') {
    mainWindow.loadURL('http://localhost:3000').catch(() => {
      mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    });
  } else {
    // 纯客户端模式：直接加载本地文件，无需任何 HTTP 或后台服务
    const indexPath = path.join(__dirname, '../dist/index.html');
    if (fs.existsSync(indexPath)) {
      mainWindow.loadFile(indexPath);
    } else {
      mainWindow.loadURL('http://localhost:3000');
    }
  }

  // 监听窗口最大化与还原事件，向渲染进程同步状态
  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window-maximized-state', true);
  });
  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window-maximized-state', false);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC 窗口控制事件
ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  if (!mainWindow) return;
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.handle('is-maximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false;
});

ipcMain.on('set-always-on-top', (event, flag) => {
  if (mainWindow) mainWindow.setAlwaysOnTop(Boolean(flag));
});

// 原生文件选择器
ipcMain.handle('open-file-dialog', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: '选择阅读文档',
    filters: [
      { name: '文档文件 (*.txt, *.pdf)', extensions: ['txt', 'pdf'] },
      { name: '文本文件 (*.txt)', extensions: ['txt'] },
      { name: 'PDF 文件 (*.pdf)', extensions: ['pdf'] },
    ],
    properties: ['openFile'],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const filePath = result.filePaths[0];
  const fileName = path.basename(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const fileStat = fs.statSync(filePath);

  if (ext === '.txt') {
    // 读取文本内容 (兼容 GBK/UTF-8)
    const buffer = fs.readFileSync(filePath);
    let content = '';
    try {
      const decoder = new TextDecoder('utf-8', { fatal: true });
      content = decoder.decode(buffer);
    } catch {
      const decoder = new TextDecoder('gb18030');
      content = decoder.decode(buffer);
    }

    return {
      name: fileName,
      type: 'txt',
      size: fileStat.size,
      content,
    };
  } else if (ext === '.pdf') {
    const buffer = fs.readFileSync(filePath);
    const base64 = buffer.toString('base64');
    const dataUrl = `data:application/pdf;base64,${base64}`;

    return {
      name: fileName,
      type: 'pdf',
      size: fileStat.size,
      dataUrl,
    };
  }

  return null;
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
