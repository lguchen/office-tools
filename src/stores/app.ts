import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface ToolItem {
  id: string
  name: string
  icon: string
  path: string
  category: string
}

export const useAppStore = defineStore('app', () => {
  const sidebarCollapsed = ref(false)
  const currentTool = ref<string>('')
  const recentTools = ref<ToolItem[]>([])
  const favoriteTools = ref<ToolItem[]>([])

  const toggleSidebar = () => {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  const addRecentTool = (tool: ToolItem) => {
    const existing = recentTools.value.findIndex(t => t.id === tool.id)
    if (existing !== -1) {
      recentTools.value.splice(existing, 1)
    }
    recentTools.value.unshift(tool)
    if (recentTools.value.length > 10) {
      recentTools.value.pop()
    }
  }

  const toggleFavorite = (tool: ToolItem) => {
    const index = favoriteTools.value.findIndex(t => t.id === tool.id)
    if (index !== -1) {
      favoriteTools.value.splice(index, 1)
    } else {
      favoriteTools.value.push(tool)
    }
  }

  return {
    sidebarCollapsed,
    currentTool,
    recentTools,
    favoriteTools,
    toggleSidebar,
    addRecentTool,
    toggleFavorite
  }
})
