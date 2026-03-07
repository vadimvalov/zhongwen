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
  {
    path: '/vocabulary',
    name: 'vocabulary',
    component: () => import('./vocabulary/VocabularyPage.vue'),
  },
  {
    path: '/vocabulary/:id',
    name: 'vocabulary-dict',
    component: () => import('./vocabulary/VocabularyDictPage.vue'),
  },
  {
    path: '/speaking',
    name: 'speaking',
    component: () => import('./speaking/SpeakingPage.vue'),
  },
  {
    path: '/speaking/words',
    name: 'speaking-words',
    component: () => import('./speaking/SpeakingPage.vue'),
  },
  {
    path: '/speaking/words/:id',
    name: 'speaking-words-practice',
    component: () => import('./speaking/SpeakingPage.vue'),
  },
  {
    path: '/speaking/sentences',
    name: 'speaking-sentences',
    component: () => import('./speaking/SpeakingPage.vue'),
  },
]
