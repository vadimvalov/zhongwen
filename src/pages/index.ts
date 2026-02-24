import type { RouteRecordRaw } from 'vue-router'

export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('./main/MainPage.vue'),
  },
  {
    path: '/reading',
    name: 'reading',
    component: () => import('./reading/ReadingPage.vue'),
  },
  {
    path: '/text/:id',
    name: 'text-reader',
    component: () => import('./text-reader/TextReaderPage.vue'),
  },
]
