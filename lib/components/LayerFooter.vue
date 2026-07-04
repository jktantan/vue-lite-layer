<template>
  <div class="lite-layer__window-footer">
    <button type="button" class="lite-layer__button" @click="emitCancel()">
      {{ t('VueLiteLayer.cancel') }}
    </button>
    <button type="button" class="lite-layer__button primary" @click="emitOk()">
      {{ t('VueLiteLayer.ok') }}
    </button>
  </div>
</template>

<script lang="ts" setup>
import { useI18n } from 'vue-i18n-lite'
import useLayerEvent from '@lib/composables/use-layer-event'

const i18n = useI18n()
const t = i18n?.t ?? ((key: string) => key)
const { emitCancel, emitOk } = useLayerEvent()
</script>
