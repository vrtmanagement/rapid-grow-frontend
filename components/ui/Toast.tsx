import React from 'react';
import { AlertCircle, Check } from 'lucide-react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error';
}

const Toast: React.FC<ToastProps> = ({ message, type = 'success' }) => {
  const isSuccess = type === 'success';

  return (
    <div className="fixed top-6 right-6 z-50 animate-in slide-in-from-top-2 fade-in duration-300">
      <div
        className={`flex items-center gap-3 rounded-2xl border px-5 py-4 shadow-[0_18px_45px_rgba(15,23,42,0.12)] ${
          isSuccess ? 'border-emerald-100 bg-white' : 'border-rose-200 bg-rose-50/70'
        }`}
      >
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
            isSuccess ? 'bg-emerald-50 text-emerald-600' : 'bg-white text-rose-600 ring-1 ring-rose-200'
          }`}
        >
          {isSuccess ? <Check size={18} /> : <AlertCircle size={18} />}
        </div>
        <div className="pr-2 leading-tight">
          {isSuccess ? (
            <>
              <p className="text-sm font-semibold text-slate-900">Success</p>
              <p className="text-sm text-slate-500">{message}</p>
            </>
          ) : (
            <p className="text-base font-semibold text-rose-700">{message}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Toast;
