<template>
  <div class="flex h-screen flex-col overflow-hidden bg-background text-foreground">
    <!-- 顶栏 -->
    <header class="flex h-12 shrink-0 items-center gap-3 border-b bg-card px-3">
      <div class="flex items-center gap-2">
        <div class="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <AudioLines class="h-4 w-4" />
        </div>
        <span class="text-sm font-semibold tracking-tight">听力复读机</span>
      </div>
      <Separator orientation="vertical" class="h-5" />
      <div class="min-w-0 flex-1 truncate text-sm text-muted-foreground" :title="state.mediaName">
        {{ state.mediaName || '未加载媒体文件' }}
      </div>
      <Button variant="outline" size="sm" @click="dispatchAction('openMedia')">
        <Upload class="h-4 w-4" /> 打开媒体
      </Button>
      <Button variant="outline" size="sm" @click="dispatchAction('openSubtitle')">
        <FileText class="h-4 w-4" /> 打开字幕
      </Button>
    </header>

    <!-- 工作区 -->
    <div class="grid min-h-0 flex-1 grid-cols-[300px_minmax(0,1fr)_340px]">
      <aside class="thin-scroll flex min-h-0 flex-col gap-3 overflow-y-auto border-r bg-muted/40 p-3">
        <UploadPanel />
        <PlayerControls />
        <ShortcutPanel />
      </aside>

      <main class="thin-scroll flex min-h-0 flex-col gap-3 overflow-y-auto bg-background p-3">
        <VideoPanel />
        <DictationPanel v-if="state.showDictation" />
      </main>

      <aside v-if="state.showSubtitles" class="min-h-0 border-l bg-muted/40 p-3">
        <SubtitlePanel />
      </aside>
    </div>

    <!-- 状态栏 -->
    <footer class="flex h-7 shrink-0 items-center gap-3 border-t bg-card px-3 text-xs text-muted-foreground">
      <span class="font-medium tabular-nums">{{ formatTime(state.currentTime) }} / {{ formatTime(state.duration) }}</span>
      <template v-if="state.aPoint !== null && state.bPoint !== null">
        <Separator orientation="vertical" class="h-4" />
        <Badge variant="secondary">A-B {{ formatTime(state.aPoint) }} – {{ formatTime(state.bPoint) }}</Badge>
        <Badge v-if="state.isRepeating" variant="default">复读 {{ state.repeatCount }}</Badge>
      </template>
      <template v-else-if="state.isRepeating">
        <Separator orientation="vertical" class="h-4" />
        <Badge variant="default">复读中</Badge>
      </template>
      <div class="flex-1"></div>
      <span class="text-[11px] text-muted-foreground/70">
        Space 播放 · ← → 快退快进 · A / B 设端点 · Enter 片段复读 · Esc 清除
      </span>
    </footer>

    <!-- Toast -->
    <Transition name="toast">
      <div
        v-if="state.toast.visible"
        class="fixed bottom-10 right-4 z-[9999] rounded-md border bg-foreground px-3 py-2 text-xs font-medium text-background shadow-lg"
      >
        {{ state.toast.message }}
      </div>
    </Transition>

    <!-- 快捷键弹窗 -->
    <Dialog :open="state.showShortcutsModal" @update:open="(v) => (state.showShortcutsModal = v)">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>键盘快捷键</DialogTitle>
          <DialogDescription>这些快捷键同样可以在顶部菜单「播放 / 复读 / 视图」中找到并点击。</DialogDescription>
        </DialogHeader>
        <div class="grid gap-2 text-sm">
          <div v-for="s in shortcuts" :key="s.k" class="flex items-center gap-3">
            <kbd class="inline-flex h-6 min-w-[1.75rem] items-center justify-center rounded border bg-muted px-1.5 font-mono text-xs font-semibold">{{ s.k }}</kbd>
            <span class="text-muted-foreground">{{ s.d }}</span>
          </div>
        </div>
        <DialogFooter>
          <Button @click="state.showShortcutsModal = false">知道了</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, watch } from 'vue'
import { AudioLines, Upload, FileText } from 'lucide-vue-next'
import UploadPanel from './components/UploadPanel.vue'
import PlayerControls from './components/PlayerControls.vue'
import VideoPanel from './components/VideoPanel.vue'
import SubtitlePanel from './components/SubtitlePanel.vue'
import DictationPanel from './components/DictationPanel.vue'
import ShortcutPanel from './components/ShortcutPanel.vue'
import { state, formatTime, dispatchAction, handleKeyboard } from './store/player.js'
import Button from '@/components/ui/button/Button.vue'
import Separator from '@/components/ui/separator/Separator.vue'
import Badge from '@/components/ui/badge/Badge.vue'
import Dialog from '@/components/ui/dialog/Dialog.vue'
import DialogContent from '@/components/ui/dialog/DialogContent.vue'
import DialogHeader from '@/components/ui/dialog/DialogHeader.vue'
import DialogTitle from '@/components/ui/dialog/DialogTitle.vue'
import DialogDescription from '@/components/ui/dialog/DialogDescription.vue'
import DialogFooter from '@/components/ui/dialog/DialogFooter.vue'

const shortcuts = [
  { k: 'Space', d: '播放 / 暂停' },
  { k: '← / →', d: '后退 / 前进 5 秒' },
  { k: 'A / B', d: '设置 A / B 点' },
  { k: 'Enter', d: '以当前时间为终点，向前回溯 N 秒复读' },
  { k: 'Esc', d: '清除 A-B 复读段' },
  { k: 'Ctrl/⌘ + O', d: '打开媒体文件' },
  { k: 'Ctrl/⌘ + ⇧ + S', d: '打开字幕文件' }
]

let offAction = null

function pushMenuState() {
  if (window.electronAPI && window.electronAPI.setMenuState) {
    window.electronAPI.setMenuState({
      abActive: state.isRepeating && state.repeatMode === 'ab',
      fullActive: state.isRepeating && state.repeatMode === 'full',
      showSubtitles: state.showSubtitles,
      showWaveform: state.showWaveform,
      showDictation: state.showDictation
    })
  }
}

watch(
  () => [state.isRepeating, state.repeatMode, state.showSubtitles, state.showWaveform, state.showDictation],
  pushMenuState,
  { immediate: true }
)

onMounted(() => {
  if (window.electronAPI && window.electronAPI.onAction) {
    offAction = window.electronAPI.onAction((id) => dispatchAction(id))
  }
  window.addEventListener('keydown', handleKeyboard)
})
onUnmounted(() => {
  if (offAction) offAction()
  window.removeEventListener('keydown', handleKeyboard)
})
</script>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(6px);
}
</style>
