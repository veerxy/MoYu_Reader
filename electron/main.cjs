const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;

// 记忆用户上次调整过的窗口尺寸与位置
function getWindowStatePath() {
  const userData = app.getPath('userData');
  return path.join(userData, 'window-state.json');
}

function loadSavedWindowState() {
  try {
    const filePath = getWindowStatePath();
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (data && typeof data.width === 'number' && typeof data.height === 'number') {
        return data;
      }
    }
  } catch (err) {
    console.error('Failed to load window state:', err);
  }
  return { width: 1040, height: 720 };
}

function saveWindowState() {
  if (!mainWindow) return;
  try {
    if (mainWindow.isMaximized() || mainWindow.isMinimized()) return;
    const bounds = mainWindow.getBounds();
    const filePath = getWindowStatePath();
    fs.mkdirSync(app.getPath('userData'), { recursive: true });
    fs.writeFileSync(
      filePath,
      JSON.stringify(
        {
          width: bounds.width,
          height: bounds.height,
          x: bounds.x,
          y: bounds.y,
        },
        null,
        2
      ),
      'utf8'
    );
  } catch (err) {
    console.error('Failed to save window state:', err);
  }
}

function createWindow() {
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  const savedState = loadSavedWindowState();

  const winOptions = {
    width: Math.max(200, savedState.width || 1040),
    height: Math.max(20, savedState.height || 720),
    minWidth: 200,
    minHeight: 0, // 不限制最小高度，用户可任意压缩调整至极窄/单行高度
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
  };

  if (typeof savedState.x === 'number' && typeof savedState.y === 'number') {
    winOptions.x = savedState.x;
    winOptions.y = savedState.y;
  }

  mainWindow = new BrowserWindow(winOptions);

  // 监听窗口尺寸和位置变动，实时保存配置
  let saveTimer = null;
  const onBoundsChange = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveWindowState, 300);
  };

  mainWindow.on('resize', onBoundsChange);
  mainWindow.on('move', onBoundsChange);
  mainWindow.on('close', () => {
    saveWindowState();
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

// 透明模式鼠标穿透控制
ipcMain.on('set-ignore-mouse-events', (event, ignore, options) => {
  if (mainWindow) {
    if (ignore) {
      mainWindow.setIgnoreMouseEvents(true, options || { forward: true });
    } else {
      mainWindow.setIgnoreMouseEvents(false);
    }
  }
});

// 鼠标长按拖拽移动窗口
let dragOffset = null;

ipcMain.on('window-drag-start', (event, { screenX, screenY }) => {
  if (!mainWindow || mainWindow.isMaximized()) return;
  const [winX, winY] = mainWindow.getPosition();
  dragOffset = {
    x: screenX - winX,
    y: screenY - winY,
  };
});

ipcMain.on('window-drag-move', (event, { screenX, screenY }) => {
  if (!mainWindow || mainWindow.isMaximized()) return;
  if (!dragOffset) {
    const [winX, winY] = mainWindow.getPosition();
    dragOffset = {
      x: screenX - winX,
      y: screenY - winY,
    };
  }
  const newX = Math.round(screenX - dragOffset.x);
  const newY = Math.round(screenY - dragOffset.y);
  mainWindow.setPosition(newX, newY);
});

ipcMain.on('window-drag-end', () => {
  dragOffset = null;
  saveWindowState();
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
