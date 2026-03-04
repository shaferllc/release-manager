<template>
  <Textarea
    :model-value="modelValue"
    :placeholder="placeholder"
    :disabled="disabled"
    :rows="rows"
    class="w-full"
    :class="$attrs.class"
    v-bind="$attrs"
    @update:model-value="$emit('update:modelValue', $event)"
  />
</template>

<script setup>
import Textarea from 'primevue/textarea';

defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  rows: { type: Number, default: undefined },
});
defineEmits(['update:modelValue']);
</script>
