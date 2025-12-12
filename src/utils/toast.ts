import { toast } from 'react-hot-toast';

// Track recent toast messages to prevent duplicates for non-loading types
const recentToasts = new Map<string, number>();
const TOAST_DEBOUNCE_TIME = 1000; // 1 second

// Single loading toast id (so multiple API calls reuse the same "Connecting..." toast)
let currentLoadingToastId: string | null = null;

// Clean up old toast records
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of recentToasts.entries()) {
    if (now - timestamp > TOAST_DEBOUNCE_TIME) {
      recentToasts.delete(key);
    }
  }
}, TOAST_DEBOUNCE_TIME);

const getToastKey = (message: string, type: string) => {
  return `${type}:${message.substring(0, 50)}`; // Use first 50 chars as key
};

const shouldShowToast = (message: string, type: string) => {
  const key = getToastKey(message, type);
  const now = Date.now();
  const lastShown = recentToasts.get(key);
  
  if (lastShown && now - lastShown < TOAST_DEBOUNCE_TIME) {
    return false; // Skip duplicate toast
  }
  
  recentToasts.set(key, now);
  return true;
};

export const showToast = {
  success: (message: string) => {
    if (shouldShowToast(message, 'success')) {
      return toast.success(message);
    }
    return null;
  },
  
  error: (message: string) => {
    if (shouldShowToast(message, 'error')) {
      return toast.error(message);
    }
    return null;
  },
  
  // Use a single shared loading toast id so rapid calls don't stack multiple loading toasts
  loading: (message: string) => {
    if (currentLoadingToastId) {
      return currentLoadingToastId;
    }
    currentLoadingToastId = toast.loading(message, { duration: Infinity });
    return currentLoadingToastId;
  },
  
  dismiss: (toastId?: string) => {
    // If no ID provided, dismiss all and clear current loading id
    if (!toastId) {
      currentLoadingToastId = null;
      return toast.dismiss();
    }

    if (toastId && toastId === currentLoadingToastId) {
      currentLoadingToastId = null;
    }

    return toast.dismiss(toastId);
  }
};

// Re-export raw toast for advanced usage if needed
export { toast };
export default showToast;
