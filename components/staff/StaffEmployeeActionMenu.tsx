import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical, Pencil, Trash2 } from 'lucide-react';

interface StaffEmployeeActionMenuProps {
  isOpen: boolean;
  showEdit: boolean;
  showDelete: boolean;
  onToggle: () => void;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const menuItemClass =
  'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] text-slate-700 transition hover:bg-slate-50';

function computeMenuPosition(trigger: HTMLElement, itemCount: number) {
  const menuWidth = 148;
  const menuHeight = Math.max(44, itemCount * 42 + 12);
  const offset = 8;
  const rect = trigger.getBoundingClientRect();

  let top = rect.bottom + offset;
  let left = rect.right - menuWidth;

  if (top + menuHeight > window.innerHeight - 8) {
    top = Math.max(8, rect.top - menuHeight - offset);
  }

  left = Math.max(8, Math.min(left, window.innerWidth - menuWidth - 8));

  return { top, left };
}

const StaffEmployeeActionMenu: React.FC<StaffEmployeeActionMenuProps> = ({
  isOpen,
  showEdit,
  showDelete,
  onToggle,
  onClose,
  onEdit,
  onDelete,
}) => {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);

  const itemCount = [showEdit, showDelete].filter(Boolean).length;
  const hasActions = itemCount > 0;

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
    return <span className="text-[12px] text-slate-300">-</span>;
  }

  return (
    <div className="relative inline-flex">
      <button
        ref={triggerRef}
        type="button"
        onClick={onToggle}
        className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-700 transition hover:bg-slate-100 ${
          isOpen ? 'bg-slate-100' : ''
        }`}
        title="Actions"
        aria-label="Actions"
        aria-expanded={isOpen}
      >
        <MoreVertical size={18} />
      </button>

      {isOpen && menuPosition
        ? createPortal(
            <div
              ref={menuRef}
              className="fixed z-[120] min-w-[148px] rounded-xl border border-slate-200 bg-white p-1.5 shadow-[0_8px_24px_rgba(15,23,42,0.12)]"
              style={{ top: menuPosition.top, left: menuPosition.left }}
              role="menu"
            >
              {showEdit ? (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onClose();
                    onEdit();
                  }}
                  className={menuItemClass}
                >
                  <Pencil size={14} />
                  Edit
                </button>
              ) : null}
              {showDelete ? (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onClose();
                    onDelete();
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] text-red-600 transition hover:bg-red-50"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
};

export default StaffEmployeeActionMenu;
