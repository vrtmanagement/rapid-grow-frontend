import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';

const SidebarTooltip: React.FC<{ label: string; top: number; left: number }> = ({ label, top, left }) =>
  createPortal(
    <div
      className="pointer-events-none fixed z-[9999] whitespace-nowrap"
      style={{ top, left, transform: 'translateY(-50%)' }}
    >
      <span className="app-sidebar-tooltip relative inline-flex items-center rounded-xl border border-brand-red/15 bg-white/95 px-3.5 py-2 text-[12px] font-semibold tracking-[-0.01em] text-slate-700 shadow-[0_14px_30px_rgba(15,23,42,0.14)] ring-1 ring-white/70 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-200 dark:ring-slate-800/80">
        {label}
        <span className="app-sidebar-tooltip-arrow absolute left-0 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-l border-brand-red/15 bg-white/95 dark:border-slate-700 dark:bg-slate-900/95" aria-hidden="true" />
      </span>
    </div>,
    document.body
  );

export const SidebarToggleButton: React.FC<{ isOpen: boolean; onToggle: () => void }> = ({ isOpen, onToggle }) => {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const tooltipLabel = isOpen ? 'Collapse sidebar' : 'Expand sidebar';

  useEffect(() => {
    if (!tooltipOpen) return;

    const updateTooltipPosition = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      setTooltipStyle({
        top: rect.top + rect.height / 2,
        left: rect.right + 14,
      });
    };

    updateTooltipPosition();
    window.addEventListener('scroll', updateTooltipPosition, true);
    window.addEventListener('resize', updateTooltipPosition);
    return () => {
      window.removeEventListener('scroll', updateTooltipPosition, true);
      window.removeEventListener('resize', updateTooltipPosition);
    };
  }, [tooltipOpen]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={onToggle}
        onMouseEnter={() => setTooltipOpen(true)}
        onMouseLeave={() => setTooltipOpen(false)}
        onFocus={() => setTooltipOpen(true)}
        onBlur={() => setTooltipOpen(false)}
        className="app-sidebar-toggle shrink-0 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white dark:hover:bg-slate-800/60"
        aria-label={tooltipLabel}
      >
        <Menu size={17} />
      </button>
      {tooltipOpen && <SidebarTooltip label={tooltipLabel} top={tooltipStyle.top} left={tooltipStyle.left} />}
    </>
  );
};

export const SidebarLink: React.FC<{ to: string; icon: any; label: string; collapsed: boolean; badgeCount?: number }> = ({ to, icon, label, collapsed, badgeCount }) => {
  const location = useLocation();
  const linkRef = useRef<HTMLAnchorElement | null>(null);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const labelSizeClass = label === 'TaskHub'
    ? 'text-[12px]'
    : label === 'Communication'
    ? 'text-[11px]'
    : 'text-[13px]';
  const isActive = to === '/workspaces'
    ? location.pathname.startsWith('/workspaces')
    : to.startsWith('/employees')
    ? location.pathname.startsWith('/employees')
    : to === '/content'
    ? location.pathname === '/content' || location.pathname.startsWith('/content/day/') || location.pathname.startsWith('/content/new')
    : to === '/yearly'
    ? location.pathname.startsWith('/yearly') || location.pathname.startsWith('/quarterly') || location.pathname.startsWith('/monthly') || location.pathname.startsWith('/weekly') || location.pathname.startsWith('/daily')
    : to === '/'
    ? location.pathname === to
    : location.pathname === to || location.pathname.startsWith(`${to}/`);

  useEffect(() => {
    if (!tooltipOpen || !collapsed) return;

    const updateTooltipPosition = () => {
      const rect = linkRef.current?.getBoundingClientRect();
      if (!rect) return;
      setTooltipStyle({
        top: rect.top + rect.height / 2,
        left: rect.right + 14,
      });
    };

    updateTooltipPosition();
    window.addEventListener('scroll', updateTooltipPosition, true);
    window.addEventListener('resize', updateTooltipPosition);
    return () => {
      window.removeEventListener('scroll', updateTooltipPosition, true);
      window.removeEventListener('resize', updateTooltipPosition);
    };
  }, [collapsed, tooltipOpen]);

  return (
    <>
      <Link
        ref={linkRef}
        to={to}
        aria-label={label}
        className={`app-sidebar-link group relative flex items-center gap-3 rounded-lg px-3.5 py-2 transition-all max-sm:justify-center max-sm:px-0 ${
          isActive
            ? 'is-active bg-brand-red text-white shadow-xl'
            : 'text-slate-500 hover:bg-white/5 hover:text-white dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-white'
        } ${collapsed ? 'justify-center px-0 py-2' : ''}`}
        onMouseEnter={() => collapsed && setTooltipOpen(true)}
        onMouseLeave={() => setTooltipOpen(false)}
        onFocus={() => collapsed && setTooltipOpen(true)}
        onBlur={() => setTooltipOpen(false)}
      >
        <div className={`app-sidebar-link-icon ${isActive ? 'scale-105 text-white' : 'opacity-70 text-slate-500 transition-transform group-hover:text-brand-red group-hover:opacity-100 dark:text-slate-300'} shrink-0`}>{icon}</div>
        {!collapsed && (
          <div className="hidden min-w-0 flex-1 items-center justify-between gap-2 sm:flex">
            {isActive
              ? <span className={`app-sidebar-link-label ${labelSizeClass} font-medium tracking-[-0.01em] text-white truncate`}>{label}</span>
              : <span className={`app-sidebar-link-label ${labelSizeClass} font-medium tracking-[-0.01em] truncate group-hover:text-brand-red`}>{label}</span>
            }
            {badgeCount && badgeCount > 0 ? (
              <span
                className={`app-sidebar-link-badge inline-flex min-w-[24px] items-center justify-center rounded-full px-2 py-1 text-[11px] font-semibold leading-none ${
                  isActive
                    ? 'bg-white text-brand-red ring-1 ring-white/70'
                    : 'bg-white text-brand-red shadow-[0_8px_18px_rgba(15,23,42,0.10)] ring-1 ring-brand-red/10'
                }`}
              >
                {badgeCount}
              </span>
            ) : null}
          </div>
        )}
      </Link>
      {collapsed && tooltipOpen && <SidebarTooltip label={label} top={tooltipStyle.top} left={tooltipStyle.left} />}
    </>
  );
};
