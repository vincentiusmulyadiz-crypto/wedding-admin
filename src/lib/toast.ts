export type ToastType = 'success' | 'info' | 'error';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

export function showToast(message: string, type: ToastType = 'success') {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent<{ message: string; type: ToastType }>('app-toast', {
        detail: { message, type },
      })
    );
  }
}
