<template>
  <span
    class="z-badge"
    :class="[
      `z-badge--${variant}`,
      `z-badge--${size}`,
    ]"
  >
    <span v-if="dot" class="z-badge__dot" aria-hidden="true" />
    <span v-if="$slots.icon" class="z-badge__icon">
      <slot name="icon" />
    </span>
    <span class="z-badge__label">
      <slot />
    </span>
  </span>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
    size?: 'sm' | 'md';
    dot?: boolean;
  }>(),
  {
    variant: 'neutral',
    size: 'md',
    dot: false,
  }
);
</script>

<style scoped>
.z-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-family: var(--font-family-sans);
  font-weight: var(--font-weight-medium, 500);
  line-height: 1;
  border-radius: var(--radius-pill, 999px);
  border: 1px solid transparent;
  white-space: nowrap;
  user-select: none;
}

/* Sizes */
.z-badge--sm {
  font-size: 10px;
  padding: 2px 6px;
  height: 18px;
}
.z-badge--md {
  font-size: var(--font-size-xs, 11px);
  padding: 3px 8px;
  height: 22px;
}

.z-badge__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: currentColor;
  flex-shrink: 0;
}

/* Variants */
.z-badge--neutral {
  background-color: var(--color-surface-secondary, #f1f4f9);
  color: var(--color-text-secondary, #475066);
  border-color: var(--color-border, #e7eaf0);
}

.z-badge--primary {
  background-color: var(--color-primary-subtle, #e4f1f8);
  color: var(--color-primary, #1786be);
  border-color: rgba(23, 134, 190, 0.2);
}

.z-badge--success {
  background-color: var(--color-success-subtle, #e7f7ef);
  color: var(--color-success, #12b76a);
  border-color: rgba(18, 183, 106, 0.2);
}

.z-badge--warning {
  background-color: var(--color-warning-subtle, #fdf3e2);
  color: #b45309;
  border-color: rgba(245, 165, 36, 0.25);
}

.z-badge--danger {
  background-color: var(--color-danger-subtle, #fdeceb);
  color: var(--color-danger, #f04438);
  border-color: rgba(240, 68, 56, 0.2);
}

.z-badge--info {
  background-color: var(--color-info-subtle, #e4f1f8);
  color: var(--color-info, #1786be);
  border-color: rgba(23, 134, 190, 0.2);
}
</style>
