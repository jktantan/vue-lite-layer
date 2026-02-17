<script setup lang="ts">
defineProps<{
  text?: string
}>()
</script>

<template>
  <div style="padding: 20px; line-height: 1.8; font-size: 14px; color: #333">
    {{ text }}
  </div>
</template>
