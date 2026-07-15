<script setup>
import { cn } from '@/lib/utils'
const props = defineProps({
  class: { type: String, default: '' },
  for: { type: String, default: '' }
})
</script>
<template>
  <label :for="for" :class="cn('text-xs font-medium leading-none text-muted-foreground', props.class)">
    <slot />
  </label>
</template>
