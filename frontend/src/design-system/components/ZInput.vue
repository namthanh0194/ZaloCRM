<template>
  <div
    class="z-input-wrapper"
    :class="[
      `z-input--${size}`,
      {
        'is-disabled': disabled,
        'is-error': !!error,
      }
    ]"
  >
    <label v-if="label" class="z-input__label">
      {{ label }}
    </label>
    <div class="z-input__field-wrap">
      <span v-if="$slots.prefix" class="z-input__prefix">
        <slot name="prefix" />
      </span>
      <input
        ref="inputEl"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        class="z-input__field"
        @input="onInput"
        @focus="$emit('focus', $event)"
        @blur="$emit('blur', $event)"
      />
      <button
        v-if="clearable && modelValue && !disabled && !readonly"
        type="button"
        class="z-input__clear"
        title="Xóa"
        @click="onClear"
      >
        ✕
      </button>
      <span v-if="$slots.suffix" class="z-input__suffix">
        <slot name="suffix" />
      </span>
    </div>
    <div v-if="error" class="z-input__error">
      {{ error }}
    </div>
    <div v-else-if="helpText" class="z-input__help">
      {{ helpText }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const props = withDefaults(
  defineProps<{
    modelValue?: string | number;
    type?: string;
    label?: string;
    placeholder?: string;
    helpText?: string;
    error?: string;
    disabled?: boolean;
    readonly?: boolean;
    clearable?: boolean;
    size?: 'sm' | 'md' | 'lg';
  }>(),
  {
    modelValue: '',
    type: 'text',
    size: 'md',
    disabled: false,
    readonly: false,
    clearable: false,
  }
);

const emit = defineEmits<{
  (e: 'update:modelValue', val: string): void;
  (e: 'clear'): void;
  (e: 'focus', ev: FocusEvent): void;
  (e: 'blur', ev: FocusEvent): void;
}>();

const inputEl = ref<HTMLInputElement | null>(null);

function onInput(ev: Event) {
  emit('update:modelValue', (ev.target as HTMLInputElement).value);
}

function onClear() {
  emit('update:modelValue', '');
  emit('clear');
  inputEl.value?.focus();
}
</script>

<style scoped>
.z-input-wrapper {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-family: var(--font-family-sans);
}

.z-input__label {
  font-size: var(--font-size-xs, 12px);
  font-weight: var(--font-weight-medium, 500);
  color: var(--color-text, #141a24);
}

.z-input__field-wrap {
  display: flex;
  align-items: center;
  background-color: var(--color-surface, #ffffff);
  border: 1px solid var(--color-border, #e7eaf0);
  border-radius: var(--radius-md, 8px);
  transition: border-color var(--duration-fast, 140ms) var(--ease-standard, ease),
              box-shadow var(--duration-fast, 140ms) var(--ease-standard, ease);
}

.z-input__field-wrap:focus-within {
  border-color: var(--color-border-focus, #1786be);
  box-shadow: 0 0 0 2px var(--color-primary-subtle, #e4f1f8);
}

.z-input__field {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  color: var(--color-text, #141a24);
  font-family: inherit;
  font-size: inherit;
  padding: 0 var(--space-3, 12px);
  min-width: 0;
}
.z-input__field::placeholder {
  color: var(--color-text-muted, #6b7488);
}

/* Sizes */
.z-input--sm .z-input__field-wrap { height: 28px; font-size: var(--font-size-xs, 12px); border-radius: var(--radius-sm, 6px); }
.z-input--md .z-input__field-wrap { height: 36px; font-size: var(--font-size-md, 14px); }
.z-input--lg .z-input__field-wrap { height: 44px; font-size: var(--font-size-lg, 16px); }

.z-input__prefix, .z-input__suffix {
  display: inline-flex;
  align-items: center;
  color: var(--color-text-muted, #6b7488);
  padding: 0 var(--space-2, 8px);
}

.z-input__clear {
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--color-text-muted, #6b7488);
  font-size: 11px;
  padding: 0 8px;
}
.z-input__clear:hover {
  color: var(--color-text, #141a24);
}

/* Error & Disabled */
.z-input-wrapper.is-error .z-input__field-wrap {
  border-color: var(--color-danger, #f04438);
}
.z-input-wrapper.is-error .z-input__field-wrap:focus-within {
  box-shadow: 0 0 0 2px var(--color-danger-subtle, #fdeceb);
}
.z-input__error {
  font-size: 11px;
  color: var(--color-danger, #f04438);
}
.z-input__help {
  font-size: 11px;
  color: var(--color-text-muted, #6b7488);
}
.z-input-wrapper.is-disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.z-input-wrapper.is-disabled .z-input__field {
  cursor: not-allowed;
}
</style>
