<template>
  <div class="z-filter-bar">
    <div class="z-filter-bar__filters">
      <slot name="search" />
      <slot />
    </div>
    <div v-if="$slots.actions" class="z-filter-bar__actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<style scoped>
.z-filter-bar {
  display: flex;
  flex-direction: column;
  gap: var(--space-3, 12px);
  background-color: var(--color-surface, #ffffff);
  border: 1px solid var(--color-border, #e7eaf0);
  border-radius: var(--radius-md, 8px);
  padding: var(--space-3, 12px);
  box-shadow: var(--shadow-sm);
}

@media (min-width: 768px) {
  .z-filter-bar {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
}

.z-filter-bar__filters {
  display: flex;
  align-items: center;
  gap: var(--space-2, 8px);
  flex-wrap: wrap;
  flex: 1;
}

.z-filter-bar__actions {
  display: flex;
  align-items: center;
  gap: var(--space-2, 8px);
  flex-shrink: 0;
}
</style>
