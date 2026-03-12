import { onMounted, onUnmounted } from 'vue'

export function useEscapeBack() {
  const route = useRoute()
  const router = useRouter()

  function handleKeydown(e: KeyboardEvent) {
    if (e.key !== 'Escape') return
    const path = route.path
    if (path === '/' || path === '') return
    const segments = path.replace(/^\/|\/$/g, '').split('/').filter(Boolean)
    if (segments.length === 0) return
    segments.pop()
    const parentPath = segments.length === 0 ? '/' : `/${segments.join('/')}`
    router.push(parentPath)
  }

  onMounted(() => window.addEventListener('keydown', handleKeydown))
  onUnmounted(() => window.removeEventListener('keydown', handleKeydown))
}
