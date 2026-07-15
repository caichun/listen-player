import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // 打开原生文件选择对话框，返回选中的绝对路径
  openFile: (options) => ipcRenderer.invoke('dialog:openFile', options),
  // 把本地文件路径登记到主进程，返回 { id, name, size }，渲染进程用 local://<id> 访问
  resolveFile: (filePath) => ipcRenderer.invoke('fs:resolve', filePath),
  // 主进程菜单点击后，把动作名推送给渲染进程
  onAction: (cb) => {
    const listener = (_e, action) => cb(action)
    ipcRenderer.on('app:action', listener)
    return () => ipcRenderer.removeListener('app:action', listener)
  },
  // 渲染进程把菜单勾选状态回传给主进程，让菜单实时反映播放器状态
  setMenuState: (menuState) => ipcRenderer.send('app:menu-state', menuState)
})
