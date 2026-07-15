<template>
  <Card>
    <CardHeader class="flex-row items-center justify-between space-y-0 pb-3">
      <CardTitle>听写</CardTitle>
      <span class="text-xs text-muted-foreground">同步当前字幕句子</span>
    </CardHeader>
    <CardContent class="space-y-3">
      <div class="rounded-md border bg-muted/30 px-3 py-2">
        <span class="text-xs text-muted-foreground">当前句子：</span>
        <p
          class="mt-1 text-sm font-medium"
          :class="state.dictShowAnswer ? '' : 'blur-[4px] select-none'"
        >
          {{ state.dictText }}
        </p>
      </div>

      <Textarea v-model="state.dictInput" placeholder="在此输入听写内容……" class="min-h-[100px]" />

      <div class="grid grid-cols-3 gap-2">
        <Button variant="outline" size="sm" @click="showAnswer">
          <Eye class="h-4 w-4" /> 显示答案
        </Button>
        <Button variant="outline" size="sm" @click="nextDict">
          <ChevronRight class="h-4 w-4" /> 下一句
        </Button>
        <Button variant="outline" size="sm" @click="clearDict">
          <Eraser class="h-4 w-4" /> 清空
        </Button>
      </div>

      <p v-if="state.dictResult" class="min-h-[1.25rem] text-xs text-muted-foreground">
        {{ state.dictResult }}
      </p>
    </CardContent>
  </Card>
</template>

<script setup>
import { Eye, ChevronRight, Eraser } from 'lucide-vue-next'
import { state, showAnswer, nextDict, clearDict } from '../store/player.js'
import Card from '@/components/ui/card/Card.vue'
import CardHeader from '@/components/ui/card/CardHeader.vue'
import CardTitle from '@/components/ui/card/CardTitle.vue'
import CardContent from '@/components/ui/card/CardContent.vue'
import Button from '@/components/ui/button/Button.vue'
import Textarea from '@/components/ui/textarea/Textarea.vue'
</script>
