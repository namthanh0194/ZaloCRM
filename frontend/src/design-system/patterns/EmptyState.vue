<template>
  <div class="z-empty-state">
    <div v-if="$slots.icon" class="z-empty-state__icon">
      <slot name="icon" />
    </div>
    <h3 class="z-empty-state__title">
      <slot name="title">{{ title }}</slot>
    </h3>
    <p v-if="description || $slots.description" class="z-empty-state__desc">
      <slot name="description">{{ description }}</slot>
    </p>
    <div v-if="$slots.action" class="z-empty-state__action">
      <slot name="action" />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title?: string;
  description?: string;
}>();
</script>

<style scoped>
.z-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: var(--space-8, 32px) var(--space-4, 16px);
  background-color: var(--color-surface, #ffffff);
  border: 1px dashed var(--color-border, #e7eaf0);
  border-radius: var(--radius-md, 8px);
  color: var(--color-text-secondary, #475066);
}

.z-empty-state__icon {
  font-size: 32px;
  color: var(--color-text-muted, #6b7488);
  margin-bottom: var(--space-2, 8px);
}

.z-empty-state__title {
  font-size: var(--font-size-md, 14px);
  font-weight: var(--font-weight-semibold, 600);
  color: var(--color-text, #141a24);
  margin: 0 0 var(--space-1, 4px) 0;
}

.z-empty-state__desc {
  font-size: var(--font-size-sm, 12px);
  color: var(--color-text-muted, #6b7488);
  max-width: 400px;
  margin: 0 0 var(--space-4, 16px) 0;
}

.z-empty-state__action {
  display: flex;
  gap: var(--space-2, 8px);
}
</style>
