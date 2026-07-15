import { app, BrowserWindow, ipcMain, protocol, dialog, Menu } from 'electron'
import path from 'path'
import fs from 'fs'
import { Readable } from 'stream'

// 把本地文件路径映射到一个内部 id，避免把路径编码进 URL 带来的各种坑
const fileMap = new Map()
let fileCounter = 0

const MIME = {
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.ogg': 'video/ogg',
  '.ogv': 'video/ogg',
  '.mov': 'video/quicktime',
  '.m4v': 'video/mp4',
  '.avi': 'video/x-msvideo',
  '.mkv': 'video/x-matroska',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.flac': 'audio/flac',
  '.srt': 'text/plain; charset=utf-8'
}
function mimeFor(p) {
  return MIME[path.extname(p).toLowerCase()] || 'application/octet-stream'
}

// 注册本地私有协议：standard + secure，使渲染进程可以 fetch 且 <video> 可正常 seek
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'local',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
      bypassCSP: true
    }
  }
])

// 通过 local://<id> 提供本地文件内容，支持 Range 请求（视频拖动进度必需）
function registerLocalProtocol() {
  protocol.handle('local', async (request) => {
    try {
      const raw = request.url.slice('local://'.length)
      const id = raw.split('/')[0].split('?')[0]
      const filePath = fileMap.get(id)
      if (!filePath) return new Response('Not found', { status: 404 })
      const info = await fs.promises.stat(filePath)
      const mime = mimeFor(filePath)
      const range = request.headers.get('range')
      if (range) {
        const parts = range.replace(/bytes=/, '').split('-')
        const start = parseInt(parts[0], 10) || 0
        const end = parts[1] ? parseInt(parts[1], 10) : info.size - 1
        const chunkSize = end - start + 1
        const stream = fs.createReadStream(filePath, { start, end })
        return new Response(Readable.toWeb(stream), {
          status: 206,
          headers: {
            'Content-Type': mime,
            'Content-Length': String(chunkSize),
            'Content-Range': `bytes ${start}-${end}/${info.size}`,
            'Accept-Ranges': 'bytes'
          }
        })
      }
      const stream = fs.createReadStream(filePath)
      return new Response(Readable.toWeb(stream), {
        status: 200,
        headers: {
          'Content-Type': mime,
          'Content-Length': String(info.size),
          'Accept-Ranges': 'bytes'
        }
      })
    } catch (e) {
      return new Response('Not found', { status: 404 })
    }
  })
}

let win = null

async function createWindow() {
  win = new BrowserWindow({
    width: 1480,
    height: 900,
    minWidth: 1000,
    minHeight: 680,
    backgroundColor: '#f9f8ff',
    title: '听力复读机',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    await win.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    await win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

/* ---------------- 原生应用菜单（与播放器控件联动） ---------------- */

let appMenu = null

function sendAction(action) {
  if (win) win.webContents.send('app:action', action)
}

function showAbout() {
  dialog.showMessageBox(win, {
    type: 'info',
    title: '关于听力复读机',
    message: '听力复读机 1.0.0',
    detail:
      '基于 Electron + Vue 3 打造的桌面听力复读工具。\n支持视频/音频 + SRT 字幕、A-B 复读、波形、听写与快捷键。\n菜单中的每一项都会驱动与界面按钮完全相同的播放器动作。'
  })
}

function buildMenu() {
  const template = [
    {
      label: '文件',
      submenu: [
        { label: '打开媒体文件…', accelerator: 'CmdOrCtrl+O', click: () => sendAction('openMedia') },
        { label: '打开字幕文件 (SRT)…', accelerator: 'CmdOrCtrl+Shift+S', click: () => sendAction('openSubtitle') },
        { type: 'separator' },
        { label: '退出', role: 'quit' }
      ]
    },
    {
      label: '播放',
      submenu: [
        { label: '播放 / 暂停', accelerator: 'Space', click: () => sendAction('togglePlay') },
        { label: '停止', accelerator: 'CmdOrCtrl+.', click: () => sendAction('stop') },
        { label: '后退 5 秒', accelerator: 'Left', click: () => sendAction('seekBack') },
        { label: '前进 5 秒', accelerator: 'Right', click: () => sendAction('seekForward') },
        { label: '上一句字幕', accelerator: 'CmdOrCtrl+Up', click: () => sendAction('prevSub') },
        { label: '下一句字幕', accelerator: 'CmdOrCtrl+Down', click: () => sendAction('nextSub') },
        { type: 'separator' },
        {
          label: '播放速度',
          submenu: [
            { label: '0.5x', click: () => sendAction('speed0.5') },
            { label: '0.75x', click: () => sendAction('speed0.75') },
            { label: '1x', click: () => sendAction('speed1') },
            { label: '1.25x', click: () => sendAction('speed1.25') },
            { label: '1.5x', click: () => sendAction('speed1.5') },
            { label: '2x', click: () => sendAction('speed2') }
          ]
        }
      ]
    },
    {
      label: '复读',
      submenu: [
        { id: 'toggleAB', label: '启用 A-B 复读', type: 'checkbox', checked: false, click: () => sendAction('toggleAB') },
        { label: '设置 A 点', click: () => sendAction('setA') },
        { label: '设置 B 点', click: () => sendAction('setB') },
        { label: '清除 A-B 区间', click: () => sendAction('clearAB') },
        { id: 'repeatFull', label: '整段复读', type: 'checkbox', checked: false, click: () => sendAction('repeatFull') },
        { label: '回车片段复读', click: () => sendAction('enterSegment') }
      ]
    },
    {
      label: '视图',
      submenu: [
        { id: 'viewSubtitles', label: '字幕面板', type: 'checkbox', checked: true, click: () => sendAction('viewSubtitles') },
        { id: 'viewWaveform', label: '波形显示', type: 'checkbox', checked: true, click: () => sendAction('viewWaveform') },
        { id: 'viewDictation', label: '听写模式', type: 'checkbox', checked: true, click: () => sendAction('viewDictation') },
        { type: 'separator' },
        { label: '快捷键帮助', click: () => sendAction('showShortcuts') }
      ]
    },
    {
      label: '帮助',
      submenu: [{ label: '关于听力复读机', click: () => showAbout() }]
    }
  ]
  appMenu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(appMenu)
}

// 渲染进程回传状态，让菜单勾选项实时反映播放器当前状态
ipcMain.on('app:menu-state', (event, s) => {
  if (!appMenu) return
  const set = (id, val) => {
    const item = appMenu.getMenuItemById(id)
    if (item) item.checked = !!val
  }
  set('toggleAB', s.abActive)
  set('repeatFull', s.fullActive)
  set('viewSubtitles', s.showSubtitles)
  set('viewWaveform', s.showWaveform)
  set('viewDictation', s.showDictation)
})

app.whenReady().then(async () => {
  registerLocalProtocol()
  await createWindow()
  buildMenu()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// 原生文件选择对话框
ipcMain.handle('dialog:openFile', async (event, options) => {
  const result = await dialog.showOpenDialog(win, options || {})
  if (result.canceled) return null
  return result.filePaths[0] || null
})

// 把本地文件路径登记到 fileMap，返回一个内部 id 供 local:// 使用
ipcMain.handle('fs:resolve', (event, filePath) => {
  const id = 'f' + ++fileCounter
  fileMap.set(id, filePath)
  let name = filePath
  let size = 0
  try {
    name = path.basename(filePath)
    size = fs.statSync(filePath).size
  } catch (e) {
    /* ignore */
  }
  return { id, name, size }
})
