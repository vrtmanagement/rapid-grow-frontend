import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { API_BASE, getAuthHeaders } from '../config/api';
import {
  Plus,
  MessageSquareText,
  RefreshCw,
  MoreVertical,
  Pencil,
  Eye,
  X,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { getSocket } from '../realtime/socket';

type SpacesMode = 'employee' | 'manager';
type BackendRole = 'SUPER_ADMIN' | 'ADMIN' | 'TEAM_LEAD' | 'EMPLOYEE' | string;

interface ProjectOption {
  id: string;
  name: string;
}

interface EmployeeOption {
  empId: string;
  empName: string;
  role?: BackendRole;
}

interface SpacesColumn {
  id: string;
  name: string;
}

interface SpacesComment {
  id: string;
  text: string;
  fromEmpId?: string;
  fromName?: string;
  createdAt: string;
  editedAt?: string;
}

type TaskStatus = 'todo' | 'doing' | 'review' | 'done' | 'blocked';
type TaskPriority = 'low' | 'medium' | 'high';
type TaskFilterMode = 'all' | 'me' | 'assigned';

interface SpacesTask {
  taskId: string;
  title: string;
  description?: string;
  projectId?: string;
  projectTaskId?: string;
  assigneeId?: string;
  assigneeName?: string;
  isViewed?: boolean;
  dueDate?: string;
  priority: TaskPriority;
  status: TaskStatus;
  comments: SpacesComment[];
  customFields: Record<string, string>;
  createdByEmpId?: string;
  createdByName?: string;
  createdByRole?: BackendRole;
  createdAt: string;
  updatedAt: string;
}

const TaskHubTableSkeleton: React.FC<{ customColumnCount: number }> = ({ customColumnCount }) => {
  const rows = Array.from({ length: 6 });
  const customColumns = Array.from({ length: customColumnCount });

  return (
    <>
      {rows.map((_, rowIndex) => (
        <tr key={`task-skeleton-${rowIndex}`} className="animate-pulse border-b border-slate-100 last:border-b-0">
          <td className="px-4 py-4">
            <div className="space-y-2">
              <div className="h-4 w-40 rounded-full bg-slate-200" />
              <div className="h-3 w-28 rounded-full bg-slate-100" />
            </div>
          </td>
          <td className="px-4 py-4">
            <div className="h-10 w-full rounded-2xl bg-slate-100" />
          </td>
          <td className="px-4 py-4">
            <div className="h-10 w-full rounded-2xl bg-slate-100" />
          </td>
          <td className="px-4 py-4">
            <div className="h-10 w-full rounded-2xl bg-slate-100" />
          </td>
          <td className="px-4 py-4">
            <div className="h-10 w-full rounded-2xl bg-slate-100" />
          </td>
          <td className="px-4 py-4">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-full bg-slate-100" />
              <div className="h-4 w-10 rounded-full bg-slate-200" />
            </div>
          </td>
          {customColumns.map((__, columnIndex) => (
            <td key={`task-skeleton-${rowIndex}-column-${columnIndex}`} className="px-4 py-4">
              <div className="h-10 w-full rounded-2xl bg-slate-100" />
            </td>
          ))}
          <td className="px-3 py-4">
            <div className="ml-auto h-9 w-9 rounded-full bg-slate-100" />
          </td>
        </tr>
      ))}
    </>
  );
};

function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function getLoggedInEmployee() {
  const stored = safeJsonParse<any>(localStorage.getItem('rapidgrow-admin'));
  const emp = stored?.employee || {};
  const id = emp.empId || emp._id || '';
  const name = emp.empName || 'Employee';
  const role: BackendRole = emp.role || 'EMPLOYEE';
  return { id, name, role };
}

function normalizeRole(role?: BackendRole): BackendRole {
  return (role || '').toUpperCase() as BackendRole;
}

function getPriorityRowClass(priority?: TaskPriority): string {
  if (priority === 'high') {
    return 'bg-red-100';
  }
  if (priority === 'medium') {
    return 'bg-red-50';
  }
  return 'bg-green-100';
}

function parseDateValue(value?: string): Date | null {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function formatDateValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateLabel(value?: string): string {
  const parsed = parseDateValue(value);
  if (!parsed) return 'mm/dd/yyyy';
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  const year = parsed.getFullYear();
  return `${month}/${day}/${year}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

const CALENDAR_WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const ThemedDatePicker: React.FC<{
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  compact?: boolean;
  forceOpenDown?: boolean;
}> = ({ value, onChange, disabled = false, compact = false, forceOpenDown = false }) => {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState<Date>(() => parseDateValue(value) || new Date());
  const [openAbove, setOpenAbove] = useState(false);

  useEffect(() => {
    const parsed = parseDateValue(value);
    if (parsed) setViewDate(parsed);
  }, [value]);

  useEffect(() => {
    if (!open) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [open]);

  useEffect(() => {
    if (!open || !wrapperRef.current) return;

    const updatePlacement = () => {
      if (!wrapperRef.current) return;
      const rect = wrapperRef.current.getBoundingClientRect();
      const estimatedHeight = compact ? 240 : 290;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      setOpenAbove(forceOpenDown ? false : spaceBelow < estimatedHeight && spaceAbove > spaceBelow);
    };

    updatePlacement();
    window.addEventListener('resize', updatePlacement);
    window.addEventListener('scroll', updatePlacement, true);
    return () => {
      window.removeEventListener('resize', updatePlacement);
      window.removeEventListener('scroll', updatePlacement, true);
    };
  }, [open, compact, forceOpenDown]);

  const startOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const monthLabel = viewDate.toLocaleString(undefined, { month: 'long', year: 'numeric' });
  const selectedDate = parseDateValue(value);
  const today = new Date();
  const triggerClass = compact
    ? TABLE_DATE_TRIGGER_CLASS
    : `${CREATE_INPUT_CLASS} text-left hover:border-slate-300 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400`;

  const calendarDays = useMemo(() => {
    const days: Date[] = [];
    const startDay = startOfMonth.getDay();
    const gridStart = new Date(startOfMonth);
    gridStart.setDate(startOfMonth.getDate() - startDay);

    for (let i = 0; i < 42; i += 1) {
      const day = new Date(gridStart);
      day.setDate(gridStart.getDate() + i);
      days.push(day);
    }

    return days;
  }, [startOfMonth]);

  const handleSelect = (date: Date) => {
    onChange(formatDateValue(date));
    setOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setOpen((prev) => !prev)}
        disabled={disabled}
        className={triggerClass}
      >
        <span className={value ? 'text-slate-700' : 'text-slate-400'}>{formatDateLabel(value)}</span>
        {!disabled ? (
          <Calendar
            size={compact ? 16 : 18}
            className={`absolute top-1/2 -translate-y-1/2 text-slate-500 ${compact ? 'right-3' : 'right-4'}`}
          />
        ) : null}
      </button>

      {open && !disabled && (
        <div
          className={`absolute left-0 z-30 border border-slate-200 bg-white shadow-2xl ${
            compact
              ? `w-[248px] rounded-[18px] p-2 ${openAbove ? 'bottom-full mb-1.5' : 'top-full mt-1.5'}`
              : `w-[270px] rounded-[22px] p-2.5 ${openAbove ? 'bottom-full mb-2' : 'top-full mt-2'}`
          }`}
        >
          <div className={`flex items-center justify-between ${compact ? 'mb-1.5' : 'mb-2'}`}>
            <div className={`${compact ? 'text-[13px]' : 'text-[14px]'} font-semibold text-slate-900`}>
              {monthLabel}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}
                className={`inline-flex items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:border-brand-red/20 hover:bg-red-50 hover:text-brand-red ${
                  compact ? 'h-7 w-7' : 'h-8 w-8'
                }`}
              >
                <ChevronLeft size={compact ? 14 : 15} />
              </button>
              <button
                type="button"
                onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}
                className={`inline-flex items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:border-brand-red/20 hover:bg-red-50 hover:text-brand-red ${
                  compact ? 'h-7 w-7' : 'h-8 w-8'
                }`}
              >
                <ChevronRight size={compact ? 14 : 15} />
              </button>
            </div>
          </div>

          <div className={`grid grid-cols-7 ${compact ? 'mb-1 gap-0.5' : 'mb-1.5 gap-1'}`}>
            {CALENDAR_WEEKDAYS.map((day) => (
              <div
                key={day}
                className={`text-center font-semibold uppercase tracking-[0.08em] text-slate-400 ${
                  compact ? 'text-[10px]' : 'text-[11px]'
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          <div className={`grid grid-cols-7 ${compact ? 'gap-0.5' : 'gap-1'}`}>
            {calendarDays.map((day) => {
              const inCurrentMonth = day.getMonth() === viewDate.getMonth();
              const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
              const isTodayValue = isSameDay(day, today);

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => handleSelect(day)}
                  className={`${compact ? 'h-7 rounded-lg text-[12px]' : 'h-8 rounded-xl text-[13px]'} transition-colors ${
                    isSelected
                      ? 'bg-brand-red text-white shadow-md'
                      : inCurrentMonth
                      ? 'text-slate-700 hover:bg-slate-100'
                      : 'text-slate-300 hover:bg-slate-50'
                  } ${isTodayValue && !isSelected ? 'border border-brand-red/20 bg-red-50 text-brand-red' : ''}`}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>

          <div className={`flex items-center justify-between border-t border-slate-100 ${compact ? 'mt-1.5 pt-1.5' : 'mt-2 pt-2'}`}>
            <button
              type="button"
              onClick={() => {
                onChange('');
                setOpen(false);
              }}
              className={`${compact ? 'text-[11px]' : 'text-[12px]'} font-semibold text-slate-500 hover:text-brand-red`}
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => handleSelect(new Date())}
              className={`rounded-full bg-brand-red font-semibold text-white hover:bg-brand-navy ${
                compact ? 'px-3 py-1 text-[11px]' : 'px-3.5 py-1.5 text-[12px]'
              }`}
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
const ThemedSelect: React.FC<{
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  compact?: boolean;
  forceOpenDown?: boolean;
}> = ({
  value,
  options,
  onChange,
  placeholder = 'Select',
  disabled = false,
  compact = false,
  forceOpenDown = false,
}) => {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, width: 0 });
  const [openAbove, setOpenAbove] = useState(false);

  useEffect(() => {
    if (!open) return;

    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!wrapperRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [open]);

  useEffect(() => {
    if (!open || !wrapperRef.current) return;

    const updatePlacement = () => {
      if (!wrapperRef.current) return;
      const rect = wrapperRef.current.getBoundingClientRect();
      const estimatedHeight = compact ? 240 : 290;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const shouldOpenAbove = forceOpenDown ? false : spaceBelow < estimatedHeight && spaceAbove > spaceBelow;
      setOpenAbove(shouldOpenAbove);

      if (compact) {
        setMenuPosition({
          left: rect.left,
          top: shouldOpenAbove ? Math.max(8, rect.top - estimatedHeight - 6) : rect.bottom + 6,
          width: rect.width,
        });
      }
    };

    updatePlacement();
    window.addEventListener('resize', updatePlacement);
    window.addEventListener('scroll', updatePlacement, true);
    return () => {
      window.removeEventListener('resize', updatePlacement);
      window.removeEventListener('scroll', updatePlacement, true);
    };
  }, [open, compact, forceOpenDown]);

  useEffect(() => {
    if (!open || !wrapperRef.current) return;

    const updatePlacement = () => {
      if (!wrapperRef.current) return;
      const rect = wrapperRef.current.getBoundingClientRect();
      const estimatedHeight = compact ? 240 : 290;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      setOpenAbove(forceOpenDown ? false : spaceBelow < estimatedHeight && spaceAbove > spaceBelow);
    };

    updatePlacement();
    window.addEventListener('resize', updatePlacement);
    window.addEventListener('scroll', updatePlacement, true);
    return () => {
      window.removeEventListener('resize', updatePlacement);
      window.removeEventListener('scroll', updatePlacement, true);
    };
  }, [open, compact, forceOpenDown]);

  useEffect(() => {
    if (!open || !compact) return;

    const updatePosition = () => {
      if (!wrapperRef.current) return;
      const rect = wrapperRef.current.getBoundingClientRect();
      const estimatedHeight = Math.min(Math.max(options.length, 1), 6) * 38 + 16;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const shouldOpenAbove = forceOpenDown ? false : spaceBelow < estimatedHeight && spaceAbove > spaceBelow;
      setOpenAbove(shouldOpenAbove);
      setMenuPosition({
        top: shouldOpenAbove ? Math.max(8, rect.top - estimatedHeight - 6) : rect.bottom + 6,
        left: rect.left,
        width: rect.width,
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, compact, options.length, forceOpenDown]);

  useEffect(() => {
    if (!open || compact || !wrapperRef.current) return;

    const updatePlacement = () => {
      if (!wrapperRef.current) return;
      const rect = wrapperRef.current.getBoundingClientRect();
      const estimatedHeight = Math.min(Math.max(options.length, 1), 6) * 50 + 16;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      setOpenAbove(forceOpenDown ? false : spaceBelow < estimatedHeight && spaceAbove > spaceBelow);
    };

    updatePlacement();
    window.addEventListener('resize', updatePlacement);
    window.addEventListener('scroll', updatePlacement, true);
    return () => {
      window.removeEventListener('resize', updatePlacement);
      window.removeEventListener('scroll', updatePlacement, true);
    };
  }, [open, compact, options.length, forceOpenDown]);

  const selected = options.find((option) => option.value === value);
  const triggerClass = compact ? TABLE_SELECT_TRIGGER_CLASS : CREATE_SELECT_TRIGGER_CLASS;
  const menuClass = compact ? TABLE_SELECT_MENU_CLASS : CREATE_SELECT_MENU_CLASS;
  const optionClass = compact ? TABLE_SELECT_OPTION_CLASS : CREATE_SELECT_OPTION_CLASS;

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setOpen((prev) => !prev)}
        disabled={disabled}
        className={triggerClass}
      >
        <span
          className={`min-w-0 flex-1 truncate whitespace-nowrap pr-2 text-left ${
            selected ? 'text-slate-700' : 'text-slate-400'
          }`}
        >
          {selected?.label || placeholder}
        </span>
        <ChevronDown
          size={compact ? 16 : 18}
          className={`shrink-0 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && !disabled && !compact && (
        <div className={`${menuClass} ${openAbove ? 'bottom-full top-auto mb-2 mt-0' : ''}`}>
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`${optionClass} ${
                  isSelected ? 'bg-red-50 text-brand-red' : ''
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}

      {open && !disabled && compact
        ? createPortal(
            <div
              ref={menuRef}
              className={`${menuClass} fixed z-[80] max-h-[240px] overflow-y-auto`}
              style={{
                top: `${menuPosition.top}px`,
                left: `${menuPosition.left}px`,
                width: `${menuPosition.width}px`,
              }}
            >
              {options.map((option) => {
                const isSelected = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                    className={`${optionClass} ${isSelected ? 'bg-red-50 text-brand-red' : ''}`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
};

const CREATE_INPUT_CLASS =
  'w-full rounded-2xl border border-slate-200 bg-white px-5 py-3 text-[15px] text-slate-700 outline-none shadow-[0_10px_30px_rgba(15,23,42,0.04)] transition-colors placeholder:text-slate-400 focus:border-brand-red focus:ring-2 focus:ring-brand-red/15';

const TABLE_INPUT_CLASS =
  'w-full bg-white border border-slate-200 rounded-xl px-4 pr-12 py-2 text-[13px] outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red';

const CREATE_SELECT_TRIGGER_CLASS =
  'flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-[15px] text-slate-700 outline-none shadow-[0_10px_30px_rgba(15,23,42,0.04)] transition-colors hover:border-slate-300 focus:border-brand-red focus:ring-2 focus:ring-brand-red/15 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400';

const CREATE_SELECT_MENU_CLASS =
  'absolute left-0 top-full z-30 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl';

const CREATE_SELECT_OPTION_CLASS =
  'w-full px-5 py-3 text-left text-[15px] text-slate-700 transition-colors hover:bg-red-50 hover:text-brand-red';

const TABLE_SELECT_TRIGGER_CLASS =
  'flex w-[124px] max-w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 pr-4 py-2 text-[13px] text-slate-700 outline-none transition-colors hover:border-slate-300 focus:border-brand-red focus:ring-2 focus:ring-brand-red/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400';

const TABLE_SELECT_MENU_CLASS =
  'absolute left-0 top-full z-30 mt-1.5 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl';

const TABLE_SELECT_OPTION_CLASS =
  'w-full px-4 py-2.5 text-left text-[13px] text-slate-700 transition-colors hover:bg-red-50 hover:text-brand-red';

const TABLE_DATE_TRIGGER_CLASS =
  'w-[138px] max-w-full rounded-xl border border-slate-200 bg-white px-4 pr-10 py-2 text-center text-[13px] text-slate-700 outline-none transition-colors hover:border-slate-300 focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400';

function projectCharterPayloadFromBackendProject(proj: any, updatedTasks: any[]) {
  return {
    id: proj.clientProjectId,
    name: proj.name,
    status: proj.status,
    dateCreated: proj.dateCreated,
    businessCase: proj.businessCase,
    problemStatement: proj.problemStatement,
    goalStatement: proj.goalStatement,
    inScope: proj.inScope,
    outOfScope: proj.outOfScope,
    benefits: proj.benefits,
    champion: proj.champion,
    championRole: proj.championRole,
    lead: proj.lead,
    leadRole: proj.leadRole,
    smeList: proj.smeList || [],
    projectTeam: proj.projectTeam || [],
    phases: proj.phases || {},
    tasks: updatedTasks,
  };
}

interface Props {
  mode: SpacesMode;
}

const SpacesView: React.FC<Props> = ({ mode }) => {
  const generateId = () =>
    (typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? (crypto.randomUUID() as string)
      : Math.random().toString(36).slice(2));
  const me = useMemo(() => getLoggedInEmployee(), []);

  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);

  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);

  const [columns, setColumns] = useState<SpacesColumn[]>([]);
  const [tasks, setTasks] = useState<SpacesTask[]>([]);
  const [spacesLoading, setSpacesLoading] = useState(false);
  const [markingTasksViewed, setMarkingTasksViewed] = useState(false);

  const [title, setTitle] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [commentTaskId, setCommentTaskId] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentDraft, setEditCommentDraft] = useState('');
  const [commentToDeleteId, setCommentToDeleteId] = useState<string | null>(null);
  const [modalStatus, setModalStatus] = useState<TaskStatus>('todo');

  const [activeColumnMenuId, setActiveColumnMenuId] = useState<string | null>(null);
  const [isRenamingColumnId, setIsRenamingColumnId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [columnToDelete, setColumnToDelete] = useState<SpacesColumn | null>(null);
  const [deleteTaskModal, setDeleteTaskModal] = useState<SpacesTask | null>(null);

  const [taskFilterMode, setTaskFilterMode] = useState<TaskFilterMode>('all');
  const [taskSearch, setTaskSearch] = useState('');

  const [editingTask, setEditingTask] = useState<SpacesTask | null>(null);
  const [editingTaskDraft, setEditingTaskDraft] = useState<Partial<SpacesTask>>({});

  const projectNameById = useMemo(() => {
    const map = new Map<string, string>();
    projects.forEach((p) => map.set(p.id, p.name));
    return map;
  }, [projects]);

  const employeeNameById = useMemo(() => {
    const map = new Map<string, string>();
    employees.forEach((e) => map.set(e.empId, e.empName));
    if (me.id && me.name) {
      map.set(me.id, me.name);
    }
    return map;
  }, [employees, me.id, me.name]);

  const canAssignTo = (emp: EmployeeOption | null): boolean => {
    if (!emp) return true;
    if (emp.empId === me.id) return true;
    const viewerRole = normalizeRole(me.role);
    const targetRole = normalizeRole(emp.role || 'EMPLOYEE');

    if (viewerRole === 'EMPLOYEE') {
      // Employee: can only assign tasks to themselves.
      return false;
    }

    if (viewerRole === 'TEAM_LEAD') {
      // Team lead: cannot assign tasks to admins / super admins
      return targetRole !== 'ADMIN' && targetRole !== 'SUPER_ADMIN';
    }

    // Admin / Super Admin: can assign to anyone
    return true;
  };

  const assignableEmployees = useMemo(() => {
    const map = new Map<string, EmployeeOption>();
    employees.forEach((emp) => {
      map.set(emp.empId, emp);
    });
    if (me.id) {
      map.set(me.id, {
        empId: me.id,
        empName: me.name || 'You',
        role: me.role || 'EMPLOYEE',
      });
    }
    return Array.from(map.values()).filter((emp) => canAssignTo(emp));
  }, [employees, me.id, me.name, me.role]);

  const employeeById = useMemo(() => {
    const map = new Map<string, EmployeeOption>();
    employees.forEach((emp) => map.set(emp.empId, emp));
    if (me.id) {
      map.set(me.id, {
        empId: me.id,
        empName: me.name || 'You',
        role: me.role || 'EMPLOYEE',
      });
    }
    return map;
  }, [employees, me.id, me.name, me.role]);

  const createAssigneeOptions = useMemo(
    () => [
      { value: '', label: 'Unassigned' },
      ...assignableEmployees.map((employee) => ({
        value: employee.empId,
        label: employee.empId === me.id ? `${employee.empName} (You)` : employee.empName || 'Unknown User',
      })),
    ],
    [assignableEmployees, me.id],
  );

  const priorityOptions = useMemo(
    () => [
      { value: 'low', label: 'Low' },
      { value: 'medium', label: 'Medium' },
      { value: 'high', label: 'High' },
    ],
    [],
  );

  const statusOptions = useMemo(
    () => [
      { value: 'todo', label: 'To Do' },
      { value: 'doing', label: 'Doing' },
      { value: 'review', label: 'Review' },
      { value: 'done', label: 'Done' },
      { value: 'blocked', label: 'Blocked' },
    ],
    [],
  );

  const projectSelectOptions = useMemo(
    () => [
      { value: '', label: 'No project' },
      ...projects.map((project) => ({ value: project.id, label: project.name })),
    ],
    [projects],
  );

  const assigneeOptionsForTask = (currentAssigneeId?: string): EmployeeOption[] => {
    const map = new Map<string, EmployeeOption>();
    assignableEmployees.forEach((emp) => map.set(emp.empId, emp));
    const currentId = (currentAssigneeId || '').trim();
    if (currentId && !map.has(currentId)) {
      const currentEmp = employeeById.get(currentId);
      map.set(
        currentId,
        currentEmp || {
          empId: currentId,
          empName: '',
          role: 'EMPLOYEE',
        },
      );
    }
    return Array.from(map.values());
  };

  const upsertTaskById = (prev: SpacesTask[], incoming: SpacesTask): SpacesTask[] => {
    if (!incoming?.taskId) return prev;
    const idx = prev.findIndex((t) => t.taskId === incoming.taskId);
    if (idx === -1) return [incoming, ...prev];
    const next = [...prev];
    next[idx] = incoming;
    return next;
  };

  const loadSpaces = async () => {
    setSpacesLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/spaces`, { headers: getAuthHeaders() });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to load spaces');
      }
      const data = await res.json();
      setColumns(Array.isArray(data?.columns) ? data.columns : []);
      setTasks(Array.isArray(data?.tasks) ? data.tasks : []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load spaces');
    } finally {
      setSpacesLoading(false);
    }
  };

  useEffect(() => {
    loadSpaces();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!me.id) return;
    const unreadCount = tasks.filter(
      (task) => task.assigneeId === me.id && task.isViewed === false && task.status !== 'done',
    ).length;
    window.dispatchEvent(
      new CustomEvent('rapidgrow:task-count-sync', {
        detail: { userId: me.id, unreadCount },
      }),
    );
  }, [tasks, me.id]);

  useEffect(() => {
    const hasUnreadAssignedTasks = tasks.some(
      (task) => task.assigneeId === me.id && task.isViewed === false,
    );

    if (!me.id || !hasUnreadAssignedTasks || markingTasksViewed) return;

    let cancelled = false;

    const markAssignedTasksAsViewed = async () => {
      setMarkingTasksViewed(true);
      try {
        const res = await fetch(`${API_BASE}/tasks/mark-as-viewed`, {
          method: 'PUT',
          headers: getAuthHeaders(),
        });
        if (!res.ok) {
          throw new Error('Failed to mark tasks as viewed');
        }
        if (!cancelled) {
          setTasks((prev) =>
            prev.map((task) =>
              task.assigneeId === me.id ? { ...task, isViewed: true } : task,
            ),
          );
        }
      } catch (e) {
        console.error('Failed to mark assigned tasks as viewed', e);
      } finally {
        if (!cancelled) {
          setMarkingTasksViewed(false);
        }
      }
    };

    markAssignedTasksAsViewed();

    return () => {
      cancelled = true;
    };
  }, [tasks, me.id, markingTasksViewed]);

  useEffect(() => {
    const socket = getSocket();
    const onSpacesChanged = (payload: any) => {
      const action = payload?.action as string | undefined;

      if (payload?.columns && (action === 'column_added' || action === 'column_deleted')) {
        const cols = Array.isArray(payload.columns) ? payload.columns : [];
        setColumns(cols);
        if (action === 'column_deleted' && payload?.columnId) {
          const deletedId = String(payload.columnId);
          setTasks((prev) =>
            prev.map((t) => {
              const cf = t.customFields || {};
              if (!(deletedId in cf)) return t;
              const { [deletedId]: _omit, ...rest } = cf;
              return { ...t, customFields: rest };
            }),
          );
        }
        return;
      }

      if (action === 'task_created' && payload?.task) {
        const task = payload.task as SpacesTask;
        setTasks((prev) => upsertTaskById(prev, task));
        return;
      }

      if (action === 'task_updated' && payload?.task) {
        const task = payload.task as SpacesTask;
        setTasks((prev) => prev.map((t) => (t.taskId === task.taskId ? task : t)));
        return;
      }

      if (action === 'task_deleted' && payload?.taskId) {
        const taskId = String(payload.taskId);
        setTasks((prev) => prev.filter((t) => t.taskId !== taskId));
        return;
      }

      if (
        (action === 'comment_added' || action === 'comment_updated' || action === 'comment_deleted') &&
        payload?.taskId &&
        payload?.comments
      ) {
        const taskId = String(payload.taskId);
        const comments = Array.isArray(payload.comments) ? payload.comments : [];
        setTasks((prev) =>
          prev.map((t) => (t.taskId === taskId ? ({ ...t, comments } as SpacesTask) : t)),
        );
        return;
      }
    };

    // Keep legacy event (no payload) but no API refresh: we'll ignore it.
    const noop = () => {};
    socket.on('spaces:task_created', noop);
    socket.on('spaces:changed', onSpacesChanged);
    return () => {
      socket.off('spaces:task_created', noop);
      socket.off('spaces:changed', onSpacesChanged);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const loadProjects = async () => {
      setProjectsLoading(true);
      try {
        if (mode === 'employee') {
          if (!me.id) {
            setProjects([]);
            return;
          }
          const res = await fetch(`${API_BASE}/project-charters/assigned/${me.id}`, {
            headers: getAuthHeaders(),
          });
          if (!res.ok) {
            setProjects([]);
            return;
          }
          const data = await res.json().catch(() => []);
          const list = Array.isArray(data) ? data : [];
          setProjects(
            list
              .map((p: any) => ({ id: p.clientProjectId, name: p.name }))
              .filter((p: ProjectOption) => p.id && p.name),
          );
        } else {
          const res = await fetch(`${API_BASE}/project-charters`, {
            headers: getAuthHeaders(),
          });
          if (!res.ok) {
            setProjects([]);
            return;
          }
          const data = await res.json().catch(() => []);
          const list = Array.isArray(data) ? data : [];
          setProjects(
            list
              .map((p: any) => ({ id: p.clientProjectId, name: p.name }))
              .filter((p: ProjectOption) => p.id && p.name),
          );
        }
      } catch (e) {
        console.error('Failed to load projects for Spaces', e);
        setProjects([]);
      } finally {
        setProjectsLoading(false);
      }
    };

    loadProjects();
  }, [mode, me.id]);

  useEffect(() => {
    const loadEmployees = async () => {
      setEmployeesLoading(true);
      try {
        const res = await fetch(`${API_BASE}/employees`, { headers: getAuthHeaders() });
        if (!res.ok) {
          setEmployees([]);
          return;
        }
        const data = await res.json().catch(() => []);
        const list = Array.isArray(data) ? data : [];
        setEmployees(
          list
            .map((e: any) => ({
              empId: e.empId,
              empName: e.empName,
              role: (e.role || 'EMPLOYEE') as BackendRole,
            }))
            .filter((e: EmployeeOption) => e.empId && e.empName),
        );
      } catch (e) {
        console.error('Failed to load employees for Spaces', e);
        setEmployees([]);
      } finally {
        setEmployeesLoading(false);
      }
    };

    loadEmployees();
  }, []);

  const patchTask = async (taskId: string, updates: Partial<SpacesTask>) => {
    setError(null);
    const existing = tasks.find((t) => t.taskId === taskId) || null;
    setTasks((prev) =>
      prev.map((t) => (t.taskId === taskId ? ({ ...t, ...updates } as SpacesTask) : t)),
    );
    try {
      const res = await fetch(`${API_BASE}/spaces/tasks/${taskId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to update task');
      }
      const updated = await res.json();
      setTasks((prev) => prev.map((t) => (t.taskId === taskId ? updated : t)));

      // If this task is linked to a project task, sync updates into the project charter as well
      if (existing?.projectId && existing?.projectTaskId) {
        try {
          const resProj = await fetch(`${API_BASE}/project-charters/${existing.projectId}`, {
            headers: getAuthHeaders(),
          });
          if (resProj.ok) {
            const proj = await resProj.json();
            const existingTasks: any[] = Array.isArray(proj?.tasks) ? proj.tasks : [];
            const updatedTasks = existingTasks.map((pt: any) => {
              if (pt.id !== existing.projectTaskId) return pt;
              return {
                ...pt,
                title: updates.title ?? pt.title,
                status: updates.status ?? pt.status,
                priority: updates.priority ?? pt.priority,
                assigneeId: updates.assigneeId ?? pt.assigneeId,
                dueDate: updates.dueDate ?? pt.dueDate,
                updatedAt: new Date().toISOString(),
              };
            });
            const payload = projectCharterPayloadFromBackendProject(proj, updatedTasks);
            await fetch(`${API_BASE}/project-charters`, {
              method: 'POST',
              headers: getAuthHeaders(),
              body: JSON.stringify(payload),
            });
          }
        } catch (e) {
          console.error('Failed to sync Spaces task to project charter', e);
        }
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to update task');
      loadSpaces();
    }
  };

  const handleAddColumn = async () => {
    const name = window.prompt('New field name');
    const trimmed = (name || '').trim();
    if (!trimmed) return;
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/spaces/columns`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Failed to add field');
      }
      setColumns(Array.isArray(data.columns) ? data.columns : []);
    } catch (e: any) {
      setError(e?.message || 'Failed to add field');
    }
  };

  const handleCreate = async () => {
    const t = title.trim();
    if (!t) return;
    setSaving(true);
    setError(null);

    const now = new Date().toISOString();
    const projectTaskId = `t-${generateId()}`;
    const project = selectedProjectId
      ? projects.find((p) => p.id === selectedProjectId) || null
      : null;

    try {
      if (project) {
        // Persist to backend project tasks so Team Lead/Admin can see it inside the project.
        const resProj = await fetch(`${API_BASE}/project-charters/${project.id}`, {
          headers: getAuthHeaders(),
        });
        if (!resProj.ok) {
          throw new Error('Failed to load project details');
        }
        const proj = await resProj.json();
        const existingTasks: any[] = Array.isArray(proj?.tasks) ? proj.tasks : [];
        const newWorkspaceTask = {
          id: projectTaskId,
          title: t,
          description: '',
          status,
          priority,
          createdBy: me.id || 'employee',
          createdByRole: me.role || 'EMPLOYEE',
          assigneeId: assigneeId || undefined,
          dueDate: dueDate || undefined,
          createdAt: now,
          updatedAt: now,
        };
        const updatedTasks = [...existingTasks, newWorkspaceTask];
        const payload = projectCharterPayloadFromBackendProject(proj, updatedTasks);

        const resSave = await fetch(`${API_BASE}/project-charters`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        });
        if (!resSave.ok) {
          const data = await resSave.json().catch(() => ({}));
          throw new Error(data.message || 'Failed to create task under project');
        }
      }

      const res = await fetch(`${API_BASE}/spaces/tasks`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          title: t,
          projectId: project?.id || '',
          projectTaskId: project ? projectTaskId : undefined,
          assigneeId,
          dueDate,
          priority,
          status,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Failed to create task');
      }

      setTasks((prev) => upsertTaskById(prev, data as SpacesTask));
      setTitle('');
      setAssigneeId('');
      setDueDate('');
      setPriority('medium');
      setStatus('todo');
      setSelectedProjectId('');
    } catch (e: any) {
      setError(e?.message || 'Failed to create task');
    } finally {
      setSaving(false);
    }
  };

  const visibleTasks = useMemo(() => tasks, [tasks]);

  const filteredTasks = useMemo(() => {
    let list = visibleTasks;

    if (taskFilterMode === 'me' && me.id) {
      list = list.filter((t) => t.createdByEmpId === me.id && t.assigneeId === me.id);
    }

    if (taskFilterMode === 'assigned' && me.id) {
      list = list.filter(
        (t) => t.assigneeId === me.id && t.createdByEmpId !== me.id,
      );
    }

    const term = taskSearch.trim().toLowerCase();
    if (!term) return list;

    return list.filter((t) => {
      const assigneeName = t.assigneeId ? employeeNameById.get(t.assigneeId) || '' : '';
      const createdByName = t.createdByName || '';
      const createdById = t.createdByEmpId || '';
      const assigneeId = t.assigneeId || '';

      return (
        assigneeId.toLowerCase().includes(term) ||
        assigneeName.toLowerCase().includes(term) ||
        createdById.toLowerCase().includes(term) ||
        createdByName.toLowerCase().includes(term)
      );
    });
  }, [visibleTasks, taskFilterMode, taskSearch, me.id, employeeNameById]);

  const sortedTasks = useMemo(() => {
    if (filteredTasks.length === 0) return filteredTasks;
    const copy = [...filteredTasks];
    const managerRoles = new Set<BackendRole>(['SUPER_ADMIN', 'ADMIN', 'TEAM_LEAD']);
    copy.sort((a, b) => {
      if (mode === 'employee') {
        const aManager = managerRoles.has((a.createdByRole || '').toUpperCase());
        const bManager = managerRoles.has((b.createdByRole || '').toUpperCase());
        if (aManager !== bManager) return aManager ? -1 : 1;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return copy;
  }, [filteredTasks, mode]);

  const getTaskHighlightClass = (t: SpacesTask): string => {
    return getPriorityRowClass(t.priority);
  };

  const isTaskLocked = (t: SpacesTask): boolean => {
    const role = (me.role || '').toUpperCase() as BackendRole;
    const createdRole = (t.createdByRole || '').toUpperCase() as BackendRole;

    if (mode === 'employee') {
      return t.status === 'done';
    }

    if (
      role === 'TEAM_LEAD' &&
      t.status === 'done' &&
      (createdRole === 'ADMIN' || createdRole === 'SUPER_ADMIN')
    ) {
      return true;
    }

    return false;
  };

  const getTaskRowClasses = (t: SpacesTask): string => {
    const highlight = getTaskHighlightClass(t);
    const base = 'border-b border-slate-100';
    const isLockedDoneRow = isTaskLocked(t);
    if (highlight) {
      return `${base} ${highlight}${isLockedDoneRow ? ' opacity-60' : ''}`;
    }
    return `${base}${isLockedDoneRow ? ' opacity-60' : ' hover:bg-slate-50/50'}`;
  };

  const canEditTask = (t: SpacesTask): boolean => {
    const role = (me.role || '').toUpperCase() as BackendRole;
    if (mode === 'employee') {
      // Employee can edit only tasks they created themselves
      return t.createdByEmpId === me.id;
    }
    if (role === 'SUPER_ADMIN' || role === 'ADMIN') {
      // Admins can edit all tasks in the group
      return true;
    }
    if (role === 'TEAM_LEAD') {
      // Team leads can edit their own tasks and employee-created tasks,
      // but not admin-created tasks.
      if (t.createdByEmpId === me.id) return true;
      const createdRole = (t.createdByRole || '').toUpperCase();
      return createdRole === 'TEAM_LEAD' || createdRole === 'EMPLOYEE';
    }
    return false;
  };

  const canCommentOnTask = (t: SpacesTask): boolean => {
    if (mode === 'employee') {
      // Employee can comment on tasks they are assigned to or created
      return t.assigneeId === me.id || t.createdByEmpId === me.id;
    }
    return canEditTask(t);
  };

  const canDeleteTask = (t: SpacesTask): boolean => {
    const role = (me.role || '').toUpperCase() as BackendRole;
    if (mode === 'employee') {
      // Employee: can delete only tasks they created themselves
      return t.createdByEmpId === me.id;
    }
    if (role === 'SUPER_ADMIN' || role === 'ADMIN') {
      // Admins: can delete all tasks
      return true;
    }
    if (role === 'TEAM_LEAD') {
      // Team leads can delete their own tasks and employee-created tasks,
      // but not admin-created tasks.
      if (t.createdByEmpId === me.id) return true;
      const createdRole = (t.createdByRole || '').toUpperCase();
      return createdRole === 'TEAM_LEAD' || createdRole === 'EMPLOYEE';
    }
    return false;
  };

  const canEditDueDate = (t: SpacesTask): boolean => {
    if (isTaskLocked(t)) return false;
    return canEditTask(t);
  };

  const canChangeStatus = (t: SpacesTask): boolean => {
    if (isTaskLocked(t)) return false;
    if (mode === 'employee') {
      // Employee can change status for tasks they are assigned to or created
      return t.assigneeId === me.id || t.createdByEmpId === me.id;
    }

    if ((me.role || '').toUpperCase() === 'TEAM_LEAD') {
      return t.assigneeId === me.id || canEditTask(t);
    }

    return canEditTask(t);
  };

  const activeCommentTask = useMemo(
    () => sortedTasks.find((t) => t.taskId === commentTaskId) || null,
    [sortedTasks, commentTaskId],
  );

  const handleAddComment = async () => {
    if (!activeCommentTask || !canCommentOnTask(activeCommentTask)) return;
    const text = commentDraft.trim();
    if (!text) return;
    setError(null);
    try {
      // If employee is viewing their portal, allow status change together with comment
      if (mode === 'employee' && modalStatus && modalStatus !== activeCommentTask.status) {
        await patchTask(activeCommentTask.taskId, { status: modalStatus });
      }

      const res = await fetch(`${API_BASE}/spaces/tasks/${activeCommentTask.taskId}/comments`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ text }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Failed to add comment');
      }
      setTasks((prev) =>
        prev.map((t) =>
          t.taskId === activeCommentTask.taskId
            ? { ...t, comments: Array.isArray(data.comments) ? data.comments : [] }
            : t,
        ),
      );
      setCommentDraft('');
    } catch (e: any) {
      setError(e?.message || 'Failed to add comment');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-700">
      <div className="flex items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="h-1.5 w-8 bg-brand-red rounded-full" />
            <span className="text-[15px] text-slate-500">Task Hub</span>
          </div>
          <h2 className="text-4xl text-slate-900 leading-none">Task Hub</h2>
          <p className="text-slate-500 text-lg mt-3">
            Tasks table with project/no-project support.
          </p>
        </div>

        <button
          type="button"
          onClick={loadSpaces}
          disabled={spacesLoading}
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 ${
            spacesLoading ? 'opacity-60 cursor-not-allowed' : ''
          }`}
          title="Refresh"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-[15px]">
          {error}
        </div>
      )}

      <div className="bg-white p-8 rounded-3xl shadow-2xl border border-slate-200 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-4">
          <div className="lg:col-span-2">
            <label className="block text-[13px] font-semibold text-slate-700 mb-2">Task *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={CREATE_INPUT_CLASS}
              placeholder="Task name"
            />
          </div>

          <div>
            <label className="block text-[13px] font-semibold text-slate-700 mb-2">Assignee</label>
            <ThemedSelect
              value={assigneeId}
              onChange={setAssigneeId}
              options={createAssigneeOptions}
              placeholder="Unassigned"
              disabled={employeesLoading}
              forceOpenDown={true}
            />
          </div>

          <div>
            <label className="block text-[13px] font-semibold text-slate-700 mb-2">Due date</label>
            <ThemedDatePicker value={dueDate} onChange={setDueDate} forceOpenDown={true} />
          </div>

          <div>
            <label className="block text-[13px] font-semibold text-slate-700 mb-2">Priority</label>
            <ThemedSelect
              value={priority}
              onChange={(value) => setPriority(value as TaskPriority)}
              options={priorityOptions}
              forceOpenDown={true}
            />
          </div>

          <div>
            <label className="block text-[13px] font-semibold text-slate-700 mb-2">Status</label>
            <ThemedSelect
              value={status}
              onChange={(value) => setStatus(value as TaskStatus)}
              options={statusOptions}
              forceOpenDown={true}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="md:col-span-2">
            <label className="block text-[13px] font-semibold text-slate-700 mb-2">Project</label>
            <ThemedSelect
              value={selectedProjectId}
              onChange={setSelectedProjectId}
              options={projectSelectOptions}
              placeholder="No project"
              disabled={projectsLoading}
              forceOpenDown={true}
            />
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleCreate}
              disabled={saving || !title.trim()}
              className={`inline-flex items-center gap-2 px-8 py-3 rounded-full bg-brand-red text-white text-[15px] font-black shadow-lg hover:bg-brand-navy transition-colors ${
                saving || !title.trim() ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            >
              <Plus size={18} />
              {saving ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="inline-flex rounded-full border border-slate-200 bg-white p-1">
          <button
            type="button"
            onClick={() => setTaskFilterMode('all')}
            className={`px-4 py-1.5 text-[13px] rounded-full ${
              taskFilterMode === 'all'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setTaskFilterMode('me')}
            className={`px-4 py-1.5 text-[13px] rounded-full ${
              taskFilterMode === 'me'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Me
          </button>
          <button
            type="button"
            onClick={() => setTaskFilterMode('assigned')}
            className={`px-4 py-1.5 text-[13px] rounded-full ${
              taskFilterMode === 'assigned'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Assigned
          </button>
        </div>

        <div className="flex items-center gap-2">
          <input
            value={taskSearch}
            onChange={(e) => setTaskSearch(e.target.value)}
            placeholder="Search by employee ID or name..."
            className="w-full md:w-80 rounded-full border border-slate-200 px-4 py-2 text-[14px] outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red"
          />
          {taskSearch.trim() && (
            <button
              type="button"
              onClick={() => setTaskSearch('')}
              className="text-[12px] text-slate-500 hover:text-brand-red"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-[12px] font-bold text-slate-600 uppercase tracking-[0.12em]">
                <th className="px-4 py-3 min-w-[220px]">Name</th>
                <th className="px-4 py-3 min-w-[180px]">Assignee</th>
                <th className="px-4 py-3 min-w-[140px]">Due date</th>
                <th className="px-4 py-3 min-w-[140px]">Priority</th>
                <th className="px-4 py-3 min-w-[140px]">Status</th>
                <th className="px-4 py-3 min-w-[120px]">Comments</th>
                {columns.map((c) => (
                  <th key={c.id} className="px-4 py-3 min-w-[200px]">
                    <div className="flex items-center justify-between gap-2">
                      {isRenamingColumnId === c.id ? (
                        <input
                          value={renameDraft}
                          onChange={(e) => setRenameDraft(e.target.value)}
                          onBlur={async () => {
                            const next = renameDraft.trim();
                            setIsRenamingColumnId(null);
                            setActiveColumnMenuId(null);
                            if (!next || next === c.name) return;
                            try {
                              const updatedTasks = sortedTasks.map((t) => ({
                                ...t,
                              }));
                              const res = await fetch(`${API_BASE}/spaces/columns`, {
                                method: 'POST',
                                headers: getAuthHeaders(),
                                body: JSON.stringify({ name: next }),
                              });
                              const data = await res.json().catch(() => ({}));
                              if (!res.ok) {
                                throw new Error(data.message || 'Failed to rename field');
                              }
                              setColumns(Array.isArray(data.columns) ? data.columns : []);
                            } catch (e: any) {
                              setError(e?.message || 'Failed to rename field');
                            }
                          }}
                          className="flex-1 bg-white border border-slate-200 rounded-xl px-2 py-1 text-[12px] outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red"
                          autoFocus
                        />
                      ) : (
                        <span>{c.name}</span>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          setActiveColumnMenuId((prev) => (prev === c.id ? null : c.id))
                        }
                        className="inline-flex items-center justify-center w-7 h-7 rounded-full border border-slate-200 bg-white hover:bg-slate-100"
                      >
                        <MoreVertical size={14} />
                      </button>
                    </div>
                    {activeColumnMenuId === c.id && (
                      <div className="relative">
                        <div className="absolute right-0 mt-2 w-40 bg-white border border-slate-200 rounded-xl shadow-lg z-10">
                          <button
                            type="button"
                            onClick={() => {
                              setIsRenamingColumnId(c.id);
                              setRenameDraft(c.name);
                            }}
                            className="w-full text-left px-3 py-2 text-[13px] hover:bg-slate-50"
                          >
                            Rename
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setColumnToDelete(c);
                              setActiveColumnMenuId(null);
                            }}
                            className="w-full text-left px-3 py-2 text-[13px] text-red-600 hover:bg-red-50"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    )}
                  </th>
                ))}
                <th className="px-3 py-3 w-[56px] text-right">
                  <button
                    type="button"
                    onClick={handleAddColumn}
                    className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                    title="Add new field"
                  >
                    <Plus size={18} />
                  </button>
                </th>
              </tr>
            </thead>

            <tbody>
              {spacesLoading ? (
                <TaskHubTableSkeleton customColumnCount={columns.length} />
              ) : sortedTasks.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-slate-500" colSpan={7 + columns.length}>
                    No tasks yet.
                  </td>
                </tr>
              ) : (
                sortedTasks.map((t) => {
                  const canEdit = canEditTask(t);
                  const isLockedDoneRow = isTaskLocked(t);
                  return (
                  <tr key={t.taskId} className={getTaskRowClasses(t)}>
                    <td className="px-4 py-3">
                      <input
                        defaultValue={t.title}
                        onBlur={(e) => {
                          if (!canEdit || isLockedDoneRow) return;
                          const next = e.target.value.trim();
                          if (next && next !== t.title) patchTask(t.taskId, { title: next });
                        }}
                        disabled={!canEdit || isLockedDoneRow}
                        className="w-full bg-transparent border-none outline-none text-[14px] text-slate-900 font-medium disabled:text-slate-500"
                      />
                      <div className="text-[11px] text-slate-400 mt-1 space-y-0.5">
                        {t.projectId ? (
                          <div>
                            Project: {projectNameById.get(t.projectId) || t.projectId}
                          </div>
                        ) : null}
                        {((mode === 'manager') ||
                          (mode === 'employee' && t.createdByEmpId !== me.id)) &&
                          (t.createdByName || t.createdByEmpId) ? (
                          <div>
                            Created by: {t.createdByName || t.createdByEmpId}
                          </div>
                        ) : null}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      {(() => {
                        const options = assigneeOptionsForTask(t.assigneeId).map((opt) => {
                          if (opt.empId !== t.assigneeId || opt.empName) return opt;
                          return {
                            ...opt,
                            empName: t.assigneeName || '',
                          };
                        });
                        const selectOptions = [
                          { value: '', label: 'Unassigned' },
                          ...options.map((employee) => ({
                            value: employee.empId,
                            label:
                              employee.empId === me.id
                                ? `${employee.empName} (You)`
                                : employee.empName || 'Unknown User',
                          })),
                        ];
                        return (
                      <ThemedSelect
                        value={t.assigneeId || ''}
                        onChange={(value) =>
                          canEdit && !isLockedDoneRow && patchTask(t.taskId, { assigneeId: value })
                        }
                        options={selectOptions}
                        placeholder="Unassigned"
                        disabled={employeesLoading || !canEdit || isLockedDoneRow}
                        compact={true}
                      />
                        );
                      })()}
                    </td>

                    <td className="px-4 py-3">
                      <ThemedDatePicker
                        value={t.dueDate || ''}
                        onChange={(value) => canEditDueDate(t) && patchTask(t.taskId, { dueDate: value })}
                        disabled={!canEditDueDate(t)}
                        compact={true}
                      />
                    </td>

                    <td className="px-4 py-3">
                      <ThemedSelect
                        value={t.priority}
                        onChange={(value) =>
                          canEdit && !isLockedDoneRow && patchTask(t.taskId, { priority: value as TaskPriority })
                        }
                        options={priorityOptions}
                        disabled={!canEdit || isLockedDoneRow}
                        compact={true}
                      />
                    </td>

                    <td className="px-4 py-3">
                      <ThemedSelect
                        value={t.status}
                        onChange={(value) =>
                          canChangeStatus(t) &&
                          patchTask(t.taskId, { status: value as TaskStatus })
                        }
                        options={statusOptions}
                        disabled={!canChangeStatus(t)}
                        compact={true}
                      />
                    </td>

                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => {
                          if (!canCommentOnTask(t) || isLockedDoneRow) return;
                          setCommentTaskId(t.taskId);
                          setModalStatus(t.status);
                        }}
                        disabled={!canCommentOnTask(t) || isLockedDoneRow}
                        className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border bg-white text-slate-700 ${
                          canCommentOnTask(t) && !isLockedDoneRow
                            ? 'border-slate-200 hover:bg-slate-50'
                            : 'border-slate-100 opacity-60 cursor-not-allowed'
                        }`}
                        title="View comments"
                      >
                        <MessageSquareText size={16} />
                        <span className="text-[12px] font-semibold">{t.comments?.length || 0}</span>
                      </button>
                    </td>

                    {columns.map((c) => (
                      <td key={c.id} className="px-4 py-3">
                        <input
                          defaultValue={t.customFields?.[c.id] || ''}
                          onBlur={(e) => {
                            if (!canEdit || isLockedDoneRow) return;
                            const next = e.target.value;
                            const prevVal = t.customFields?.[c.id] || '';
                            if (next === prevVal) return;
                            const nextCustom = { ...(t.customFields || {}), [c.id]: next };
                            patchTask(t.taskId, { customFields: nextCustom });
                          }}
                          disabled={!canEdit || isLockedDoneRow}
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 pr-10 py-2 text-[13px] outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red disabled:bg-slate-50 disabled:text-slate-500"
                          placeholder="â€”"
                        />
                      </td>
                    ))}

                    <td className="px-3 py-3 text-right">
                      {(canEditTask(t) || canDeleteTask(t)) ? (
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTask(t);
                              setEditingTaskDraft({
                                title: t.title,
                                assigneeId: t.assigneeId || '',
                                dueDate: t.dueDate || '',
                                priority: t.priority,
                                status: t.status,
                              });
                            }}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-100"
                            title="View task"
                          >
                            <Eye size={14} />
                          </button>
                          {canEditTask(t) && (
                            <button
                              type="button"
                              onClick={() => {
                                if (!canEditTask(t) || isLockedDoneRow) return;
                                setEditingTask(t);
                                setEditingTaskDraft({
                                  title: t.title,
                                  assigneeId: t.assigneeId || '',
                                  dueDate: t.dueDate || '',
                                  priority: t.priority,
                                  status: t.status,
                                });
                              }}
                              disabled={isLockedDoneRow}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-60 disabled:cursor-not-allowed"
                              title="Edit task"
                            >
                              <Pencil size={14} />
                            </button>
                          )}
                          {canDeleteTask(t) && (
                            <button
                              type="button"
                              onClick={() => {
                                if (isLockedDoneRow) return;
                                setDeleteTaskModal(t);
                              }}
                              disabled={isLockedDoneRow}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-red-100 text-red-500 hover:bg-red-50 text-[18px] disabled:opacity-60 disabled:cursor-not-allowed"
                              title="Delete task"
                            >
                              <X size={14} strokeWidth={2} />
                            </button>
                          )}
                        </div>
                      ) : null}
                    </td>
                  </tr>
                )})
              )}
            </tbody>
          </table>
        </div>
      </div>

      {activeCommentTask && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => {
            setCommentTaskId(null);
            setCommentDraft('');
          }}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <div className="text-[13px] text-slate-500">Comments</div>
                <div className="text-lg font-bold text-slate-900">{activeCommentTask.title}</div>
              </div>
              <button
                type="button"
                className="w-10 h-10 rounded-full border border-slate-200 hover:bg-slate-50"
                onClick={() => {
                  setCommentTaskId(null);
                  setCommentDraft('');
                }}
              >
                <X size={14} strokeWidth={2} className="mx-auto text-slate-700" />
              </button>
            </div>

            <div className="p-6 space-y-3 overflow-auto max-h-[55vh]">
              {(activeCommentTask.comments || []).length === 0 ? (
                <div className="text-slate-500 text-sm">No comments yet.</div>
              ) : (
                activeCommentTask.comments
                  .slice()
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((c) => {
                    const canEditComment = c.fromEmpId === me.id;
                    const isEditing = editingCommentId === c.id;
                    return (
                    <div key={c.id} className="border border-slate-200 rounded-2xl bg-slate-50 px-4 py-3">
                      <div className="flex items-center justify-between gap-3 mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] font-semibold text-slate-700">
                            {c.fromName || c.fromEmpId || 'User'}
                          </span>
                          {c.editedAt && (
                            <span className="text-[10px] text-slate-400">(edited)</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-400">
                            {new Date(c.createdAt).toLocaleString()}
                          </span>
                          {canEditComment && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingCommentId(c.id);
                                  setEditCommentDraft(c.text);
                                }}
                                className="text-[11px] text-slate-500 hover:text-brand-red"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => setCommentToDeleteId(c.id)}
                                className="text-[11px] text-red-500 hover:text-red-600"
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      {isEditing ? (
                        <div className="mt-1 space-y-2">
                          <textarea
                            value={editCommentDraft}
                            onChange={(e) => setEditCommentDraft(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red"
                            rows={2}
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCommentId(null);
                                setEditCommentDraft('');
                              }}
                              className="px-3 py-1.5 rounded-full border border-slate-200 text-[12px] text-slate-600 hover:bg-slate-50"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              disabled={!editCommentDraft.trim()}
                              onClick={async () => {
                                const text = editCommentDraft.trim();
                                if (!text || !activeCommentTask) return;
                                try {
                                  const res = await fetch(
                                    `${API_BASE}/spaces/tasks/${activeCommentTask.taskId}/comments/${c.id}`,
                                    {
                                      method: 'PATCH',
                                      headers: getAuthHeaders(),
                                      body: JSON.stringify({ text }),
                                    },
                                  );
                                  const data = await res.json().catch(() => ({}));
                                  if (!res.ok) {
                                    throw new Error(data.message || 'Failed to update comment');
                                  }
                                  setTasks((prev) =>
                                    prev.map((t) =>
                                      t.taskId === activeCommentTask.taskId
                                        ? {
                                            ...t,
                                            comments: Array.isArray(data.comments)
                                              ? data.comments
                                              : [],
                                          }
                                        : t,
                                    ),
                                  );
                                  setEditingCommentId(null);
                                  setEditCommentDraft('');
                                } catch (e: any) {
                                  setError(e?.message || 'Failed to update comment');
                                }
                              }}
                              className={`px-4 py-1.5 rounded-full bg-brand-red text-white text-[12px] font-semibold hover:bg-brand-navy ${
                                !editCommentDraft.trim() ? 'opacity-60 cursor-not-allowed' : ''
                              }`}
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-[13px] text-slate-800 whitespace-pre-wrap">
                          {c.text}
                        </div>
                      )}
                    </div>
                  )})
              )}
            </div>

            <div className="p-6 border-t border-slate-100 space-y-3">
              {mode === 'employee' && (
                <div className="flex items-center gap-3">
                  <label className="text-[13px] font-semibold text-slate-700">
                    Status
                    <select
                      value={modalStatus}
                      onChange={(e) => setModalStatus(e.target.value as TaskStatus)}
                      className="ml-2 rounded-xl border border-slate-200 px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red bg-white"
                    >
                      <option value="todo">To Do</option>
                      <option value="doing">Doing</option>
                      <option value="review">Review</option>
                      <option value="done">Done</option>
                      <option value="blocked">Blocked</option>
                    </select>
                  </label>
                </div>
              )}
              <div className="flex gap-3">
                <input
                  value={commentDraft}
                  onChange={(e) => setCommentDraft(e.target.value)}
                  className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-[14px] outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red"
                  placeholder="Add a comment or task update..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddComment();
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddComment}
                  disabled={!commentDraft.trim()}
                  className={`px-6 py-3 rounded-2xl bg-brand-red text-white font-bold hover:bg-brand-navy transition-colors ${
                    !commentDraft.trim() ? 'opacity-60 cursor-not-allowed' : ''
                  }`}
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete column modal */}
      {columnToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Remove field</h3>
            <p className="text-[14px] text-slate-600 mb-6">
              Are you sure you want to remove &quot;{columnToDelete.name}&quot; from all tasks?
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setColumnToDelete(null)}
                className="px-4 py-2 rounded-full border border-slate-200 text-[13px] text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!columnToDelete) return;
                  try {
                    const res = await fetch(
                      `${API_BASE}/spaces/columns/${columnToDelete.id}`,
                      {
                        method: 'DELETE',
                        headers: getAuthHeaders(),
                      },
                    );
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) {
                      throw new Error(data.message || 'Failed to remove field');
                    }
                    setColumns(Array.isArray(data.columns) ? data.columns : []);
                    const newTasks = sortedTasks.map((t) => {
                      const { [columnToDelete.id]: _omit, ...rest } = t.customFields || {};
                      return { ...t, customFields: rest };
                    });
                    setTasks(newTasks);
                  } catch (e: any) {
                    setError(e?.message || 'Failed to remove field');
                  } finally {
                    setColumnToDelete(null);
                  }
                }}
                className="px-5 py-2 rounded-full bg-brand-red text-white text-[13px] font-semibold hover:bg-brand-navy"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete comment modal */}
      {activeCommentTask && commentToDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Delete comment</h3>
            <p className="text-[14px] text-slate-600 mb-6">
              Are you sure you want to delete this comment?
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setCommentToDeleteId(null)}
                className="px-4 py-2 rounded-full border border-slate-200 text-[13px] text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!activeCommentTask || !commentToDeleteId) return;
                  try {
                    const res = await fetch(
                      `${API_BASE}/spaces/tasks/${activeCommentTask.taskId}/comments/${commentToDeleteId}`,
                      {
                        method: 'DELETE',
                        headers: getAuthHeaders(),
                      },
                    );
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) {
                      throw new Error(data.message || 'Failed to delete comment');
                    }
                    setTasks((prev) =>
                      prev.map((t) =>
                        t.taskId === activeCommentTask.taskId
                          ? { ...t, comments: Array.isArray(data.comments) ? data.comments : [] }
                          : t,
                      ),
                    );
                  } catch (e: any) {
                    setError(e?.message || 'Failed to delete comment');
                  } finally {
                    setCommentToDeleteId(null);
                  }
                }}
                className="px-5 py-2 rounded-full bg-brand-red text-white text-[13px] font-semibold hover:bg-brand-navy"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete task modal */}
      {deleteTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Delete task</h3>
            <p className="text-[14px] text-slate-600 mb-6">
              Are you sure you want to delete &quot;{deleteTaskModal.title}&quot;?
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTaskModal(null)}
                className="px-4 py-2 rounded-full border border-slate-200 text-[13px] text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const res = await fetch(`${API_BASE}/spaces/tasks/${deleteTaskModal.taskId}`, {
                      method: 'DELETE',
                      headers: getAuthHeaders(),
                    });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) {
                      throw new Error(data.message || 'Failed to delete task');
                    }
                    setTasks((prev) => prev.filter((x) => x.taskId !== deleteTaskModal.taskId));
                  } catch (e: any) {
                    setError(e?.message || 'Failed to delete task');
                  } finally {
                    setDeleteTaskModal(null);
                  }
                }}
                className="px-5 py-2 rounded-full bg-brand-red text-white text-[13px] font-semibold hover:bg-brand-navy"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Edit task</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-[13px] font-semibold text-slate-700 mb-1">
                  Title
                </label>
                <input
                  value={editingTaskDraft.title || ''}
                  onChange={(e) =>
                    setEditingTaskDraft((prev) => ({ ...prev, title: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[14px] outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 mb-1">
                    Assignee
                  </label>
                  <select
                    value={editingTaskDraft.assigneeId || ''}
                    onChange={(e) =>
                      setEditingTaskDraft((prev) => ({ ...prev, assigneeId: e.target.value }))
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[14px] outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red bg-white"
                  >
                    <option value="">Unassigned</option>
                    {assignableEmployees.map((e) => (
                      <option key={e.empId} value={e.empId}>
                        {e.empId === me.id ? `${e.empName} (You)` : e.empName || 'Unknown User'}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 mb-1">
                    Due date
                  </label>
                  <ThemedDatePicker
                    value={editingTaskDraft.dueDate || ''}
                    onChange={(value) =>
                      setEditingTaskDraft((prev) => ({ ...prev, dueDate: value }))
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={editingTaskDraft.priority || 'medium'}
                    onChange={(e) =>
                      setEditingTaskDraft((prev) => ({
                        ...prev,
                        priority: e.target.value as TaskPriority,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[14px] outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red bg-white"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 mb-1">
                    Status
                  </label>
                  <select
                    value={editingTaskDraft.status || 'todo'}
                    onChange={(e) =>
                      setEditingTaskDraft((prev) => ({
                        ...prev,
                        status: e.target.value as TaskStatus,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[14px] outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red bg-white"
                  >
                    <option value="todo">To Do</option>
                    <option value="doing">Doing</option>
                    <option value="review">Review</option>
                    <option value="done">Done</option>
                    <option value="blocked">Blocked</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setEditingTask(null);
                  setEditingTaskDraft({});
                }}
                className="px-4 py-2 rounded-full border border-slate-200 text-[13px] text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!editingTaskDraft.title || !editingTaskDraft.title.trim()}
                onClick={async () => {
                  if (!editingTask) return;
                  const updates: Partial<SpacesTask> = {
                    title: editingTaskDraft.title?.trim() || editingTask.title,
                    assigneeId: editingTaskDraft.assigneeId || '',
                    dueDate: editingTaskDraft.dueDate || '',
                    priority: (editingTaskDraft.priority || editingTask.priority) as TaskPriority,
                    status: (editingTaskDraft.status || editingTask.status) as TaskStatus,
                  };
                  await patchTask(editingTask.taskId, updates);
                  setEditingTask(null);
                  setEditingTaskDraft({});
                }}
                className={`px-5 py-2 rounded-full bg-brand-red text-white text-[13px] font-semibold hover:bg-brand-navy ${
                  !editingTaskDraft.title || !editingTaskDraft.title.trim()
                    ? 'opacity-60 cursor-not-allowed'
                    : ''
                }`}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpacesView;


