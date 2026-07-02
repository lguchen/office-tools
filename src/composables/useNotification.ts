import { useMessage, useNotification, useDialog } from 'naive-ui'

let message: ReturnType<typeof useMessage> | null = null
let notification: ReturnType<typeof useNotification> | null = null
let dialog: ReturnType<typeof useDialog> | null = null

export function useNotificationService() {
  if (!notification) {
    notification = useNotification()
  }
  return notification
}

export function useMessageService() {
  if (!message) {
    message = useMessage()
  }
  return message
}

export function useDialogService() {
  if (!dialog) {
    dialog = useDialog()
  }
  return dialog
}

export function showSuccess(msg: string) {
  useMessageService().success(msg, { duration: 2000 })
}

export function showError(msg: string) {
  useMessageService().error(msg, { duration: 2000 })
}

export function showInfo(msg: string) {
  useMessageService().info(msg, { duration: 2000 })
}

export function showWarning(msg: string) {
  useMessageService().warning(msg, { duration: 2000 })
}

export function notifySuccess(title: string, content: string) {
  useNotificationService().success({ title, content, duration: 2000 })
}

export function notifyError(title: string, content: string) {
  useNotificationService().error({ title, content, duration: 2000 })
}

export function notifyInfo(title: string, content: string) {
  useNotificationService().info({ title, content, duration: 2000 })
}
