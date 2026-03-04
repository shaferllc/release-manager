<template>
  <label
    :class="[
      'rm-checkbox-label cursor-pointer',
      rowLayout ? 'settings-row settings-row-clickable grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1' : 'flex items-center gap-2',
      $attrs.class
    ]"
  >
    <Checkbox
      :model-value="booleanValue"
      :binary="true"
      :disabled="disabled"
      :input-id="inputId"
      class="shrink-0"
      :class="rowLayout ? 'col-start-1 row-start-1 self-center' : ''"
      @update:model-value="onChange"
    />
    <div v-if="rowLayout" class="contents">
      <span v-if="label || $slots.default" class="settings-label col-start-2 row-start-1 block text-rm-text">
        <slot>{{ label }}</slot>
      </span>
      <p v-if="description || $slots.description" class="settings-desc col-start-2 row-start-2 m-0 text-sm text-rm-muted">
        <slot name="description">{{ description }}</slot>
      </p>
    </div>
    <span v-else-if="label || $slots.default" class="text-sm text-rm-text">
      <slot>{{ label }}</slot>
    </span>
  </label>
</template>

<script setup>
import { computed, ref } from 'vue';
import Checkbox from 'primevue/checkbox';

const props = defineProps({
  modelValue: { type: [Boolean, String], default: false },
  label: { type: String, default: '' },
  description: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  rowLayout: { type: Boolean, default: false },
  trueValue: { type: [Boolean, String], default: undefined },
  falseValue: { type: [Boolean, String], default: undefined },
});
const emit = defineEmits(['update:modelValue', 'change']);

const inputId = ref(`rm-checkbox-${Math.random().toString(36).slice(2, 9)}`);

const booleanValue = computed(() => {
  if (props.trueValue !== undefined && props.falseValue !== undefined) {
    return props.modelValue === props.trueValue;
  }
  return !!props.modelValue;
});

function onChange(checked) {
  const value = props.trueValue !== undefined && props.falseValue !== undefined
    ? (checked ? props.trueValue : props.falseValue)
    : checked;
  emit('update:modelValue', value);
  emit('change', value);
}
</script>
