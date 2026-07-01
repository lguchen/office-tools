import { createRouter, createWebHashHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { h } from 'vue'
import { RouterView } from 'vue-router'

const RouterViewLayout = {
  render() {
    return h('div', { class: 'h-full w-full' }, [h(RouterView)])
  }
}

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('../views/HomeView.vue')
  },
  {
    path: '/text',
    name: 'text',
    component: RouterViewLayout,
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
    component: RouterViewLayout,
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
    component: RouterViewLayout,
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
    component: RouterViewLayout,
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
    component: RouterViewLayout,
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
    path: '/pdf',
    name: 'pdf',
    component: RouterViewLayout,
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
  // 新增：Excel工具箱路由
  {
    path: '/excel',
    name: 'excel',
    component: RouterViewLayout,
    redirect: '/excel/shortcuts',
    children: [
      {
        path: 'shortcuts',
        name: 'excel-shortcuts',
        component: () => import('../views/excel/ExcelShortcuts.vue')
      },
      {
        path: 'functions',
        name: 'excel-functions',
        component: () => import('../views/excel/ExcelFunctions.vue')
      },
      {
        path: 'process',
        name: 'excel-process',
        component: () => import('../views/excel/ExcelDataProcess.vue')
      },
      {
        path: 'formula',
        name: 'excel-formula',
        component: () => import('../views/excel/ExcelFormulaGenerator.vue')
      },
      {
        path: 'split-merge',
        name: 'excel-split-merge',
        component: () => import('../views/excel/ExcelSplitMerge.vue')
      },
      {
        path: 'conditional',
        name: 'excel-conditional',
        component: () => import('../views/excel/ExcelConditionalFormat.vue')
      },
      {
        path: 'validation',
        name: 'excel-validation',
        component: () => import('../views/excel/ExcelDataValidation.vue')
      }
    ]
  },
  // 新增：Word工具箱路由
  {
    path: '/word',
    name: 'word',
    component: RouterViewLayout,
    redirect: '/word/shortcuts',
    children: [
      {
        path: 'shortcuts',
        name: 'word-shortcuts',
        component: () => import('../views/word/WordShortcuts.vue')
      },
      {
        path: 'content',
        name: 'word-content',
        component: () => import('../views/word/WordBatchContent.vue')
      },
      {
        path: 'format',
        name: 'word-format',
        component: () => import('../views/word/WordBatchFormat.vue')
      },
      {
        path: 'bookmark',
        name: 'word-bookmark',
        component: () => import('../views/word/WordBookmarkManager.vue')
      },
      {
        path: 'special',
        name: 'word-special',
        component: () => import('../views/word/WordSpecialChars.vue')
      },
      {
        path: 'layout',
        name: 'word-layout',
        component: () => import('../views/word/WordPageLayout.vue')
      },
      {
        path: 'merge',
        name: 'word-merge',
        component: () => import('../views/word/WordMerge.vue')
      }
    ]
  },
  {
    path: '/system',
    name: 'system',
    component: RouterViewLayout,
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
    component: RouterViewLayout,
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
