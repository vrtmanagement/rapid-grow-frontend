import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, MoreVertical, Pencil, Send, X } from 'lucide-react';
import type { ExpenseClaim } from './expenseTypes';
import { resolveExpenseRowActions } from './expenseTypes';

interface ExpenseRowActionMenuProps {
  claim: ExpenseClaim;
  currentUserId: string;
  isAdmin: boolean;
  canManageOthers: boolean;
  isOpen: boolean;
  isBusy: boolean;
  onToggle: () => void;
  onClose: () => void;
  onEdit?: (claim: ExpenseClaim) => void;
  onSubmit: (claim: ExpenseClaim) => void;
  onDelete: (claim: ExpenseClaim) => void;
}

const menuItemClass =
  'flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[13px] font-medium text-slate-700 transition hover:bg-slate-50';

function computeMenuPosition(trigger: HTMLElement, itemCount: number) {
  const menuWidth = 172;
  const menuHeight = Math.max(44, itemCount * 42 + 12);
  const offset = 6;
  const rect = trigger.getBoundingClientRect();

  let top = rect.bottom + offset;
  let left = rect.right - menuWidth;

  if (top + menuHeight > window.innerHeight - 8) {
    top = Math.max(8, rect.top - menuHeight - offset);
  }

  left = Math.max(8, Math.min(left, window.innerWidth - menuWidth - 8));

  return { top, left };
}

const ExpenseRowActionMenu: React.FC<ExpenseRowActionMenuProps> = ({
  claim,
  currentUserId,
  isAdmin,
  canManageOthers,
  isOpen,
  isBusy,
  onToggle,
  onClose,
  onEdit,
  onSubmit,
  onDelete,
}) => {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);

  const { showEdit, showSubmit, showDelete, hasActions } = resolveExpenseRowActions(
    claim,
    currentUserId,
    { isAdmin, canManageOthers },
  );

  const itemCount = [showEdit && onEdit, showSubmit, showDelete].filter(Boolean).length;

  const updateMenuPosition = () => {
    if (!triggerRef.current) return;
    setMenuPosition(computeMenuPosition(triggerRef.current, itemCount));
  };

  useLayoutEffect(() => {
    if (!isOpen) {
      setMenuPosition(null);
      return;
    }
    updateMenuPosition();
  }, [isOpen, itemCount]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      onClose();
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    const handleReposition = () => updateMenuPosition();

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    window.addEventListener('scroll', handleReposition, true);
    window.addEventListener('resize', handleReposition);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
      window.removeEventListener('scroll', handleReposition, true);
      window.removeEventListener('resize', handleReposition);
    };
  }, [isOpen, onClose, itemCount]);

  if (!hasActions) {
    return <span className="inline-block px-2 text-slate-300">—</span>;
  }

  return (
    <div className="relative inline-flex">
      <button
        ref={triggerRef}
        type="button"
        disabled={isBusy}
        onClick={onToggle}
        className={`inline-flex h-9 w-9 items-center justify-center rounded-full border transition ${
          isOpen
            ? 'border-slate-900 bg-white text-slate-900'
            : 'border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-800'
        }`}
        aria-label="Row actions"
        aria-expanded={isOpen}
      >
        {isBusy ? <Loader2 size={16} className="animate-spin" /> : <MoreVertical size={18} />}
      </button>

      {isOpen && menuPosition
        ? createPortal(
            <div
              ref={menuRef}
              className="fixed z-[120] min-w-[172px] rounded-xl border border-slate-200 bg-white p-1.5 shadow-[0_8px_24px_rgba(15,23,42,0.12)]"
              style={{ top: menuPosition.top, left: menuPosition.left }}
              role="menu"
            >
              {showEdit && onEdit && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onClose();
                    onEdit(claim);
                  }}
                  className={menuItemClass}
                >
                  <Pencil size={15} className="text-slate-500" />
                  Edit expense
                </button>
              )}

              {showSubmit && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onClose();
                    onSubmit(claim);
                  }}
                  className={menuItemClass}
                >
                  <Send size={15} className="text-slate-500" />
                  Submit
                </button>
              )}

              {showDelete && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onClose();
                    onDelete(claim);
                  }}
                  className={`${menuItemClass} text-red-600 hover:bg-red-50`}
                >
                  <X size={15} />
                  Delete expense
                </button>
              )}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
};

export default ExpenseRowActionMenu;
