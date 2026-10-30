import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
} from 'lucide-react';

export type ToastTone = 'success' | 'error' | 'info' | 'warning';

export type ToastInput = {
  message: string;
  type?: ToastTone;
  title?: string;
  durationMs?: number;
};

type ToastRecord = {
  id: string;
  message: string;
  type: ToastTone;
  title: string;
  durationMs: number;
};

type ToastContextValue = {
  push: (input: ToastInput | string, type?: ToastTone) => string;
  dismiss: (id: string) => void;
  clear: () => void;
};

const DEFAULT_DURATION: Record<ToastTone, number> = {
  success: 4200,
  error: 5600,
  info: 4500,
  warning: 5000,
};

const TITLE_BY_TONE: Record<ToastTone, string> = {
  success: 'Success',
  error: 'Something needs attention',
  info: 'Heads up',
  warning: 'Please check',
};

let toastIdCounter = 0;
const nextToastId = () => {
  toastIdCounter += 1;
  return `toast-${Date.now()}-${toastIdCounter}`;
};

type ImperativeHandler = {
  push: (input: ToastInput | string, type?: ToastTone) => string;
  dismiss: (id: string) => void;
  clear: () => void;
};

const imperativeRef: { current: ImperativeHandler | null } = { current: null };

const normalizeInput = (
  input: ToastInput | string,
  type: ToastTone = 'success',
): Omit<ToastRecord, 'id'> => {
  if (typeof input === 'string') {
    return {
      message: input,
      type,
      title: TITLE_BY_TONE[type],
      durationMs: DEFAULT_DURATION[type],
    };
  }
  const tone = input.type || type || 'success';
  return {
    message: String(input.message || '').trim(),
    type: tone,
    title: input.title || TITLE_BY_TONE[tone],
    durationMs: input.durationMs ?? DEFAULT_DURATION[tone],
  };
};

/** Imperative toast API — works anywhere after ToastProvider is mounted. */
export const appToast = {
  push(input: ToastInput | string, type: ToastTone = 'info') {
    return imperativeRef.current?.push(input, type) || '';
  },
  success(message: string, title?: string) {
    return appToast.push({ message, type: 'success', title });
  },
  error(message: string, title?: string) {
    return appToast.push({ message, type: 'error', title });
  },
  info(message: string, title?: string) {
    return appToast.push({ message, type: 'info', title });
  },
  warning(message: string, title?: string) {
    return appToast.push({ message, type: 'warning', title });
  },
  dismiss(id: string) {
    imperativeRef.current?.dismiss(id);
  },
  clear() {
    imperativeRef.current?.clear();
  },
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useAppToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      push: (input, type) => appToast.push(input, type),
      dismiss: (id) => appToast.dismiss(id),
      clear: () => appToast.clear(),
    };
  }
  return ctx;
}

const toneStyles: Record<
  ToastTone,
  {
    shell: string;
    glow: string;
    iconWrap: string;
    eyebrow: string;
    Icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  }
> = {
  success: {
    shell: 'border-emerald-200/80 from-white via-white to-emerald-50/80',
    glow: 'bg-emerald-400/25',
    iconWrap: 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-emerald-500/30',
    eyebrow: 'text-emerald-700',
    Icon: CheckCircle2,
  },
  error: {
    shell: 'border-rose-200/90 from-white via-white to-rose-50/90',
    glow: 'bg-rose-400/30',
    iconWrap: 'bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-rose-500/35',
    eyebrow: 'text-rose-700',
    Icon: AlertCircle,
  },
  info: {
    shell: 'border-sky-200/80 from-white via-white to-sky-50/80',
    glow: 'bg-sky-400/25',
    iconWrap: 'bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-sky-500/30',
    eyebrow: 'text-sky-700',
    Icon: Info,
  },
  warning: {
    shell: 'border-amber-200/90 from-white via-white to-amber-50/90',
    glow: 'bg-amber-400/30',
    iconWrap: 'bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-amber-500/30',
    eyebrow: 'text-amber-800',
    Icon: AlertTriangle,
  },
};

const ToastCard: React.FC<{
  toast: ToastRecord;
  onDismiss: (id: string) => void;
}> = ({ toast, onDismiss }) => {
  const styles = toneStyles[toast.type];
  const Icon = styles.Icon;

  useEffect(() => {
    if (toast.durationMs <= 0) return undefined;
    const timer = window.setTimeout(() => onDismiss(toast.id), toast.durationMs);
    return () => window.clearTimeout(timer);
  }, [onDismiss, toast.durationMs, toast.id]);

  return (
    <div
      role="status"
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
      className={`pointer-events-auto relative w-[min(100vw-2rem,24rem)] overflow-hidden rounded-[22px] border bg-gradient-to-br p-4 shadow-[0_22px_55px_rgba(15,23,42,0.18)] backdrop-blur-sm animate-in slide-in-from-right-4 fade-in zoom-in-95 duration-300 ${styles.shell}`}
    >
      <div className={`pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full blur-2xl ${styles.glow}`} />
      <div className="relative flex items-start gap-3">
        <div
          className={`mt-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-lg ${styles.iconWrap}`}
        >
          <Icon size={20} strokeWidth={2.4} />
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${styles.eyebrow}`}>
            {toast.title}
          </p>
          <p className="mt-1 text-[14px] font-medium leading-relaxed text-slate-800">{toast.message}</p>
        </div>
        <button
          type="button"
          aria-label="Dismiss notification"
          onClick={() => onDismiss(toast.id)}
          className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-slate-200/80 bg-white/80 text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800"
        >
          <X size={15} strokeWidth={2.4} />
        </button>
      </div>
      {toast.durationMs > 0 ? (
        <div className="relative mt-3 h-1 overflow-hidden rounded-full bg-slate-200/70">
          <div
            className={`h-full rounded-full ${
              toast.type === 'success'
                ? 'bg-emerald-500'
                : toast.type === 'error'
                  ? 'bg-rose-500'
                  : toast.type === 'warning'
                    ? 'bg-amber-500'
                    : 'bg-sky-500'
            }`}
            style={{
              animation: `app-toast-progress ${toast.durationMs}ms linear forwards`,
            }}
          />
        </div>
      ) : null}
    </div>
  );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const clear = useCallback(() => {
    setToasts([]);
  }, []);

  const push = useCallback((input: ToastInput | string, type: ToastTone = 'success') => {
    const normalized = normalizeInput(input, type);
    if (!normalized.message) return '';
    const id = nextToastId();
    setToasts((prev) => {
      const next = [...prev, { id, ...normalized }];
      // Keep the stack tidy.
      return next.slice(-5);
    });
    return id;
  }, []);

  useEffect(() => {
    imperativeRef.current = { push, dismiss, clear };
    return () => {
      if (imperativeRef.current?.push === push) {
        imperativeRef.current = null;
      }
    };
  }, [clear, dismiss, push]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const styleId = 'app-toast-progress-style';
    if (document.getElementById(styleId)) return undefined;
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @keyframes app-toast-progress {
        from { width: 100%; }
        to { width: 0%; }
      }
    `;
    document.head.appendChild(style);
    return undefined;
  }, []);

  const value = useMemo(() => ({ push, dismiss, clear }), [clear, dismiss, push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {typeof document !== 'undefined'
        ? createPortal(
            <div className="pointer-events-none fixed bottom-6 right-6 z-[300] flex max-h-[calc(100vh-3rem)] w-[min(100vw-2rem,24rem)] flex-col-reverse gap-3 overflow-hidden sm:bottom-8 sm:right-8">
              {toasts.map((toast) => (
                <ToastCard key={toast.id} toast={toast} onDismiss={dismiss} />
              ))}
            </div>,
            document.body,
          )
        : null}
    </ToastContext.Provider>
  );
};

interface LegacyToastProps {
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
}

/**
 * Backward-compatible bridge: existing `{toast && <Toast message type />}`
 * usages now feed the global advanced toast stack.
 */
const Toast: React.FC<LegacyToastProps> = ({ message, type = 'success' }) => {
  const pushedKeyRef = useRef('');

  useEffect(() => {
    const key = `${type}:${message}`;
    if (!message || pushedKeyRef.current === key) return;
    pushedKeyRef.current = key;
    appToast.push({ message, type });
  }, [message, type]);

  return null;
};

export default Toast;
