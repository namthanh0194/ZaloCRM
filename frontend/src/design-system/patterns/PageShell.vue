<template>
  <div
    class="z-page-shell"
    :class="[
      `z-page-shell--${width}`,
      {
        'is-padded': padded,
        'is-scrollable': scrollable,
      }
    ]"
  >
    <div class="z-page-shell__inner">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    width?: 'full' | 'wide' | 'narrow';
    padded?: boolean;
    scrollable?: boolean;
  }>(),
  {
    width: 'full',
    padded: true,
    scrollable: true,
  }
);
</script>

<style scoped>
.z-page-shell {
  width: 100%;
  min-height: 100%;
  background-color: var(--color-bg, #f7f9fc);
  color: var(--color-text, #141a24);
  font-family: var(--font-family-sans);
  display: flex;
  flex-direction: column;
}

.z-page-shell.is-scrollable {
  overflow-y: auto;
}

.z-page-shell__inner {
  width: 100%;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-4, 16px);
}

.z-page-shell.is-padded .z-page-shell__inner {
  padding: var(--space-4, 16px);
}

.z-page-shell--narrow .z-page-shell__inner {
  max-width: 800px;
}
.z-page-shell--wide .z-page-shell__inner {
  max-width: 1280px;
}
.z-page-shell--full .z-page-shell__inner {
  max-width: 100%;
}

@media (min-width: 768px) {
  .z-page-shell.is-padded .z-page-shell__inner {
    padding: var(--space-6, 24px);
    gap: var(--space-6, 24px);
  }
}
</style>
