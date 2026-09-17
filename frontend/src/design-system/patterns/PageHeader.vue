<template>
  <header class="z-page-header">
    <div class="z-page-header__main">
      <div v-if="$slots.breadcrumb" class="z-page-header__breadcrumb">
        <slot name="breadcrumb" />
      </div>
      <div class="z-page-header__title-row">
        <h1 class="z-page-header__title">
          <slot name="title">{{ title }}</slot>
        </h1>
        <div v-if="$slots.badge" class="z-page-header__badge">
          <slot name="badge" />
        </div>
      </div>
      <p v-if="description || $slots.description" class="z-page-header__desc">
        <slot name="description">{{ description }}</slot>
      </p>
    </div>
    <div v-if="$slots.actions" class="z-page-header__actions">
      <slot name="actions" />
    </div>
  </header>
</template>

<script setup lang="ts">
defineProps<{
  title?: string;
  description?: string;
}>();
</script>

<style scoped>
.z-page-header {
  display: flex;
  flex-direction: column;
  gap: var(--space-3, 12px);
  padding-bottom: var(--space-2, 8px);
}

@media (min-width: 640px) {
  .z-page-header {
    flex-direction: row;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-4, 16px);
  }
}

.z-page-header__main {
  display: flex;
  flex-direction: column;
  gap: var(--space-1, 4px);
}

.z-page-header__breadcrumb {
  font-size: var(--font-size-xs, 11px);
  color: var(--color-text-muted, #6b7488);
}

.z-page-header__title-row {
  display: flex;
  align-items: center;
  gap: var(--space-2, 8px);
  flex-wrap: wrap;
}

.z-page-header__title {
  font-size: var(--font-size-xl, 22px);
  font-weight: var(--font-weight-bold, 700);
  color: var(--color-text, #141a24);
  margin: 0;
  line-height: 1.25;
}

.z-page-header__desc {
  font-size: var(--font-size-md, 14px);
  color: var(--color-text-secondary, #475066);
  margin: 0;
}

.z-page-header__actions {
  display: flex;
  align-items: center;
  gap: var(--space-2, 8px);
  flex-wrap: wrap;
  flex-shrink: 0;
}
</style>
