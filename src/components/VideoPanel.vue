<template>
  <Card class="video-panel">
    <CardHeader class="flex-row items-center justify-between space-y-0 pb-3">
      <CardTitle>音视频播放</CardTitle>
      <span class="text-xs text-muted-foreground">波形进度条</span>
    </CardHeader>

    <CardContent class="space-y-3">
      <div class="relative overflow-hidden rounded-lg border bg-zinc-900">
        <video
          id="media-player"
          ref="videoEl"
          class="block h-[320px] w-full bg-zinc-900 object-contain"
          @loadedmetadata="onMeta"
          @ended="onEnd"
          @timeupdate="onTime"
        ></video>
      </div>

      <div v-if="state.showWaveform" class="space-y-1.5">
        <div class="flex justify-between text-xs font-medium tabular-nums text-muted-foreground">
          <span id="current-time">{{ formatTime(state.currentTime) }}</span>
          <span id="duration">{{ formatTime(state.duration) }}</span>
        </div>

        <div
          id="progress-container"
          class="relative h-14 w-full cursor-pointer overflow-hidden rounded-lg border bg-muted"
          ref="progressEl"
          @click="onClick"
          @mousedown="onDown"
        >
          <canvas id="waveform-canvas" ref="canvasEl" class="absolute inset-0 h-full w-full"></canvas>
          <div
            class="absolute inset-y-0 left-0 bg-primary/15"
            :style="{ width: progressPercent + '%' }"
          ></div>
          <div
            class="absolute inset-y-0 w-px bg-foreground/40"
            :style="{ left: aPercent + '%', opacity: state.aPoint !== null ? 1 : 0 }"
          ></div>
          <div
            class="absolute inset-y-0 w-px bg-foreground/40"
            :style="{ left: bPercent + '%', opacity: state.bPoint !== null ? 1 : 0 }"
          ></div>
          <div
            class="absolute inset-y-0 w-0.5 bg-primary"
            :style="{ left: progressPercent + '%' }"
          ></div>
        </div>
      </div>
    </CardContent>
  </Card>
</template>

<script setup>
import { onMounted, onUnmounted, ref, watch, nextTick } from 'vue'
import {
  state, aPercent, bPercent, progressPercent, formatTime,
  setMediaElement, setCanvas, setProgressContainer,
  onLoadedMetadata, onEnded, onTimeUpdate,
  startDragProgress, dragProgress, endDragProgress, seekToClientX, drawWaveform
} from '../store/player.js'
import Card from '@/components/ui/card/Card.vue'
import CardHeader from '@/components/ui/card/CardHeader.vue'
import CardTitle from '@/components/ui/card/CardTitle.vue'
import CardContent from '@/components/ui/card/CardContent.vue'

const videoEl = ref(null)
const canvasEl = ref(null)
const progressEl = ref(null)

function onMeta() { onLoadedMetadata() }
function onEnd() { onEnded() }
function onTime() { onTimeUpdate() }
function onClick(e) { seekToClientX(e.clientX) }
function onDown(e) {
  startDragProgress()
  const move = (ev) => dragProgress(ev.clientX)
  const up = () => {
    endDragProgress()
    document.removeEventListener('mousemove', move)
    document.removeEventListener('mouseup', up)
  }
  document.addEventListener('mousemove', move)
  document.addEventListener('mouseup', up)
}
function onResize() { drawWaveform() }

// 菜单「波形显示」重新打开时，重新绘制已缓存的波形
watch(
  () => state.showWaveform,
  (visible) => {
    if (visible) nextTick(drawWaveform)
  }
)

onMounted(() => {
  setMediaElement(videoEl.value)
  setCanvas(canvasEl.value)
  setProgressContainer(progressEl.value)
  drawWaveform()
  window.addEventListener('resize', onResize)
})
onUnmounted(() => {
  window.removeEventListener('resize', onResize)
})
</script>
