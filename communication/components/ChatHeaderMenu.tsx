import React, { useRef, useEffect, useState } from 'react';
import { MoreVertical, Trash2, X } from 'lucide-react';

interface ChatHeaderMenuProps {
  onClearChat: () => void;
  isLoading?: boolean;
}

export function ChatHeaderMenu({ onClearChat, isLoading = false }: ChatHeaderMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleClearChat = async () => {
    await onClearChat();
    setShowConfirmModal(false);
    setIsOpen(false);
  };

  return (
    <>
      <div className="relative">
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 hover:bg-slate-100 transition-colors rounded-lg text-slate-600 hover:text-slate-900"
          title="More options"
          disabled={isLoading}
        >
          <MoreVertical size={20} />
        </button>

        {isOpen && (
          <div
            ref={menuRef}
            className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-50 overflow-hidden"
          >
            <button
              type="button"
              onClick={() => setShowConfirmModal(true)}
              disabled={isLoading}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors text-slate-700 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed text-left"
            >
              <Trash2 size={18} className="text-slate-500" />
              <span className="text-sm font-medium">Clear chat</span>
            </button>
          </div>
        )}
      </div>

      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-10 border border-slate-100/80 relative animate-in fade-in zoom-in duration-300">
            <button
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full p-2 transition-all duration-200"
              onClick={() => setShowConfirmModal(false)}
              type="button"
            >
              <X size={20} />
            </button>
            
            <div className="flex items-start gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-lg flex-shrink-0 mt-1">
                <Trash2 size={24} />
              </div>
              <div className="flex-1 pt-1">
                <h3 className="text-xl font-bold text-slate-900 leading-tight mb-1">
                  Clear Chat
                </h3>
                <p className="text-xs font-semibold text-slate-500 tracking-widest uppercase">
                  This action cannot be undone
                </p>
              </div>
            </div>
            
            <p className="text-slate-600 text-[15px] leading-relaxed mb-10">Are you sure you want to clear this chat? All messages will be removed for you.</p>
            
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="px-6 py-2.5 rounded-full text-[13px] font-bold tracking-wide text-slate-700 bg-slate-50 border border-slate-200 hover:bg-slate-100 hover:border-slate-300 transition-all duration-200 uppercase"
                onClick={() => setShowConfirmModal(false)}
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearChat}
                disabled={isLoading}
                className="px-8 py-2.5 rounded-full text-[13px] font-bold tracking-wide text-white bg-slate-900 shadow-lg hover:bg-slate-800 transition-all duration-200 uppercase disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Clearing...' : 'Clear Chat'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
