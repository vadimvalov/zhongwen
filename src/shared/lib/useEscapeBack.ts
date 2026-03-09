import { onMounted, onUnmounted } from 'vue'

export function useEscapeBack() {
  const router = useRouter() // Nuxt auto-import

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') router.back()
  }

  onMounted(() => window.addEventListener('keydown', handleKeydown))
  onUnmounted(() => window.removeEventListener('keydown', handleKeydown))
}
