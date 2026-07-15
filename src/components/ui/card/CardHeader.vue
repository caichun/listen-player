<script setup>
import { cn } from '@/lib/utils'
const props = defineProps({ class: { type: String, default: '' } })
</script>
<template>
  <div :class="cn('flex flex-col space-y-1.5 p-4', props.class)">
    <slot />
  </div>
</template>
