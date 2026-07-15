import { reactive, computed } from 'vue'

// 这些是非响应式的 DOM 引用，单独保存在模块作用域，避免被 Vue 代理
let mediaEl = null
let canvasEl = null
let progressContainerEl = null
let toastTimer = null

export const state = reactive({
  mediaId: null,
  mediaPath: '',
  mediaName: '',
  mediaSize: 0,
  srtId: null,
  srtName: '',
  subtitles: [],
  hasMedia: false,
  hasSubtitles: false,
  isPlaying: false,
  isRepeating: false,
  repeatMode: null, // 'ab' | 'full'
  repeatCount: 0,
  aPoint: null,
  bPoint: null,
  currentSubtitleIndex: -1,
  selectedSubtitleIndex: -1,
  dictIndex: 0,
  dictText: '请先上传字幕',
  dictShowAnswer: false,
  dictInput: '',
  dictResult: '',
  speed: 1,
  volume: 100,
  muted: false,
  currentTime: 0,
  duration: 0,
  hideCurrentSubtitle: false,
  isDraggingProgress: false,
  waveformPeaks: [],
  waveformDecodeId: 0,
  repeatDuration: '5',
  repeatLimitInput: '',
  showSubtitles: true,
  showWaveform: true,
  showDictation: true,
  showShortcutsModal: false,
  toast: { message: '', visible: false }
})

export const aPercent = computed(() => (state.duration ? (state.aPoint / state.duration) * 100 : 0))
export const bPercent = computed(() => (state.duration ? (state.bPoint / state.duration) * 100 : 0))
export const progressPercent = computed(() => (state.duration ? (state.currentTime / state.duration) * 100 : 0))

export function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return '00:00'
  const s = Math.max(0, Math.floor(seconds))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
}

export function showToast(message) {
  state.toast.message = message
  state.toast.visible = true
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    state.toast.visible = false
  }, 2600)
}

export function parseSRT(text) {
  const subtitles = []
  const regex = /(\d+)\r?\n(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})\r?\n([\s\S]*?)(?=\r?\n\r?\n|$)/g
  const parseTime = (raw) => {
    const [clock, ms] = raw.split(',')
    const [h, m, s] = clock.split(':').map(Number)
    return h * 3600 + m * 60 + s + Number(ms) / 1000
  }
  let match
  while ((match = regex.exec(text)) !== null) {
    subtitles.push({
      startTime: parseTime(match[2]),
      endTime: parseTime(match[3]),
      text: (match[4] || '').trim().replace(/\r?\n/g, ' ')
    })
  }
  return subtitles
}

export function setMediaElement(el) {
  mediaEl = el
}
export function setCanvas(el) {
  canvasEl = el
}
export function setProgressContainer(el) {
  progressContainerEl = el
}

/* ---------------- 文件加载 ---------------- */

export async function loadMediaFile(filePath) {
  if (!filePath) return
  try {
    const res = await window.electronAPI.resolveFile(filePath)
    state.mediaId = res.id
    state.mediaName = res.name
    state.mediaSize = res.size
    state.mediaPath = filePath
    state.hasMedia = true
    state.currentTime = 0
    state.duration = 0
    clearABPoints()
    state.isPlaying = false
    if (mediaEl) {
      mediaEl.src = 'local://' + res.id
      mediaEl.load()
      buildWaveform(res.id)
    }
    showToast('媒体文件加载中…')
  } catch (e) {
    showToast('无法打开文件')
  }
}

export async function loadSRTFile(filePath) {
  if (!filePath) return
  try {
    const res = await window.electronAPI.resolveFile(filePath)
    state.srtId = res.id
    state.srtName = res.name
    showToast('字幕解析中…')
    const resp = await fetch('local://' + res.id)
    const text = await resp.text()
    state.subtitles = parseSRT(text)
    state.hasSubtitles = state.subtitles.length > 0
    state.dictIndex = 0
    state.dictText = state.subtitles[0]?.text || '无字幕'
    state.dictShowAnswer = false
    state.dictInput = ''
    state.dictResult = ''
    if (state.subtitles.length > 0) showToast(`已加载 ${state.subtitles.length} 条字幕`)
    else showToast('字幕为空或格式不正确')
  } catch (e) {
    state.subtitles = []
    state.hasSubtitles = false
    showToast('字幕解析失败')
  }
}

/* ---------------- 媒体事件 ---------------- */

export function onLoadedMetadata() {
  state.duration = mediaEl.duration || 0
  state.isPlaying = false
  state.isPlaying = false
  mediaEl.playbackRate = Number(state.speed)
  setVolume(100)
  showToast('媒体文件加载完成')
}

export function onEnded() {
  if (state.isRepeating && state.aPoint !== null && state.bPoint !== null && completeRepeatCycle(true)) return
  state.isPlaying = false
}

export function onTimeUpdate() {
  if (state.isDraggingProgress) return
  const current = mediaEl.currentTime || 0
  state.currentTime = current
  if (state.isRepeating && state.aPoint !== null && state.bPoint !== null && current >= state.bPoint) {
    completeRepeatCycle(false)
  }
  highlightCurrentSubtitle()
}

/* ---------------- 波形 ---------------- */

export function drawWaveform() {
  const canvas = canvasEl
  const container = progressContainerEl
  if (!canvas || !container) return
  const rect = container.getBoundingClientRect()
  if (!rect.width || !rect.height) return
  const dpr = window.devicePixelRatio || 1
  const width = Math.max(1, Math.floor(rect.width * dpr))
  const height = Math.max(1, Math.floor(rect.height * dpr))
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width
    canvas.height = height
  }
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, width, height)
  const centerY = Math.floor(height / 2)
  const peaks = state.waveformPeaks || []
  if (!peaks.length) {
    ctx.strokeStyle = '#c9c0ff'
    ctx.lineWidth = Math.max(1, dpr)
    ctx.beginPath()
    ctx.moveTo(0, centerY)
    ctx.lineTo(width, centerY)
    ctx.stroke()
    return
  }
  ctx.strokeStyle = '#b9a8ff'
  ctx.lineWidth = Math.max(1, dpr)
  const step = width / peaks.length
  const maxHeight = height * 0.78
  for (let i = 0; i < peaks.length; i++) {
    const peak = Math.max(0.015, Math.min(1, peaks[i]))
    const barHeight = Math.max(dpr, peak * maxHeight)
    const x = Math.round(i * step)
    ctx.beginPath()
    ctx.moveTo(x, centerY - barHeight / 2)
    ctx.lineTo(x, centerY + barHeight / 2)
    ctx.stroke()
  }
}

export async function buildWaveform(id) {
  state.waveformPeaks = []
  drawWaveform()
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext
  if (!AudioContextCtor || !id) return
  const decodeId = ++state.waveformDecodeId
  let audioCtx = null
  try {
    const resp = await fetch('local://' + id)
    const buffer = await resp.arrayBuffer()
    if (decodeId !== state.waveformDecodeId) return
    audioCtx = new AudioContextCtor()
    const audioBuffer = await audioCtx.decodeAudioData(buffer)
    if (decodeId !== state.waveformDecodeId) {
      audioCtx.close()
      return
    }
    const bucketCount = 900
    const samplesPerBucket = Math.max(1, Math.floor(audioBuffer.length / bucketCount))
    const channelCount = Math.min(2, audioBuffer.numberOfChannels || 1)
    const channels = Array.from({ length: channelCount }, (_, c) => audioBuffer.getChannelData(c))
    const peaks = []
    for (let b = 0; b < bucketCount; b++) {
      const start = b * samplesPerBucket
      const end = Math.min(audioBuffer.length, start + samplesPerBucket)
      let max = 0
      for (let i = start; i < end; i++) {
        for (let c = 0; c < channels.length; c++) {
          const v = Math.abs(channels[c][i] || 0)
          if (v > max) max = v
        }
      }
      peaks.push(max)
    }
    state.waveformPeaks = peaks
    drawWaveform()
  } catch (e) {
    if (decodeId === state.waveformDecodeId) {
      state.waveformPeaks = []
      drawWaveform()
      showToast('当前格式无法生成波形，仍可拖动进度')
    }
  } finally {
    if (audioCtx && typeof audioCtx.close === 'function') audioCtx.close()
  }
}

/* ---------------- AB 复读 ---------------- */

export function setABPoints(a, b) {
  state.aPoint = a
  state.bPoint = b
  state.repeatCount = 0
}

export function getRepeatLimit() {
  const raw = String(state.repeatLimitInput || '').trim()
  if (!raw) return null
  const value = Math.max(1, parseInt(raw, 10) || 1)
  state.repeatLimitInput = String(value)
  return value
}

export function completeRepeatCycle(resumePlayback) {
  if (!mediaEl || state.aPoint === null || state.bPoint === null) return false
  state.repeatCount += 1
  const limit = getRepeatLimit()
  if (limit !== null && state.repeatCount >= limit) {
    state.isRepeating = false
    state.repeatMode = null
    mediaEl.currentTime = state.bPoint
    showToast(`已完成 ${limit} 次复读`)
    return false
  }
  mediaEl.currentTime = state.aPoint
  if (resumePlayback) {
    mediaEl
      .play()
      .then(() => {
        state.isPlaying = true
      })
      .catch(() => {
        state.isPlaying = false
      })
  }
  return true
}

export function clearABPoints() {
  state.aPoint = null
  state.bPoint = null
  state.isRepeating = false
  state.repeatMode = null
  state.repeatCount = 0
  state.selectedSubtitleIndex = -1
}

export function cancelFullRepeatMode() {
  if (state.repeatMode !== 'full') return
  state.isRepeating = false
  state.repeatMode = null
  state.repeatCount = 0
}

/* ---------------- 播放控制 ---------------- */

export async function togglePlayPause() {
  if (!state.hasMedia) {
    showToast('请先上传视频/音频文件')
    return
  }
  if (state.isPlaying) {
    mediaEl.pause()
    state.isPlaying = false
    return
  }
  try {
    await mediaEl.play()
    state.isPlaying = true
  } catch (e) {
    showToast('播放失败，请重试')
  }
}

export function toggleRepeat() {
  if (state.aPoint === null || state.bPoint === null) {
    showToast('请先设置 A 和 B 点')
    return
  }
  if (state.isRepeating && state.repeatMode === 'ab') {
    state.isRepeating = false
    state.repeatMode = null
    state.repeatCount = 0
    showToast('已关闭 AB 复读')
    return
  }
  state.isRepeating = true
  state.repeatMode = 'ab'
  state.repeatCount = 0
  showToast('已开启 AB 复读')
}

export function setPlaybackSpeed(speed) {
  if (!Number.isFinite(speed)) return
  state.speed = speed
  if (mediaEl) mediaEl.playbackRate = speed
  showToast(`播放速度 ${speed}x`)
}

export function seekBy(seconds) {
  if (!state.hasMedia) {
    showToast('请先上传视频/音频文件')
    return
  }
  const d = state.duration || 0
  mediaEl.currentTime = Math.max(0, Math.min(d || Infinity, mediaEl.currentTime + seconds))
  state.currentTime = mediaEl.currentTime
}

export function repeatFullAudio() {
  if (!state.hasMedia) {
    showToast('请先上传视频/音频文件')
    return
  }
  const d = state.duration || 0
  if (!d) {
    showToast('媒体时长读取中，请稍后再试')
    return
  }
  if (state.isRepeating && state.repeatMode === 'full') {
    state.isRepeating = false
    state.repeatMode = null
    state.repeatCount = 0
    showToast('已关闭整段音频复读')
    return
  }
  setABPoints(0, d)
  state.isRepeating = true
  state.repeatMode = 'full'
  state.repeatCount = 0
  mediaEl.currentTime = 0
  showToast('已开启整段音频复读')
}

export function setVolume(percent) {
  const value = Math.max(0, Math.min(100, Math.round(percent)))
  state.volume = value
  if (mediaEl) {
    mediaEl.volume = value / 100
    mediaEl.muted = value === 0
  }
  state.muted = value === 0
}

export function toggleMute() {
  if (!mediaEl) return
  if (mediaEl.muted || mediaEl.volume === 0) {
    mediaEl.muted = false
    if (mediaEl.volume === 0) mediaEl.volume = 1
    setVolume(Math.floor(mediaEl.volume * 100))
    state.muted = false
  } else {
    mediaEl.muted = true
    setVolume(0)
    state.muted = true
  }
}

export function resetPlayer() {
  if (!state.hasMedia) return
  mediaEl.currentTime = 0
  clearABPoints()
  if (state.isPlaying) {
    mediaEl.pause()
    state.isPlaying = false
  }
  state.currentTime = 0
  showToast('已重置播放器')
}

export function setAPoint() {
  if (!state.hasMedia) return showToast('请先上传视频/音频文件')
  const t = mediaEl.currentTime
  if (state.bPoint !== null && t > state.bPoint) return showToast('A 点不能大于 B 点')
  setABPoints(t, state.bPoint ?? t)
  cancelFullRepeatMode()
  showToast(`A 点：${formatTime(t)}`)
}

export function setBPoint() {
  if (!state.hasMedia) return showToast('请先上传视频/音频文件')
  const t = mediaEl.currentTime
  if (state.aPoint !== null && t < state.aPoint) return showToast('B 点不能小于 A 点')
  setABPoints(state.aPoint ?? t, t)
  cancelFullRepeatMode()
  showToast(`B 点：${formatTime(t)}`)
}

export function clickSubtitle(index) {
  const item = state.subtitles[index]
  if (!item) return
  setABPoints(item.startTime, item.endTime)
  if (!state.isRepeating || state.repeatMode !== 'ab') toggleRepeat()
  state.selectedSubtitleIndex = index
  state.dictIndex = index
  updateDictSentence()
  if (mediaEl) {
    mediaEl.currentTime = item.startTime
    if (!state.isPlaying) togglePlayPause()
  }
  showToast('已设置当前字幕为复读段')
}

/* ---------------- 听写 ---------------- */

export function updateDictSentence() {
  if (!state.subtitles.length) {
    state.dictText = '请先上传字幕'
    state.dictShowAnswer = false
    state.dictInput = ''
    state.dictResult = ''
    return
  }
  state.dictText = state.subtitles[state.dictIndex]?.text || ''
  state.dictShowAnswer = false
  state.dictInput = ''
  state.dictResult = ''
}

export function showAnswer() {
  if (!state.subtitles.length) return showToast('请先上传字幕')
  state.dictShowAnswer = true
}

export function nextDict() {
  if (!state.subtitles.length) return showToast('请先上传字幕')
  state.dictIndex = (state.dictIndex + 1) % state.subtitles.length
  updateDictSentence()
}

export function clearDict() {
  state.dictInput = ''
  state.dictResult = ''
}

/* ---------------- 字幕高亮 ---------------- */

export function highlightCurrentSubtitle() {
  if (!mediaEl || !state.subtitles.length) return
  const t = mediaEl.currentTime
  let newIndex = -1
  for (let i = 0; i < state.subtitles.length; i++) {
    if (t >= state.subtitles[i].startTime && t <= state.subtitles[i].endTime) {
      newIndex = i
      break
    }
  }
  if (newIndex === state.currentSubtitleIndex) return
  state.currentSubtitleIndex = newIndex
  if (newIndex > -1 && newIndex !== state.dictIndex) {
    state.dictIndex = newIndex
    updateDictSentence()
  }
}

/* ---------------- 菜单 / 控件联动动作 ---------------- */

export function enterSegment() {
  if (!state.hasMedia) {
    showToast('请先上传视频/音频文件')
    return
  }
  const seconds = Math.max(1, Math.min(60, parseInt(state.repeatDuration || '5', 10) || 5))
  state.repeatDuration = String(seconds)
  const end = mediaEl.currentTime
  const start = Math.max(0, end - seconds)
  setABPoints(start, end)
  if (!state.isRepeating || state.repeatMode !== 'ab') toggleRepeat()
  showToast(`已设置 ${seconds} 秒回车复读段`)
}

export function stop() {
  if (!state.hasMedia) return
  mediaEl.pause()
  mediaEl.currentTime = 0
  state.isPlaying = false
  state.currentTime = 0
}

export function seekSubtitle(dir) {
  if (!state.subtitles.length) {
    showToast('请先上传字幕')
    return
  }
  let idx = state.currentSubtitleIndex
  if (idx < 0) {
    const t = mediaEl ? mediaEl.currentTime : 0
    idx = state.subtitles.findIndex((s) => s.startTime > t)
    if (idx < 0) idx = 0
  } else {
    idx = Math.max(0, Math.min(state.subtitles.length - 1, idx + dir))
  }
  clickSubtitle(idx)
}

export function toggleView(key) {
  if (key in state) state[key] = !state[key]
}

export async function openMediaDialog() {
  const p = await window.electronAPI.openFile({
    properties: ['openFile'],
    filters: [
      {
        name: '媒体文件',
        extensions: ['mp4', 'mkv', 'mov', 'webm', 'mp3', 'wav', 'm4a', 'aac', 'flac', 'ogg', 'avi']
      }
    ]
  })
  if (p) await loadMediaFile(p)
}

export async function openSubtitleDialog() {
  const p = await window.electronAPI.openFile({
    properties: ['openFile'],
    filters: [{ name: '字幕文件', extensions: ['srt'] }]
  })
  if (p) await loadSRTFile(p)
}

// 把原生菜单的 click 统一路由到与界面按钮完全相同的 store 动作
export async function dispatchAction(id) {
  const editing = ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(
    document.activeElement && document.activeElement.tagName
  )
  const mediaShortcuts = [
    'togglePlay',
    'seekBack',
    'seekForward',
    'setA',
    'setB',
    'prevSub',
    'nextSub',
    'enterSegment',
    'stop'
  ]
  if (editing && mediaShortcuts.includes(id)) return
  switch (id) {
    case 'openMedia':
      await openMediaDialog()
      break
    case 'openSubtitle':
      await openSubtitleDialog()
      break
    case 'togglePlay':
      await togglePlayPause()
      break
    case 'stop':
      stop()
      break
    case 'seekBack':
      seekBy(-5)
      break
    case 'seekForward':
      seekBy(5)
      break
    case 'prevSub':
      seekSubtitle(-1)
      break
    case 'nextSub':
      seekSubtitle(1)
      break
    case 'toggleAB':
      toggleRepeat()
      break
    case 'setA':
      setAPoint()
      break
    case 'setB':
      setBPoint()
      break
    case 'clearAB':
      clearABPoints()
      showToast('已清除 AB 复读段')
      break
    case 'repeatFull':
      repeatFullAudio()
      break
    case 'enterSegment':
      enterSegment()
      break
    case 'speed0.5':
      setPlaybackSpeed(0.5)
      break
    case 'speed0.75':
      setPlaybackSpeed(0.75)
      break
    case 'speed1':
      setPlaybackSpeed(1)
      break
    case 'speed1.25':
      setPlaybackSpeed(1.25)
      break
    case 'speed1.5':
      setPlaybackSpeed(1.5)
      break
    case 'speed2':
      setPlaybackSpeed(2)
      break
    case 'viewSubtitles':
      toggleView('showSubtitles')
      break
    case 'viewWaveform':
      toggleView('showWaveform')
      break
    case 'viewDictation':
      toggleView('showDictation')
      break
    case 'showShortcuts':
      toggleView('showShortcutsModal')
      break
    default:
      break
  }
}

/* ---------------- 快捷键（仅在非输入焦点时生效，避免干扰听写输入） ---------------- */

export function handleKeyboard(e) {
  const tag = e.target && e.target.tagName
  if (tag && ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(tag)) return
  switch (e.code) {
    case 'Space':
      e.preventDefault()
      togglePlayPause()
      break
    case 'ArrowLeft':
      e.preventDefault()
      seekBy(-5)
      break
    case 'ArrowRight':
      e.preventDefault()
      seekBy(5)
      break
    case 'KeyA':
      e.preventDefault()
      setAPoint()
      break
    case 'KeyB':
      e.preventDefault()
      setBPoint()
      break
    case 'Enter':
      e.preventDefault()
      enterSegment()
      break
    case 'Escape':
      if (state.aPoint !== null || state.bPoint !== null) {
        clearABPoints()
        showToast('已清除 AB 复读段')
      }
      break
  }
}

/* ---------------- 进度 / 音量拖拽 ---------------- */

export function startDragProgress() {
  state.isDraggingProgress = true
}
export function dragProgress(clientX) {
  if (!state.isDraggingProgress || !state.hasMedia || !state.duration) return
  const rect = progressContainerEl.getBoundingClientRect()
  const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
  state.currentTime = percent * state.duration
}
export function endDragProgress() {
  if (!state.isDraggingProgress || !state.hasMedia || !state.duration) {
    state.isDraggingProgress = false
    return
  }
  const percent = state.currentTime / state.duration
  mediaEl.currentTime = percent * state.duration
  state.isDraggingProgress = false
}
export function seekToClientX(clientX) {
  if (!state.hasMedia || !state.duration) return
  const rect = progressContainerEl.getBoundingClientRect()
  const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
  mediaEl.currentTime = percent * state.duration
  state.currentTime = mediaEl.currentTime
}
