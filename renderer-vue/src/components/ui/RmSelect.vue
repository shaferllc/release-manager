<template>
  <Select
    :model-value="modelValue"
    :options="options"
    :option-label="optionLabel"
    :option-value="optionValue"
    :placeholder="placeholder"
    :disabled="disabled"
    :class="['rm-select w-full', $attrs.class]"
    @update:model-value="onUpdate"
    @change="onChange"
  />
</template>

<script setup>
import { ref } from 'vue';
import Select from 'primevue/select';

const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  /** Array of option objects or primitives. Required. */
  options: { type: Array, required: true },
  /** Key for label when options are objects (e.g. 'label'). Omit for primitive options. */
  optionLabel: { type: String, default: undefined },
  /** Key for value when options are objects (e.g. 'value'). Omit for primitive options. */
  optionValue: { type: String, default: undefined },
  placeholder: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
});
const emit = defineEmits(['update:modelValue', 'change']);

const selectRef = ref(null);

function onUpdate(value) {
  emit('update:modelValue', value);
}

function onChange(ev) {
  emit('change', ev?.value);
}

function focus() {
  selectRef.value?.focus?.();
}

defineExpose({ focus });
</script>
