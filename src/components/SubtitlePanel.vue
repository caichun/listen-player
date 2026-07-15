<template>
  <Card class="flex h-full flex-col">
    <CardHeader class="flex-row items-center justify-between space-y-0 pb-3">
      <CardTitle>字幕</CardTitle>
      <label class="flex items-center gap-2 text-xs text-muted-foreground">
        <Switch
          :model-value="state.hideCurrentSubtitle"
          @update:model-value="(v) => (state.hideCurrentSubtitle = v)"
        />
        隐藏播放句
      </label>
    </CardHeader>
    <CardContent class="min-h-0 flex-1 p-0">
      <ScrollArea class="h-full">
        <div ref="containerEl" class="subtitles-list px-2 pb-2">
          <div v-if="!state.hasSubtitles" class="grid h-40 place-items-center text-sm text-muted-foreground">
            请上传字幕文件
          </div>
          <div
            v-for="(item, index) in state.subtitles"
            :key="index"
            :data-index="index"
            class="subtitle-item cursor-pointer rounded-md border-l-2 border-transparent px-3 py-2 transition-colors hover:bg-accent/50"
            :class="{
              'border-primary bg-accent': index === state.currentSubtitleIndex,
              'bg-muted/40': index === state.selectedSubtitleIndex && index !== state.currentSubtitleIndex
            }"
            @click="clickSubtitle(index)"
          >
            <div class="mb-1 text-xs font-medium tabular-nums text-muted-foreground">
              {{ formatTime(item.startTime) }} - {{ formatTime(item.endTime) }}
            </div>
            <div
              class="subtitle-text text-sm leading-relaxed"
              :class="{ 'blur-[3px] select-none': state.hideCurrentSubtitle && index === state.currentSubtitleIndex }"
            >
              {{ item.text }}
            </div>
          </div>
        </div>
      </ScrollArea>
    </CardContent>
  </Card>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import { state, formatTime, clickSubtitle } from '../store/player.js'
import Card from '@/components/ui/card/Card.vue'
import CardHeader from '@/components/ui/card/CardHeader.vue'
import CardTitle from '@/components/ui/card/CardTitle.vue'
import CardContent from '@/components/ui/card/CardContent.vue'
import ScrollArea from '@/components/ui/scroll-area/ScrollArea.vue'
import Switch from '@/components/ui/switch/Switch.vue'

const containerEl = ref(null)

watch(
  () => state.currentSubtitleIndex,
  async (idx) => {
    if (idx < 0 || !containerEl.value) return
    await nextTick()
    const el = containerEl.value.querySelector(`[data-index="${idx}"]`)
    if (!el) return
    const cRect = containerEl.value.getBoundingClientRect()
    const eRect = el.getBoundingClientRect()
    const delta = eRect.top + eRect.height / 2 - (cRect.top + cRect.height / 2)
    containerEl.value.scrollTo({ top: containerEl.value.scrollTop + delta, behavior: 'smooth' })
  }
)
</script>
