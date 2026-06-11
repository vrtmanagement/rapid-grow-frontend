import React, { useEffect, useMemo, useState } from 'react';
import { Pencil, Trash2, X, Check, UserPlus } from 'lucide-react';
import ConfirmDialog from '../ui/ConfirmDialog';
import {
  StrategyCalendarEvent,
  StrategyEmployeeOption,
  StrategyWhoAssignee,
  StrategyWhoRole,
  MONTH_NAMES,
} from '../../services/strategyExecutionApi';
import { getNextNoteNumber, parseNumberedNotes } from './strategyExecutionNotes';

interface StrategyMonthDetailProps {
  event: StrategyCalendarEvent | null;
  canManage: boolean;
  draftPurpose: string;
  draftOutcome: string;
  draftWhoAssignees: StrategyWhoAssignee[];
  onPurposeChange: (value: string) => void;
  onOutcomeChange: (value: string) => void;
  onWhoAssigneesChange: (assignees: StrategyWhoAssignee[]) => void;
  onSaveDetails: () => void;
  detailsDirty: boolean;
  employees: StrategyEmployeeOption[];
  savedNotes: string;
  draftNote: string;
  onDraftNoteChange: (note: string) => void;
  onSaveNotes: () => void;
  onEditNote: (noteNumber: number, newBody: string) => void;
  onDeleteNote: (noteNumber: number) => void | Promise<void>;
  saving: boolean;
}

const ROLE_LABELS: Record<StrategyWhoRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  TEAM_LEAD: 'Team Lead',
  EMPLOYEE: 'Employee',
};

function roleBadgeClass(role: StrategyWhoRole) {
  if (role === 'TEAM_LEAD') {
    return 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300';
  }
  if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
    return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300';
  }
  return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200';
}

const StrategyMonthDetail: React.FC<StrategyMonthDetailProps> = ({
  event,
  canManage,
  draftPurpose,
  draftOutcome,
  draftWhoAssignees,
  onPurposeChange,
  onOutcomeChange,
  onWhoAssigneesChange,
  onSaveDetails,
  detailsDirty,
  employees,
  savedNotes,
  draftNote,
  onDraftNoteChange,
  onSaveNotes,
  onEditNote,
  onDeleteNote,
  saving,
}) => {
  const [editingNoteNumber, setEditingNoteNumber] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [pendingDeleteNoteNumber, setPendingDeleteNoteNumber] = useState<number | null>(null);
  const [addPersonId, setAddPersonId] = useState('');

  useEffect(() => {
    setEditingNoteNumber(null);
    setEditDraft('');
    setPendingDeleteNoteNumber(null);
    setAddPersonId('');
  }, [event?.month, savedNotes]);

  const availableEmployees = useMemo(() => {
    const assignedIds = new Set(draftWhoAssignees.map((item) => item.empId));
    return employees.filter((employee) => !assignedIds.has(employee.empId));
  }, [employees, draftWhoAssignees]);

  const teamLeads = availableEmployees.filter((employee) => employee.role === 'TEAM_LEAD');
  const admins = availableEmployees.filter(
    (employee) => employee.role === 'ADMIN' || employee.role === 'SUPER_ADMIN'
  );
  const staff = availableEmployees.filter((employee) => employee.role === 'EMPLOYEE');

  if (!event) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700">
        Select a month to view purpose, outcome, and accountability.
      </div>
    );
  }

  const notesSource = savedNotes || event.notes || '';
  const numberedNotes = parseNumberedNotes(notesSource);
  const nextNoteNumber = getNextNoteNumber(notesSource);
  const legacyWhoText =
    draftWhoAssignees.length === 0 && event.who ? event.who : '';

  const startEdit = (noteNumber: number, body: string) => {
    setEditingNoteNumber(noteNumber);
    setEditDraft(body);
  };

  const cancelEdit = () => {
    setEditingNoteNumber(null);
    setEditDraft('');
  };

  const saveEdit = () => {
    if (editingNoteNumber === null || !editDraft.trim()) return;
    onEditNote(editingNoteNumber, editDraft);
    cancelEdit();
  };

  const confirmDelete = async () => {
    if (pendingDeleteNoteNumber === null) return;
    const noteNumber = pendingDeleteNoteNumber;
    if (editingNoteNumber === noteNumber) cancelEdit();
    await onDeleteNote(noteNumber);
    setPendingDeleteNoteNumber(null);
  };

  const handleAddPerson = () => {
    if (!addPersonId) return;
    const employee = employees.find((item) => item.empId === addPersonId);
    if (!employee) return;
    onWhoAssigneesChange([
      ...draftWhoAssignees,
      { empId: employee.empId, name: employee.name, role: employee.role },
    ]);
    setAddPersonId('');
  };

  const handleRemoveAssignee = (empId: string) => {
    onWhoAssigneesChange(draftWhoAssignees.filter((item) => item.empId !== empId));
  };

  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
        <p className="text-xs font-bold uppercase tracking-widest text-brand-red">
          {MONTH_NAMES[event.month - 1]} · Phase {event.phase}
        </p>
        <h3 className="mt-1 text-base font-bold leading-snug text-slate-900 break-words dark:text-white sm:text-lg">
          {event.title}
        </h3>
      </div>
      <div className="flex flex-col gap-3 p-5">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 dark:border-emerald-900 dark:bg-emerald-950/20">
          <p className="mb-2 text-xs font-bold uppercase text-emerald-700 dark:text-emerald-400">Purpose</p>
          {canManage ? (
            <textarea
              className="w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm leading-relaxed text-slate-700 dark:border-emerald-800 dark:bg-slate-900 dark:text-slate-300"
              rows={4}
              value={draftPurpose}
              onChange={(e) => onPurposeChange(e.target.value)}
              disabled={saving}
              placeholder="Describe why this month's work matters…"
            />
          ) : (
            <p className="text-sm leading-relaxed text-slate-700 break-words whitespace-pre-wrap dark:text-slate-300">
              {event.purpose || '—'}
            </p>
          )}
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50/80 p-4 dark:border-red-900 dark:bg-red-950/20">
          <p className="mb-2 text-xs font-bold uppercase text-red-700 dark:text-red-400">Outcome</p>
          {canManage ? (
            <textarea
              className="w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm leading-relaxed text-slate-700 dark:border-red-800 dark:bg-slate-900 dark:text-slate-300"
              rows={4}
              value={draftOutcome}
              onChange={(e) => onOutcomeChange(e.target.value)}
              disabled={saving}
              placeholder="What should be achieved by month end…"
            />
          ) : (
            <p className="text-sm leading-relaxed text-slate-700 break-words whitespace-pre-wrap dark:text-slate-300">
              {event.outcome || '—'}
            </p>
          )}
        </div>
        <div className="rounded-xl border border-violet-200 bg-violet-50/80 p-4 dark:border-violet-900 dark:bg-violet-950/20">
          <p className="mb-2 text-xs font-bold uppercase text-violet-700 dark:text-violet-400">Who</p>
          {draftWhoAssignees.length > 0 ? (
            <ul className="mb-3 flex flex-wrap gap-2">
              {draftWhoAssignees.map((assignee) => (
                <li
                  key={assignee.empId || assignee.name}
                  className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-white px-2.5 py-1 text-sm dark:border-violet-800 dark:bg-slate-900"
                >
                  <span className="font-medium text-slate-800 dark:text-slate-200">{assignee.name}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${roleBadgeClass(assignee.role)}`}
                  >
                    {ROLE_LABELS[assignee.role] || assignee.role}
                  </span>
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => handleRemoveAssignee(assignee.empId)}
                      disabled={saving}
                      className="rounded-full p-0.5 text-slate-400 transition-colors hover:bg-violet-100 hover:text-red-600 dark:hover:bg-violet-900/40"
                      aria-label={`Remove ${assignee.name}`}
                    >
                      <X size={14} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          ) : legacyWhoText ? (
            <p className="mb-3 text-sm leading-relaxed text-slate-700 break-words whitespace-pre-wrap dark:text-slate-300">
              {legacyWhoText}
            </p>
          ) : (
            <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">No team members assigned yet.</p>
          )}
          {canManage && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative min-w-0 flex-1">
                <select
                  className="w-full appearance-none rounded-lg border border-violet-200 bg-white px-3 py-2 pr-9 text-sm dark:border-violet-800 dark:bg-slate-900"
                  value={addPersonId}
                  onChange={(e) => setAddPersonId(e.target.value)}
                  disabled={saving || availableEmployees.length === 0}
                >
                  <option value="">
                    {availableEmployees.length === 0 ? 'All team members added' : 'Add team lead or employee…'}
                  </option>
                  {teamLeads.length > 0 && (
                    <optgroup label="Team Leads">
                      {teamLeads.map((employee) => (
                        <option key={employee.empId} value={employee.empId}>
                          {employee.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {admins.length > 0 && (
                    <optgroup label="Admins">
                      {admins.map((employee) => (
                        <option key={employee.empId} value={employee.empId}>
                          {employee.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {staff.length > 0 && (
                    <optgroup label="Employees">
                      {staff.map((employee) => (
                        <option key={employee.empId} value={employee.empId}>
                          {employee.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                <UserPlus
                  size={16}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-violet-500"
                />
              </div>
              <button
                type="button"
                onClick={handleAddPerson}
                disabled={saving || !addPersonId}
                className="shrink-0 rounded-lg border border-violet-300 bg-white px-3 py-2 text-xs font-semibold text-violet-700 transition-colors hover:bg-violet-50 disabled:opacity-60 dark:border-violet-700 dark:bg-slate-900 dark:text-violet-300 dark:hover:bg-violet-950/40"
              >
                Add person
              </button>
            </div>
          )}
        </div>
        {canManage && detailsDirty && (
          <button
            type="button"
            disabled={saving}
            onClick={onSaveDetails}
            className="rounded-lg bg-brand-red px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save month details'}
          </button>
        )}
      </div>
      <div className="border-t border-slate-100 px-5 py-4 dark:border-slate-800">
        <label className="mb-2 block text-xs font-bold uppercase text-slate-500">Execution notes</label>
        {numberedNotes.length > 0 && (
          <ul className="mb-4 space-y-2">
            {numberedNotes.map((note) => {
              const isEditing = editingNoteNumber === note.number;
              return (
                <li
                  key={`note-${note.number}`}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800/60"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-bold text-brand-red">Note {note.number}</p>
                    {canManage && !isEditing && (
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => startEdit(note.number, note.body)}
                          disabled={saving}
                          className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-white hover:text-brand-red dark:hover:bg-slate-700"
                          aria-label={`Edit note ${note.number}`}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingDeleteNoteNumber(note.number)}
                          disabled={saving}
                          className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-white hover:text-red-600 dark:hover:bg-slate-700"
                          aria-label={`Delete note ${note.number}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                  {isEditing ? (
                    <div className="mt-2 space-y-2">
                      <textarea
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
                        rows={3}
                        value={editDraft}
                        onChange={(e) => setEditDraft(e.target.value)}
                        disabled={saving}
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={saveEdit}
                          disabled={saving || !editDraft.trim()}
                          className="inline-flex items-center gap-1 rounded-lg bg-brand-red px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                        >
                          <Check size={14} />
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          disabled={saving}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:border-slate-600 dark:text-slate-300"
                        >
                          <X size={14} />
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-1 text-sm leading-relaxed text-slate-700 whitespace-pre-wrap break-words dark:text-slate-300">
                      {note.body}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {canManage ? (
          <div className="space-y-2">
            <textarea
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              rows={4}
              value={draftNote}
              onChange={(e) => onDraftNoteChange(e.target.value)}
              disabled={saving || editingNoteNumber !== null}
              placeholder={
                numberedNotes.length
                  ? `Add note ${nextNoteNumber}…`
                  : 'Add note 1 — capture decisions, risks, and follow-ups…'
              }
            />
            <button
              type="button"
              disabled={saving || !draftNote.trim() || editingNoteNumber !== null}
              onClick={onSaveNotes}
              className="rounded-lg bg-brand-red px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving ? 'Saving…' : `Save note ${nextNoteNumber}`}
            </button>
          </div>
        ) : numberedNotes.length === 0 ? (
          <p className="text-sm text-slate-600 dark:text-slate-400">No notes yet.</p>
        ) : null}
      </div>

      {pendingDeleteNoteNumber !== null && (
        <ConfirmDialog
          title={`Delete Note ${pendingDeleteNoteNumber}?`}
          description="This note will be permanently removed. This action cannot be undone."
          confirmLabel={saving ? 'Deleting…' : 'Yes'}
          cancelLabel="No"
          disabled={saving}
          onCancel={() => setPendingDeleteNoteNumber(null)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
};

export default StrategyMonthDetail;
