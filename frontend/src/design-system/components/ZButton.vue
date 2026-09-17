<template>
  <button
    :type="type"
    class="z-btn"
    :class="[
      `z-btn--${variant}`,
      `z-btn--${size}`,
      {
        'is-loading': loading,
        'is-disabled': disabled || loading,
        'is-block': block,
        'is-icon-only': icon,
      }
    ]"
    :disabled="disabled || loading"
    v-bind="$attrs"
  >
    <span v-if="loading" class="z-btn__spinner" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" class="spin-svg">
        <circle cx="12" cy="12" r="10" stroke-opacity="0.25" />
        <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round" />
      </svg>
    </span>
    <span v-if="$slots.prepend && !loading" class="z-btn__prepend">
      <slot name="prepend" />
    </span>
    <span class="z-btn__content">
      <slot />
    </span>
    <span v-if="$slots.append && !loading" class="z-btn__append">
      <slot name="append" />
    </span>
  </button>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'link';
    size?: 'sm' | 'md' | 'lg';
    type?: 'button' | 'submit' | 'reset';
    disabled?: boolean;
    loading?: boolean;
    block?: boolean;
    icon?: boolean;
  }>(),
  {
    variant: 'primary',
    size: 'md',
    type: 'button',
    disabled: false,
    loading: false,
    block: false,
    icon: false,
  }
);
</script>

<style scoped>
.z-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2, 8px);
  font-family: var(--font-family-sans);
  font-weight: var(--font-weight-medium, 500);
  line-height: 1.25;
  border: 1px solid transparent;
  border-radius: var(--radius-md, 8px);
  cursor: pointer;
  text-decoration: none;
  transition: background-color var(--duration-fast, 140ms) var(--ease-standard, ease),
              border-color var(--duration-fast, 140ms) var(--ease-standard, ease),
              color var(--duration-fast, 140ms) var(--ease-standard, ease),
              box-shadow var(--duration-fast, 140ms) var(--ease-standard, ease);
  white-space: nowrap;
  user-select: none;
}

.z-btn:focus-visible {
  outline: 2px solid var(--color-border-focus, #1786be);
  outline-offset: 2px;
}

/* Sizes */
.z-btn--sm {
  height: 28px;
  padding: 0 var(--space-2, 8px);
  font-size: var(--font-size-xs, 11px);
  border-radius: var(--radius-sm, 6px);
}
.z-btn--md {
  height: 36px;
  padding: 0 var(--space-3, 12px);
  font-size: var(--font-size-md, 14px);
}
.z-btn--lg {
  height: 44px;
  padding: 0 var(--space-4, 16px);
  font-size: var(--font-size-lg, 16px);
}
.z-btn--sm.is-icon-only { width: 28px; padding: 0; }
.z-btn--md.is-icon-only { width: 36px; padding: 0; }
.z-btn--lg.is-icon-only { width: 44px; padding: 0; }
.z-btn.is-block { width: 100%; display: flex; }

/* Variants */
.z-btn--primary {
  background-color: var(--color-primary, #1786be);
  color: var(--color-on-primary, #ffffff);
  box-shadow: var(--shadow-sm);
}
.z-btn--primary:hover:not(:disabled) {
  background-color: var(--color-primary-hover, #0f6fa0);
}
.z-btn--primary:active:not(:disabled) {
  background-color: var(--color-primary-active, #0b5880);
}

.z-btn--secondary {
  background-color: var(--color-surface-secondary, #f1f4f9);
  color: var(--color-text, #141a24);
  border-color: var(--color-border, #e7eaf0);
}
.z-btn--secondary:hover:not(:disabled) {
  background-color: var(--color-surface-hover, #f7f9fc);
  border-color: var(--color-border-strong, #cdd4e0);
}

.z-btn--outline {
  background-color: transparent;
  color: var(--color-primary, #1786be);
  border-color: var(--color-border, #e7eaf0);
}
.z-btn--outline:hover:not(:disabled) {
  background-color: var(--color-primary-subtle, #e4f1f8);
  border-color: var(--color-primary, #1786be);
}

.z-btn--ghost {
  background-color: transparent;
  color: var(--color-text-secondary, #475066);
}
.z-btn--ghost:hover:not(:disabled) {
  background-color: var(--color-surface-secondary, #f1f4f9);
  color: var(--color-text, #141a24);
}

.z-btn--danger {
  background-color: var(--color-danger, #f04438);
  color: #ffffff;
}
.z-btn--danger:hover:not(:disabled) {
  background-color: #dc2626;
}

.z-btn--link {
  background-color: transparent;
  color: var(--color-primary, #1786be);
  padding: 0;
  height: auto;
}
.z-btn--link:hover:not(:disabled) {
  text-decoration: underline;
}

/* Disabled & Loading */
.z-btn.is-disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.z-btn__spinner {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.spin-svg {
  animation: z-btn-spin 0.75s linear infinite;
}
@keyframes z-btn-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
