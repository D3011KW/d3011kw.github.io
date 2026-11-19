import 应用 from './App.vue'
import { createSSRApp } from 'vue'

export function createApp() {
  return { app: createSSRApp(应用) }
}
