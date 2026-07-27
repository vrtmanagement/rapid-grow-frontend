import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Calendar,
  CheckSquare,
  ChevronRight,
  MoreVertical,
  Pencil,
  Target,
  Trash2,
} from 'lucide-react';
import { dayLabel } from './visionPlanningHelpers';

export const ProgressBar = ({ progress, tone = 'red', loading = false }) => {
  const shimmerClass =
    tone === 'emerald'
      ? 'bg-[linear-gradient(90deg,#f1f5f9_0%,#d1fae5_35%,#10b981_50%,#d1fae5_65%,#f1f5f9_100%)]'
      : tone === 'navy'
        ? 'bg-[linear-gradient(90deg,#f1f5f9_0%,#cbd5e1_35%,#334155_50%,#cbd5e1_65%,#f1f5f9_100%)]'
        : 'bg-[linear-gradient(90deg,#f1f5f9_0%,#fecdd3_35%,#ef4444_50%,#fecdd3_65%,#f1f5f9_100%)]';
  const fillClass =
    tone === 'navy'
      ? 'from-slate-900 to-slate-700'
      : tone === 'emerald'
        ? 'from-emerald-500 to-emerald-400'
        : 'from-brand-red to-rose-500';

  return (
    <div className="relative h-2 overflow-hidden rounded-full bg-slate-100">
      {loading ? (
        <div
          className={`absolute inset-0 rounded-full ${shimmerClass}`}
          style={{
            animation: 'vision-progress-shimmer 1.05s ease-in-out infinite',
            backgroundSize: '220% 100%',
          }}
        />
      ) : (
        <div
          className={`h-full rounded-full bg-gradient-to-r ${fillClass} transition-all duration-500`}
          style={{ width: `${Math.max(0, Math.min(100, progress || 0))}%` }}
        />
      )}
    </div>
  );
};

export const SmallActionButton = ({ children, onClick, variant = 'default', disabled = false }) => {
  const variantClass =
    variant === 'primary'
      ? 'border-brand-red bg-brand-red text-white hover:bg-red-600'
      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1 rounded-xl border px-3 py-2 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${variantClass}`}
    >
      {children}
    </button>
  );
};

export const DrillBreadcrumb = ({ items }) => (
  <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
    {items.map((item, index) => (
      <React.Fragment key={item.label}>
        {index > 0 ? <ChevronRight size={14} className="text-slate-300" /> : null}
        {item.to ? (
          <Link to={item.to} className="transition hover:text-slate-900">
            {item.label}
          </Link>
        ) : (
          <span className="font-medium text-slate-900">{item.label}</span>
        )}
      </React.Fragment>
    ))}
  </div>
);

export const MetricCard = ({ label, value, subtitle }) => (
  <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4">
    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</div>
    <div className="mt-1 text-2xl font-semibold text-slate-900">{value}</div>
    <div className="mt-1 text-sm text-slate-500">{subtitle}</div>
  </div>
);

export const GridCard = ({ badge, title, subtitle, progress, onOpen, children, tone = 'red' }) => (
  <button
    type="button"
    onClick={onOpen}
    className="group flex h-full flex-col rounded-[1.75rem] border border-slate-200 bg-white p-5 text-left shadow-[0_18px_40px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_24px_50px_rgba(15,23,42,0.09)]"
  >
    <div className="flex items-start justify-between gap-3">
      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        {badge}
      </span>
      <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 transition group-hover:text-slate-600">
        Open
        <ArrowRight size={13} />
      </span>
    </div>
    <h3 className="mt-5 text-xl font-semibold tracking-tight text-slate-900">{title}</h3>
    <p className="mt-2 min-h-[44px] text-sm leading-6 text-slate-500">{subtitle}</p>
    <div className="mt-5">
      <div className="mb-2 flex items-center justify-between text-xs font-medium text-slate-500">
        <span>Completion</span>
        <span>{progress}%</span>
      </div>
      <ProgressBar progress={progress} tone={tone} />
    </div>
    {children ? <div className="mt-5">{children}</div> : null}
  </button>
);

export const visionTitleStyle = (title) => {
  const length = String(title || '').trim().length;
  if (length > 60) return { fontSize: '1.2rem' };
  if (length > 48) return { fontSize: '1.35rem' };
  if (length > 36) return { fontSize: '1.55rem' };
  return { fontSize: '1.8rem' };
};

const cardIconByStage = {
  year: Target,
  quarter: BarChart3,
  month: Calendar,
  week: CheckSquare,
};

export const VisionHierarchyCard = ({
  item,
  stageKey,
  stageLabel,
  badge,
  title,
  details,
  progress,
  footerLabel,
  linkTo,
  infoRows,
  onOpen,
  onEdit,
  onDelete,
  isAdmin,
  isEditing = false,
  draft,
  onDraftChange,
  onSave,
  onCancel,
  titlePlaceholder = 'Title',
  detailsPlaceholder = 'Add notes, metrics, or execution detail',
  isProgressLoading = false,
  menuOpen,
  onMenuToggle,
  onMenuClose,
  dateRange,
  isCurrentPeriod = false,
}) => {
  const Icon = cardIconByStage[stageKey] || Target;
  const displayTitle = isEditing ? (draft?.text ?? title) : title;
  const displayDetails = isEditing ? (draft?.details ?? details ?? '') : details;

  const stopEditEvent = (event) => {
    event.stopPropagation();
  };

  return (
  <div
    className={`group relative flex h-full flex-col rounded-[2rem] border bg-white transition ${
      isEditing ? 'z-30 overflow-visible ring-2 ring-brand-red/25' : menuOpen ? 'z-30 overflow-visible hover:-translate-y-1' : 'overflow-hidden hover:-translate-y-1'
    } ${
      isCurrentPeriod
        ? 'border-red-200 shadow-none ring-1 ring-red-100 hover:shadow-none'
        : 'border-slate-200 shadow-[0_20px_55px_rgba(15,23,42,0.07)] hover:border-slate-300 hover:shadow-[0_28px_70px_rgba(15,23,42,0.12)]'
    }`}
  >
    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 transition group-hover:from-brand-red group-hover:via-rose-400 group-hover:to-orange-300" />
    <div className="absolute right-0 top-0 h-28 w-28 rounded-full bg-transparent blur-2xl transition" />
    {isAdmin && !isEditing ? (
      <div
        className="absolute right-5 top-5 z-40"
        data-vision-card-menu="true"
        onClick={stopEditEvent}
        onMouseDown={stopEditEvent}
      >
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onMenuToggle();
          }}
          className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white/95 text-slate-500 shadow-sm transition hover:border-slate-300 hover:text-slate-900 ${
            menuOpen ? 'opacity-100' : 'opacity-100 sm:opacity-0 sm:group-hover:opacity-100'
          }`}
          aria-label="Open card actions"
          aria-expanded={menuOpen}
        >
          <MoreVertical size={16} />
        </button>
        {menuOpen ? (
          <div className="absolute right-0 z-50 mt-2 w-36 overflow-hidden rounded-2xl border border-slate-200 bg-white py-2 shadow-[0_18px_45px_rgba(15,23,42,0.14)]">
            <button
              type="button"
              onMouseDown={stopEditEvent}
              onClick={(event) => {
                event.stopPropagation();
                onEdit();
                onMenuClose();
              }}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
            >
              <Pencil size={14} />
              Edit
            </button>
            <button
              type="button"
              onMouseDown={stopEditEvent}
              onClick={(event) => {
                event.stopPropagation();
                onDelete();
                onMenuClose();
              }}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
            >
              <Trash2 size={14} />
              Delete
            </button>
          </div>
        ) : null}
      </div>
    ) : null}

      <div
        role={isEditing ? undefined : 'button'}
        tabIndex={isEditing ? undefined : 0}
        onClick={isEditing ? undefined : onOpen}
      onKeyDown={(event) => {
        if (isEditing) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen();
        }
      }}
      className={`relative flex w-full flex-1 flex-col p-6 text-left ${isEditing ? '' : 'cursor-pointer'}`}
    >
        <div className="flex items-start justify-between gap-4 pr-14">
          <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.4rem] shadow-none transition-all duration-300 ${
            isCurrentPeriod
              ? 'bg-slate-900 text-brand-red group-hover:bg-gradient-to-br group-hover:from-brand-red group-hover:to-red-500 group-hover:text-white'
              : 'bg-slate-900 text-brand-red group-hover:bg-gradient-to-br group-hover:from-brand-red group-hover:to-red-500 group-hover:text-white'
          }`}>
          <Icon size={24} />
          </div>
          <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
            {isEditing ? (
              <div className="rounded-full border border-brand-red/20 bg-red-50 px-3 py-1 text-xs font-semibold text-brand-red">
                Editing
              </div>
            ) : (
              <>
                <div className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-600">
                  Planning
                </div>
                <div className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-brand-red">
                  {stageLabel}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          {badge}
          </div>
          {dateRange && !isEditing ? (
            <div className={`rounded-full border px-3 py-1 text-xs font-medium ${
              isCurrentPeriod ? 'border-slate-200 bg-slate-50 text-slate-500 transition group-hover:border-red-200 group-hover:bg-red-50 group-hover:text-brand-red' : 'border-slate-200 bg-slate-50 text-slate-500'
            }`}>
              {dateRange}
            </div>
          ) : null}
        </div>

        {isEditing ? (
          <div className="mt-5 space-y-3" onClick={stopEditEvent} onMouseDown={stopEditEvent}>
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Title</span>
              <textarea
                value={displayTitle}
                onChange={(event) => onDraftChange({ text: event.target.value })}
                rows={2}
                placeholder={titlePlaceholder}
                className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-brand-red/40 focus:ring-2 focus:ring-brand-red/10"
                autoFocus
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Details</span>
              <textarea
                value={displayDetails}
                onChange={(event) => onDraftChange({ details: event.target.value })}
                rows={3}
                placeholder={detailsPlaceholder}
                className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 outline-none transition focus:border-brand-red/40 focus:ring-2 focus:ring-brand-red/10"
              />
            </label>
          </div>
        ) : (
          <>
            <div
              className="mt-5 overflow-hidden font-semibold leading-[1.08] tracking-[-0.04em] text-slate-900"
              style={{
                ...visionTitleStyle(title),
                display: '-webkit-box',
                WebkitBoxOrient: 'vertical',
                WebkitLineClamp: 2,
              }}
              title={title}
            >
              {title}
            </div>

            {details ? <p className="mt-4 text-sm leading-7 text-slate-500">{details}</p> : null}
          </>
        )}

      {!isEditing ? (
        <>
          <div className={`mt-5 flex items-center justify-between text-sm text-slate-500 ${details ? '' : 'pt-1'}`}>
            <span>Vision progress</span>
            <span className="text-2xl font-semibold text-slate-900">{progress}%</span>
          </div>
          <div className="mt-3">
            <ProgressBar progress={progress} tone="red" loading={isProgressLoading} />
          </div>

          <div className="mt-6 rounded-[1.6rem] border border-slate-200 bg-slate-50/85 p-4 shadow-none">
            <div className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-3 text-sm text-slate-500">
              {infoRows.map((row) => (
                <React.Fragment key={row.label}>
                  <span>{row.label}</span>
                  <span className="font-semibold text-slate-900">{row.value}</span>
                </React.Fragment>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>

    <div
      className="relative flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-6 py-5"
      onClick={isEditing ? stopEditEvent : undefined}
      onMouseDown={isEditing ? stopEditEvent : undefined}
    >
      {isEditing ? (
        <>
          <div className="text-sm font-medium text-slate-500">Save your changes</div>
          <div className="flex items-center gap-2">
            <SmallActionButton
              variant="primary"
              onClick={(event) => {
                event.stopPropagation();
                onSave();
              }}
            >
              Save
            </SmallActionButton>
            <SmallActionButton
              onClick={(event) => {
                event.stopPropagation();
                onCancel();
              }}
            >
              Cancel
            </SmallActionButton>
          </div>
        </>
      ) : (
        <>
          <div className="text-sm font-semibold text-slate-900">
            {progress}% complete
          </div>
          <Link
            to={linkTo}
            className="inline-flex items-center gap-2 text-base font-semibold text-brand-red transition hover:text-red-600"
            onClick={stopEditEvent}
          >
            {footerLabel}
            <ArrowRight size={16} />
          </Link>
        </>
      )}
    </div>
  </div>
  );
};

export const DailyRow = ({ day, index, isAdmin, onEdit, dateStr }) => (
  <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            {dateStr || dayLabel(index)}
          </span>
          <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${day.completed ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-brand-red'}`}>
            {day.completed ? 'Completed' : 'Active'}
          </span>
        </div>
        {!/^day\s+\d+$/i.test(String(day.text || '').trim()) ? (
          <h4 className="mt-4 text-base font-semibold text-slate-900">{day.text}</h4>
        ) : null}
        <p className="mt-2 text-sm leading-6 text-slate-500">
          {day.details || 'Use this day slot to define the exact action, output, or checkpoint for the selected week.'}
        </p>
      </div>
      {isAdmin ? (
        <div className="shrink-0">
          <SmallActionButton onClick={() => onEdit(day)}>
            <Pencil size={12} />
            Edit
          </SmallActionButton>
        </div>
      ) : null}
    </div>
  </div>
);
