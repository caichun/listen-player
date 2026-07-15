<template>
  <Card>
    <CardHeader class="flex-row items-center justify-between space-y-0 pb-3">
      <CardTitle>快捷键</CardTitle>
      <Keyboard class="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div class="grid gap-2 text-sm">
        <div v-for="s in shortcuts" :key="s.k" class="flex items-center gap-3">
          <kbd class="inline-flex h-6 min-w-[1.75rem] items-center justify-center rounded border bg-muted px-1.5 font-mono text-xs font-semibold">{{ s.k }}</kbd>
          <span class="text-muted-foreground">{{ s.d }}</span>
        </div>
      </div>
    </CardContent>
  </Card>
</template>

<script setup>
import { Keyboard } from 'lucide-vue-next'
import Card from '@/components/ui/card/Card.vue'
import CardHeader from '@/components/ui/card/CardHeader.vue'
import CardTitle from '@/components/ui/card/CardTitle.vue'
import CardContent from '@/components/ui/card/CardContent.vue'

const shortcuts = [
  { k: 'Space', d: '播放 / 暂停' },
  { k: '← →', d: '后退 / 前进 5 秒' },
  { k: 'A / B', d: '设置 A / B 点' },
  { k: 'Enter', d: '回溯 N 秒片段复读' },
  { k: 'Esc', d: '清除 A-B 复读段' }
]
</script>
