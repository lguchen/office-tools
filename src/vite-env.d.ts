/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare interface Window {
  __TAURI_INTERNALS__: any
  __TAURI__: any
}

declare module '@tauri-apps/plugin-dialog' {
  export function open(options?: any): Promise<string | string[] | null>
  export function save(options?: any): Promise<string | null>
  export function message(message: string, options?: any): Promise<void>
  export function ask(message: string, options?: any): Promise<boolean>
  export function confirm(message: string, options?: any): Promise<boolean>
}

declare module '@tauri-apps/api/core' {
  export function invoke<T>(cmd: string, args?: any): Promise<T>
  export function convertFileSrc(filePath: string, protocol?: string): string
}

declare module '@tauri-apps/api/window' {
  export function getCurrentWindow(): any
  export function availableMonitors(): Promise<any[]>
  export function primaryMonitor(): Promise<any>
  export function currentMonitor(): Promise<any>
}

declare module '@tauri-apps/plugin-fs' {
  export function readBinaryFile(path: string): Promise<Uint8Array>
  export function readTextFile(path: string): Promise<string>
  export function writeBinaryFile(path: string, data: Uint8Array): Promise<void>
  export function writeTextFile(path: string, data: string): Promise<void>
  export function metadata(path: string): Promise<any>
  export const BaseDirectory: any
}
