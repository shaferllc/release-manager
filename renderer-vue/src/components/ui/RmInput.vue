<template>
  <InputText
    :model-value="modelValue"
    :type="type"
    :placeholder="placeholder"
    :disabled="disabled"
    :autocomplete="autocomplete"
    class="w-full"
    :class="$attrs.class"
    v-bind="$attrs"
    @update:model-value="$emit('update:modelValue', $event)"
  />
</template>

<script setup>
import InputText from 'primevue/inputtext';

defineProps({
  modelValue: { type: [String, Number], default: '' },
  type: { type: String, default: 'text' },
  placeholder: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  autocomplete: { type: String, default: undefined },
});
defineEmits(['update:modelValue']);
</script>
