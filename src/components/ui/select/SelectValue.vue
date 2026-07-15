<script setup>
import { SelectValue } from 'reka-ui'
import { cn } from '@/lib/utils'

const props = defineProps({
  class: { type: String, default: '' },
  placeholder: { type: String, default: '' }
})
</script>

<template>
  <SelectValue :class="cn(props.class)" :placeholder="placeholder">
    <slot />
  </SelectValue>
</template>
