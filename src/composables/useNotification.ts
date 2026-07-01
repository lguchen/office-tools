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
  useMessageService().success(msg)
}

export function showError(msg: string) {
  useMessageService().error(msg)
}

export function showInfo(msg: string) {
  useMessageService().info(msg)
}

export function showWarning(msg: string) {
  useMessageService().warning(msg)
}
