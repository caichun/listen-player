<script setup>
import { computed } from 'vue'
import { SliderRoot, SliderTrack, SliderRange, SliderThumb } from 'reka-ui'
import { cn } from '@/lib/utils'

const props = defineProps({
  modelValue: { type: [Number, Array], default: 0 },
  min: { type: Number, default: 0 },
  max: { type: Number, default: 100 },
  step: { type: Number, default: 1 },
  disabled: { type: Boolean, default: false },
  class: { type: String, default: '' }
})
const emits = defineEmits(['update:modelValue'])

const value = computed(() => (Array.isArray(props.modelValue) ? props.modelValue : [props.modelValue]))
function onUpdate(v) {
  emits('update:modelValue', Array.isArray(v) ? v[0] : v)
}
</script>

<template>
  <SliderRoot
    :model-value="value"
    @update:model-value="onUpdate"
    :min="min"
    :max="max"
    :step="step"
    :disabled="disabled"
    :class="cn('relative flex w-full touch-none select-none items-center', props.class)"
  >
    <SliderTrack class="relative h-1.5 w-full grow overflow-hidden rounded-full bg-secondary">
      <SliderRange class="absolute h-full bg-primary" />
    </SliderTrack>
    <SliderThumb
      class="block h-4 w-4 rounded-full border-2 border-primary bg-background shadow transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50"
    />
  </SliderRoot>
</template>
