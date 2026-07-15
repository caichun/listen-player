<script setup>
import { DialogClose } from 'reka-ui'
import { cn } from '@/lib/utils'
const props = defineProps({ class: { type: String, default: '' } })
</script>
<template>
  <DialogClose :class="cn(props.class)">
    <slot />
  </DialogClose>
</template>
