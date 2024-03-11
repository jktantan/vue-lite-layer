<template>
  <div class="lite-layer__window-footer">
    <button class="lite-layer__button" @click="emitCancel">
      {{ t('VueLiteLayer.cancel') }}
    </button>
    <button class="lite-layer__button primary" @click="emitOk">
      {{ t('VueLiteLayer.ok') }}
    </button>
  </div>
</template>

<script lang="ts" setup>
// import localeI18n from '@lib/i18n'
import {useI18n} from 'vue-i18n-lite'
import useLayerEvent from '@lib/utils/useLayerEvent'

const { t } = useI18n()
const { emitCancel, emitOk } = useLayerEvent()
</script>

<style scoped></style>
