<script setup lang="ts">
import { ref } from 'vue'
import useLayerEvent from '../../lib/composables/use-layer-event'

const props = withDefaults(
  defineProps<{
    greeting?: string
    nameLabel?: string
    namePlaceholder?: string
    emailLabel?: string
    emailPlaceholder?: string
  }>(),
  {
    greeting: '',
    nameLabel: '',
    namePlaceholder: '',
    emailLabel: '',
    emailPlaceholder: ''
  }
)

const { onOk, onCancel, resolveOk, close } = useLayerEvent()

const name = ref('')
const email = ref('')

onOk(() => {
  if (!name.value.trim()) {
    alert(props.namePlaceholder)
    return
  }
  resolveOk({
    name: name.value,
    email: email.value,
    greeting: props.greeting
  })
  close()
})

onCancel(() => {
  close()
})
</script>

<template>
  <div class="demo-content">
    <h3>{{ greeting || 'Form Example' }}</h3>
    <div class="demo-form-item">
      <label>{{ nameLabel || 'Name:' }}</label>
      <input v-model="name" :placeholder="namePlaceholder || 'Enter name'" />
    </div>
    <div class="demo-form-item">
      <label>{{ emailLabel || 'Email:' }}</label>
      <input v-model="email" :placeholder="emailPlaceholder || 'Enter email'" />
    </div>
  </div>
</template>
