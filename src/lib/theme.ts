import { ref, watch } from 'vue'

export const theme = ref<'dark' | 'light'>(
  localStorage.getItem('theme') === 'light' ? 'light' : 'dark',
)

watch(theme, value => {
  document.documentElement.dataset.theme = value
  localStorage.setItem('theme', value)
}, { immediate: true })
