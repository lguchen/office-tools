import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/Home.vue'),
    meta: { title: '工作台' }
  },
  {
    path: '/excel',
    name: 'Excel',
    component: () => import('@/views/Excel.vue'),
    meta: { title: 'Excel工具' }
  },
  {
    path: '/word',
    name: 'Word',
    component: () => import('@/views/Word.vue'),
    meta: { title: 'Word工具' }
  },
  {
    path: '/pdf',
    name: 'PDF',
    component: () => import('@/views/PDF.vue'),
    meta: { title: 'PDF工具' }
  },
  {
    path: '/ocr',
    name: 'OCR',
    component: () => import('@/views/OCR.vue'),
    meta: { title: 'OCR识别' }
  },
  {
    path: '/print',
    name: 'Print',
    component: () => import('@/views/Print.vue'),
    meta: { title: '批量打印' }
  },
  {
    path: '/tools',
    name: 'Tools',
    component: () => import('@/views/Tools.vue'),
    meta: { title: '通用工具' }
  },
  {
    path: '/batch-rename',
    name: 'BatchRename',
    component: () => import('@/views/BatchRename.vue'),
    meta: { title: '批量重命名' }
  },
  {
    path: '/encoding-convert',
    name: 'EncodingConvert',
    component: () => import('@/views/EncodingConvert.vue'),
    meta: { title: '编码转换' }
  },
  {
    path: '/toolbox',
    name: 'Toolbox',
    component: () => import('@/views/Toolbox.vue'),
    meta: { title: '工具箱' }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('@/views/Settings.vue'),
    meta: { title: '设置' }
  },
  {
    path: '/task-queue',
    name: 'TaskQueue',
    component: () => import('@/views/TaskQueue.vue'),
    meta: { title: '任务队列' }
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
