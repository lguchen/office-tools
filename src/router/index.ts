import { createRouter, createWebHashHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('../views/HomeView.vue')
  },
  {
    path: '/text',
    name: 'text',
    redirect: '/text/replace',
    children: [
      {
        path: 'replace',
        name: 'text-replace',
        component: () => import('../views/text/TextReplace.vue')
      },
      {
        path: 'dedup',
        name: 'text-dedup',
        component: () => import('../views/text/TextDedup.vue')
      },
      {
        path: 'sort',
        name: 'text-sort',
        component: () => import('../views/text/TextSort.vue')
      },
      {
        path: 'stats',
        name: 'text-stats',
        component: () => import('../views/text/TextStats.vue')
      },
      {
        path: 'case',
        name: 'text-case',
        component: () => import('../views/text/TextCase.vue')
      }
    ]
  },
  {
    path: '/codec',
    name: 'codec',
    redirect: '/codec/base64',
    children: [
      {
        path: 'base64',
        name: 'codec-base64',
        component: () => import('../views/codec/Base64Codec.vue')
      },
      {
        path: 'url',
        name: 'codec-url',
        component: () => import('../views/codec/UrlCodec.vue')
      },
      {
        path: 'hash',
        name: 'codec-hash',
        component: () => import('../views/codec/HashCalc.vue')
      },
      {
        path: 'unicode',
        name: 'codec-unicode',
        component: () => import('../views/codec/UnicodeCodec.vue')
      }
    ]
  },
  {
    path: '/json',
    name: 'json',
    redirect: '/json/format',
    children: [
      {
        path: 'format',
        name: 'json-format',
        component: () => import('../views/json/JsonFormat.vue')
      },
      {
        path: 'validate',
        name: 'json-validate',
        component: () => import('../views/json/JsonValidate.vue')
      },
      {
        path: 'compress',
        name: 'json-compress',
        component: () => import('../views/json/JsonCompress.vue')
      }
    ]
  },
  {
    path: '/calculate',
    name: 'calculate',
    redirect: '/calculate/timestamp',
    children: [
      {
        path: 'timestamp',
        name: 'calculate-timestamp',
        component: () => import('../views/calculate/TimestampConvert.vue')
      },
      {
        path: 'base',
        name: 'calculate-base',
        component: () => import('../views/calculate/BaseConvert.vue')
      },
      {
        path: 'uuid',
        name: 'calculate-uuid',
        component: () => import('../views/calculate/UuidGenerator.vue')
      }
    ]
  },
  {
    path: '/image',
    name: 'image',
    redirect: '/image/compress',
    children: [
      {
        path: 'compress',
        name: 'image-compress',
        component: () => import('../views/image/ImageCompress.vue')
      },
      {
        path: 'convert',
        name: 'image-convert',
        component: () => import('../views/image/ImageConvert.vue')
      },
      {
        path: 'resize',
        name: 'image-resize',
        component: () => import('../views/image/ImageResize.vue')
      },
      {
        path: 'color',
        name: 'image-color',
        component: () => import('../views/image/ColorPicker.vue')
      }
    ]
  },
  {
    path: '/convert',
    name: 'convert',
    redirect: '/convert/excel',
    children: [
      {
        path: 'excel',
        name: 'convert-excel',
        component: () => import('../views/convert/ExcelConvert.vue')
      },
      {
        path: 'markdown',
        name: 'convert-markdown',
        component: () => import('../views/convert/MarkdownConvert.vue')
      },
      {
        path: 'encoding',
        name: 'convert-encoding',
        component: () => import('../views/convert/EncodingConvert.vue')
      }
    ]
  },
  {
    path: '/pdf',
    name: 'pdf',
    redirect: '/pdf/merge',
    children: [
      {
        path: 'merge',
        name: 'pdf-merge',
        component: () => import('../views/pdf/PdfMerge.vue')
      },
      {
        path: 'split',
        name: 'pdf-split',
        component: () => import('../views/pdf/PdfSplit.vue')
      },
      {
        path: 'compress',
        name: 'pdf-compress',
        component: () => import('../views/pdf/PdfCompress.vue')
      },
      {
        path: 'to-images',
        name: 'pdf-to-images',
        component: () => import('../views/pdf/PdfToImages.vue')
      }
    ]
  },
  {
    path: '/system',
    name: 'system',
    redirect: '/system/qrcode',
    children: [
      {
        path: 'qrcode',
        name: 'system-qrcode',
        component: () => import('../views/system/QrCodeGenerator.vue')
      },
      {
        path: 'qrcode-scan',
        name: 'system-qrcode-scan',
        component: () => import('../views/system/QrCodeScanner.vue')
      }
    ]
  },
  {
    path: '/print',
    name: 'print',
    redirect: '/print/manager',
    children: [
      {
        path: 'manager',
        name: 'print-manager',
        component: () => import('../views/print/PrintManager.vue')
      },
      {
        path: 'single',
        name: 'print-single',
        component: () => import('../views/print/SinglePrint.vue')
      },
      {
        path: 'batch',
        name: 'print-batch',
        component: () => import('../views/print/SinglePrint.vue')
      },
      {
        path: 'queue',
        name: 'print-queue',
        component: () => import('../views/print/PrintQueue.vue')
      }
    ]
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
