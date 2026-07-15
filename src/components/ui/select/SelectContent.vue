<script setup>
import { SelectPortal, SelectContent, SelectViewport } from 'reka-ui'
import { cn } from '@/lib/utils'

const props = defineProps({
  class: { type: String, default: '' },
  position: { type: String, default: 'popper' },
  align: { type: String, default: 'center' }
})
</script>

<template>
  <SelectPortal>
    <SelectContent
      :class="cn(
        'relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
        position === 'popper' && 'data-[side=bottom]:translate-y-1 data-[side=top]:-translate-y-1',
        props.class
      )"
      :position="position"
      :align="align"
      :side-offset="4"
    >
      <SelectViewport
        :class="cn(
          'p-1',
          position === 'popper' && 'w-full min-w-[var(--reka-select-trigger-width)]'
        )"
      >
        <slot />
      </SelectViewport>
    </SelectContent>
  </SelectPortal>
</template>
