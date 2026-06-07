import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'
import { Toast } from '@capacitor/toast'
import { toastController } from '@ionic/vue'

type ToastDuration = 'short' | 'long'

const toIonicDuration = (duration: ToastDuration): number => (duration === 'long' ? 3500 : 2200)

const showToastFallback = async (message: string, duration: ToastDuration): Promise<void> => {
  const toast = await toastController.create({
    message,
    duration: toIonicDuration(duration),
    position: 'bottom',
  })

  await toast.present()
}

export const showToastMessage = async (message: string, duration: ToastDuration = 'short'): Promise<void> => {
  try {
    await Toast.show({
      text: message,
      duration,
      position: 'bottom',
    })
  } catch {
    await showToastFallback(message, duration)
  }
}

export const hapticLight = async (): Promise<void> => {
  try {
    await Haptics.impact({ style: ImpactStyle.Light })
  } catch {
    // no-op on unsupported platforms
  }
}

export const hapticSuccess = async (): Promise<void> => {
  try {
    await Haptics.notification({ type: NotificationType.Success })
  } catch {
    // no-op on unsupported platforms
  }
}

export const hapticWarning = async (): Promise<void> => {
  try {
    await Haptics.notification({ type: NotificationType.Warning })
  } catch {
    // no-op on unsupported platforms
  }
}

export const hapticError = async (): Promise<void> => {
  try {
    await Haptics.notification({ type: NotificationType.Error })
  } catch {
    // no-op on unsupported platforms
  }
}

export const showSuccessFeedback = async (message: string): Promise<void> => {
  await Promise.all([showToastMessage(message, 'short'), hapticSuccess()])
}

export const showInfoFeedback = async (message: string): Promise<void> => {
  await Promise.all([showToastMessage(message, 'short'), hapticLight()])
}

export const showWarningFeedback = async (message: string): Promise<void> => {
  await Promise.all([showToastMessage(message, 'short'), hapticWarning()])
}

export const showErrorFeedback = async (message: string): Promise<void> => {
  await Promise.all([showToastMessage(message, 'long'), hapticError()])
}
