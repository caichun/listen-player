<template>
  <Card>
    <CardHeader class="flex-row items-center justify-between space-y-0 pb-3">
      <CardTitle>播放控制</CardTitle>
      <div class="flex items-center gap-2">
        <span class="text-xs text-muted-foreground">倍速</span>
        <Select :model-value="state.speed" @update:model-value="(v) => setPlaybackSpeed(Number(v))">
          <SelectTrigger class="h-8 w-[88px]">
            <SelectValue :placeholder="state.speed + 'x'" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="s in speeds" :key="s" :value="s">{{ s }}x</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </CardHeader>

    <CardContent class="space-y-3">
      <!-- 主播放键 -->
      <Button
        class="h-11 w-full text-base"
        :variant="state.isPlaying ? 'secondary' : 'default'"
        @click="togglePlayPause"
      >
        <component :is="state.isPlaying ? Pause : Play" class="h-5 w-5" />
        {{ state.isPlaying ? '暂停' : '播放 / 暂停' }}
      </Button>

      <!-- 快退快进 -->
      <div class="grid grid-cols-2 gap-2">
        <Button variant="outline" @click="seekBy(-5)">
          <Rewind class="h-4 w-4" /> 后退 5s
        </Button>
        <Button variant="outline" @click="seekBy(5)">
          <FastForward class="h-4 w-4" /> 前进 5s
        </Button>
      </div>

      <!-- 重置 / A-B 循环 / 整段复读 -->
      <div class="grid grid-cols-3 gap-2">
        <Button variant="ghost" size="sm" @click="resetPlayer">
          <RotateCcw class="h-4 w-4" /> 重置
        </Button>
        <Button :variant="abActive ? 'default' : 'outline'" size="sm" @click="toggleRepeat">
          <Repeat class="h-4 w-4" /> A-B
        </Button>
        <Button :variant="fullActive ? 'default' : 'outline'" size="sm" @click="repeatFullAudio">
          <Repeat1 class="h-4 w-4" /> 整段
        </Button>
      </div>

      <!-- 设 A / 设 B -->
      <div class="grid grid-cols-2 gap-2">
        <Button variant="outline" size="sm" @click="setAPoint">
          <MapPin class="h-4 w-4" /> 设 A 点
        </Button>
        <Button variant="outline" size="sm" @click="setBPoint">
          <MapPin class="h-4 w-4" /> 设 B 点
        </Button>
      </div>

      <Button
        v-if="state.aPoint !== null || state.bPoint !== null"
        variant="outline"
        size="sm"
        class="w-full"
        @click="clearABPoints"
      >
        <Eraser class="h-4 w-4" /> 清除 A-B
      </Button>

      <!-- 音量 -->
      <div class="flex items-center gap-3">
        <Button variant="ghost" size="icon" @click="toggleMute" :title="state.muted ? '取消静音' : '静音'">
          <component :is="state.muted ? VolumeX : Volume2" class="h-4 w-4" />
        </Button>
        <Slider
          class="flex-1"
          :model-value="state.volume"
          :max="100"
          :step="1"
          @update:model-value="setVolume"
        />
      </div>

      <!-- 复读参数 -->
      <div class="grid grid-cols-2 gap-3">
        <div class="space-y-1">
          <Label for="repeat-duration">回退时长</Label>
          <div class="flex items-center gap-1">
            <Input id="repeat-duration" type="number" min="1" max="60" v-model.number="state.repeatDuration" class="h-8" />
            <span class="text-xs text-muted-foreground">秒</span>
          </div>
        </div>
        <div class="space-y-1">
          <Label for="repeat-count">复读次数</Label>
          <div class="flex items-center gap-1">
            <Input id="repeat-count" type="number" min="1" v-model="state.repeatLimitInput" placeholder="∞" class="h-8" />
            <span class="text-xs text-muted-foreground">次</span>
          </div>
        </div>
      </div>

      <!-- A-B 区间信息 -->
      <div
        v-if="state.aPoint !== null && state.bPoint !== null"
        class="rounded-md border bg-muted/40 px-3 py-2 text-center text-xs font-medium tabular-nums"
      >
        {{ formatTime(state.aPoint) }} — {{ formatTime(state.bPoint) }}
      </div>

      <!-- 显示选项 -->
      <div class="space-y-2 border-t pt-3">
        <p class="text-xs font-medium text-muted-foreground">显示选项</p>
        <label class="flex items-center justify-between">
          <span class="text-sm">字幕面板</span>
          <Switch :model-value="state.showSubtitles" @update:model-value="(v) => (state.showSubtitles = v)" />
        </label>
        <label class="flex items-center justify-between">
          <span class="text-sm">波形显示</span>
          <Switch :model-value="state.showWaveform" @update:model-value="(v) => (state.showWaveform = v)" />
        </label>
        <label class="flex items-center justify-between">
          <span class="text-sm">听写模式</span>
          <Switch :model-value="state.showDictation" @update:model-value="(v) => (state.showDictation = v)" />
        </label>
      </div>
    </CardContent>
  </Card>
</template>

<script setup>
import { computed } from 'vue'
import {
  Play, Pause, Rewind, FastForward, RotateCcw, Repeat, Repeat1, MapPin, Eraser, Volume2, VolumeX
} from 'lucide-vue-next'
import {
  state, formatTime, setPlaybackSpeed, togglePlayPause, seekBy, resetPlayer,
  toggleRepeat, repeatFullAudio, setAPoint, setBPoint, clearABPoints, setVolume, toggleMute
} from '../store/player.js'
import Card from '@/components/ui/card/Card.vue'
import CardHeader from '@/components/ui/card/CardHeader.vue'
import CardTitle from '@/components/ui/card/CardTitle.vue'
import CardContent from '@/components/ui/card/CardContent.vue'
import Button from '@/components/ui/button/Button.vue'
import Slider from '@/components/ui/slider/Slider.vue'
import Select from '@/components/ui/select/Select.vue'
import SelectTrigger from '@/components/ui/select/SelectTrigger.vue'
import SelectValue from '@/components/ui/select/SelectValue.vue'
import SelectContent from '@/components/ui/select/SelectContent.vue'
import SelectItem from '@/components/ui/select/SelectItem.vue'
import Switch from '@/components/ui/switch/Switch.vue'
import Input from '@/components/ui/input/Input.vue'
import Label from '@/components/ui/label/Label.vue'

const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2]
const abActive = computed(() => state.isRepeating && state.repeatMode === 'ab')
const fullActive = computed(() => state.isRepeating && state.repeatMode === 'full')
</script>
