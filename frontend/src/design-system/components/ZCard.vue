<template>
  <div
    class="z-card"
    :class="[
      `z-card--pad-${padding}`,
      {
        'is-interactive': interactive,
        'is-selected': selected,
      }
    ]"
  >
    <div v-if="$slots.header" class="z-card__header">
      <slot name="header" />
    </div>
    <div class="z-card__body">
      <slot />
    </div>
    <div v-if="$slots.footer" class="z-card__footer">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    interactive?: boolean;
    selected?: boolean;
    padding?: 'none' | 'sm' | 'md' | 'lg';
  }>(),
  {
    interactive: false,
    selected: false,
    padding: 'md',
  }
);
</script>

<style scoped>
.z-card {
  background-color: var(--color-surface, #ffffff);
  border: 1px solid var(--color-border, #e7eaf0);
  border-radius: var(--radius-md, 8px);
  box-shadow: var(--shadow-sm);
  transition: box-shadow var(--duration-fast, 140ms) var(--ease-standard, ease),
              border-color var(--duration-fast, 140ms) var(--ease-standard, ease);
}

.z-card.is-interactive {
  cursor: pointer;
}
.z-card.is-interactive:hover {
  box-shadow: var(--shadow-md);
  border-color: var(--color-border-strong, #cdd4e0);
}

.z-card.is-selected {
  border-color: var(--color-primary, #1786be);
  box-shadow: 0 0 0 1px var(--color-primary, #1786be);
}

.z-card--pad-none .z-card__body { padding: 0; }
.z-card--pad-sm .z-card__body { padding: var(--space-2, 8px) var(--space-3, 12px); }
.z-card--pad-md .z-card__body { padding: var(--space-4, 16px); }
.z-card--pad-lg .z-card__body { padding: var(--space-6, 24px); }

.z-card__header {
  padding: var(--space-3, 12px) var(--space-4, 16px);
  border-bottom: 1px solid var(--color-border, #e7eaf0);
}
.z-card__footer {
  padding: var(--space-3, 12px) var(--space-4, 16px);
  border-top: 1px solid var(--color-border, #e7eaf0);
  background-color: var(--color-surface-secondary, #f1f4f9);
  border-bottom-left-radius: inherit;
  border-bottom-right-radius: inherit;
}
</style>
