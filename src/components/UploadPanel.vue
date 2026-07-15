<template>
  <Card>
    <CardHeader class="flex-row items-center justify-between space-y-0 pb-3">
      <CardTitle>媒体文件</CardTitle>
      <Button variant="outline" size="sm" @click="openMedia">选择</Button>
    </CardHeader>
    <CardContent class="space-y-3">
      <div
        class="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed px-3 py-5 text-center transition-colors"
        :class="dragMedia ? 'border-primary bg-accent' : 'border-border bg-muted/30 hover:border-primary/60'"
        @click="openMedia"
        @dragover.prevent="dragMedia = true"
        @dragleave.prevent="dragMedia = false"
        @drop.prevent="onDropMedia"
      >
        <Upload class="h-5 w-5 text-muted-foreground" />
        <p class="text-sm font-medium">{{ state.hasMedia ? state.mediaName : '拖入或点击选择视频/音频' }}</p>
        <p class="text-xs text-muted-foreground">支持 MP4 / MP3 / WAV / OGG 等</p>
        <input type="file" accept="video/*,audio/*" hidden ref="mediaInput" @change="onMediaInput" />
      </div>

      <CardTitle class="pt-1">字幕文件</CardTitle>
      <div
        class="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed px-3 py-5 text-center transition-colors"
        :class="dragSrt ? 'border-primary bg-accent' : 'border-border bg-muted/30 hover:border-primary/60'"
        @click="openSrt"
        @dragover.prevent="dragSrt = true"
        @dragleave.prevent="dragSrt = false"
        @drop.prevent="onDropSrt"
      >
        <FileText class="h-5 w-5 text-muted-foreground" />
        <p class="text-sm font-medium">{{ state.hasSubtitles ? state.srtName : '拖入或点击选择字幕' }}</p>
        <p class="text-xs text-muted-foreground">仅支持 SRT 文件</p>
        <input type="file" accept=".srt" hidden ref="srtInput" @change="onSrtInput" />
      </div>
    </CardContent>
  </Card>
</template>

<script setup>
import { ref } from 'vue'
import { Upload, FileText } from 'lucide-vue-next'
import { state, loadMediaFile, loadSRTFile, showToast } from '../store/player.js'
import Card from '@/components/ui/card/Card.vue'
import CardHeader from '@/components/ui/card/CardHeader.vue'
import CardTitle from '@/components/ui/card/CardTitle.vue'
import CardContent from '@/components/ui/card/CardContent.vue'
import Button from '@/components/ui/button/Button.vue'

const dragMedia = ref(false)
const dragSrt = ref(false)
const mediaInput = ref(null)
const srtInput = ref(null)

const mediaFilters = [
  { name: '媒体文件', extensions: ['mp4', 'mp3', 'wav', 'ogg', 'webm', 'm4a', 'mov', 'flac', 'aac', 'mkv', 'avi'] }
]
const srtFilters = [{ name: '字幕文件', extensions: ['srt'] }]

async function openMedia() {
  const p = await window.electronAPI.openFile({ properties: ['openFile'], filters: mediaFilters })
  if (p) loadMediaFile(p)
}
async function openSrt() {
  const p = await window.electronAPI.openFile({ properties: ['openFile'], filters: srtFilters })
  if (p) loadSRTFile(p)
}
function onMediaInput(e) {
  const f = e.target.files?.[0]
  if (!f) return
  if (!/(video|audio)/.test(f.type)) return showToast('请选择视频/音频文件')
  if (f.path) loadMediaFile(f.path)
}
function onSrtInput(e) {
  const f = e.target.files?.[0]
  if (!f) return
  if (!f.name.toLowerCase().endsWith('.srt')) return showToast('请选择 .srt 文件')
  if (f.path) loadSRTFile(f.path)
}
function onDropMedia(e) {
  dragMedia.value = false
  const f = e.dataTransfer.files?.[0]
  if (!f || !f.path) return showToast('无法获取文件路径')
  if (!/(video|audio)/.test(f.type)) return showToast('请拖拽视频/音频文件')
  loadMediaFile(f.path)
}
function onDropSrt(e) {
  dragSrt.value = false
  const f = e.dataTransfer.files?.[0]
  if (!f || !f.path) return showToast('无法获取文件路径')
  if (!f.name.toLowerCase().endsWith('.srt')) return showToast('请拖拽 .srt 文件')
  loadSRTFile(f.path)
}
</script>
