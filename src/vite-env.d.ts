/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module '@vicons/ionicons5' {
  import { Component } from 'vue'
  export const CloudUploadOutline: Component
  export const CloudDownloadOutline: Component
  export const AddOutline: Component
  export const RemoveOutline: Component
  export const RefreshOutline: Component
  export const SwapHorizontalOutline: Component
  export const CreateOutline: Component
  export const DocumentTextOutline: Component
  export const FileTrayOutline: Component
  export const FileTrayFullOutline: Component
  export const TextOutline: Component
  export const KeyOutline: Component
  export const CodeSlashOutline: Component
  export const SearchOutline: Component
  export const SunnyOutline: Component
  export const MoonOutline: Component
  export const Moon: Component
  export const PrintOutline: Component
  export const SettingsOutline: Component
  export const CopyOutline: Component
  export const TrashOutline: Component
  export const HomeOutline: Component
  export const DocumentOutline: Component
  export const ImageOutline: Component
  export const DownloadOutline: Component
  export const ScissorsOutline: Component
  export const GitMergeOutline: Component
  export const CheckmarkOutline: Component
  export const CheckmarkCircleOutline: Component
  export const ColorPaletteOutline: Component
  export const CropOutline: Component
  export const SyncOutline: Component
  export const ExpandOutline: Component
  export const ContractOutline: Component
  export const EyeOutline: Component
  export const GridOutline: Component
  export const CloseOutline: Component
  export const FunnelOutline: Component
  export const ArrowForwardOutline: Component
  export const ArrowBackOutline: Component
  export const InformationOutline: Component
  export const WarningOutline: Component
  export const ErrorOutline: Component
  export const HelpCircleOutline: Component
  export const QuestionOutline: Component
  export const FolderOutline: Component
}
