<template>
  <div
    class="z-stat-card"
    :class="[
      variant && variant !== 'default' ? `is-${variant}` : '',
      clickable ? 'is-clickable' : '',
    ]"
  >
    <div class="z-stat-card__header">
      <span class="z-stat-card__label">{{ label }}</span>
      <span v-if="$slots.icon" class="z-stat-card__icon">
        <slot name="icon" />
      </span>
    </div>
    <div class="z-stat-card__value-row">
      <span class="z-stat-card__value">
        <slot>{{ value }}</slot>
      </span>
      <span v-if="trend" class="z-stat-card__trend" :class="`is-${trendDirection || 'up'}`">
        {{ trend }}
      </span>
    </div>
    <p v-if="subtext" class="z-stat-card__subtext">{{ subtext }}</p>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  label: string;
  value?: string | number;
  subtext?: string;
  trend?: string;
  trendDirection?: 'up' | 'down' | 'neutral';
  variant?: 'default' | 'danger' | 'warning' | 'info' | 'success';
  clickable?: boolean;
}>();
</script>

<style scoped>
.z-stat-card {
  background-color: var(--color-surface, #ffffff);
  border: 1px solid var(--color-border, #e7eaf0);
  border-radius: var(--radius-md, 8px);
  padding: var(--space-4, 16px);
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  gap: var(--space-2, 8px);
}

.z-stat-card.is-clickable {
  cursor: pointer;
  border-left: 3px solid var(--color-border-strong, #cdd4e0);
  transition: box-shadow var(--transition-fast, 150ms ease), border-color var(--transition-fast, 150ms ease);
}

.z-stat-card.is-clickable:hover {
  box-shadow: var(--shadow-md);
}

.z-stat-card.is-danger {
  border-left: 3px solid var(--color-danger, #ef4444);
}

.z-stat-card.is-danger .z-stat-card__value {
  color: var(--color-danger, #ef4444);
}

.z-stat-card.is-warning {
  border-left: 3px solid var(--color-warning, #f59e0b);
}

.z-stat-card.is-info {
  border-left: 3px solid var(--color-info, #3b82f6);
}

.z-stat-card.is-success {
  border-left: 3px solid var(--color-success, #10b981);
}

.z-stat-card.is-success .z-stat-card__value {
  color: var(--color-success, #10b981);
}

.z-stat-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.z-stat-card__label {
  font-size: var(--font-size-xs, 12px);
  font-weight: var(--font-weight-medium, 500);
  color: var(--color-text-muted, #6b7488);
}

.z-stat-card__icon {
  color: var(--color-primary, #1786be);
  display: inline-flex;
}

.z-stat-card__value-row {
  display: flex;
  align-items: baseline;
  gap: var(--space-2, 8px);
}

.z-stat-card__value {
  font-size: var(--font-size-xl, 22px);
  font-weight: var(--font-weight-bold, 700);
  color: var(--color-text, #141a24);
  line-height: 1.1;
}

.z-stat-card__trend {
  font-size: var(--font-size-xs, 11px);
  font-weight: var(--font-weight-medium, 500);
  padding: 1px 6px;
  border-radius: var(--radius-pill, 999px);
}
.z-stat-card__trend.is-up {
  background-color: var(--color-success-subtle, #e7f7ef);
  color: var(--color-success, #12b76a);
}
.z-stat-card__trend.is-down {
  background-color: var(--color-danger-subtle, #fdeceb);
  color: var(--color-danger, #f04438);
}

.z-stat-card__subtext {
  font-size: 11px;
  color: var(--color-text-muted, #6b7488);
  margin: 0;
}
</style>
