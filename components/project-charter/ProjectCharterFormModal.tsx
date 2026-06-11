import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BarChart3, Clock3, FileText, Plus, Target, Trash2, Users, X } from 'lucide-react';
import { ProjectTeamMember } from '../../types';
import {
  PROJECT_REVIEW_PHASES,
  PROJECT_TEAM_ROLE_OPTIONS,
  ProjectFormState,
} from './projectCharterUtils';

function getPhaseNumberFromKey(key: string): number {
  return Number.parseInt(key.replace('phase', ''), 10);
}

function deriveVisiblePhaseKeys(phases: ProjectFormState['phases'], mode: 'create' | 'edit'): string[] {
  const defaultKeys = PROJECT_REVIEW_PHASES.map((phase) => phase.key);
  const savedKeys = Object.keys(phases || {}).sort((left, right) => getPhaseNumberFromKey(left) - getPhaseNumberFromKey(right));

  if (mode === 'create') {
    const extraKeys = savedKeys.filter((key) => !defaultKeys.includes(key));
    return [...defaultKeys, ...extraKeys];
  }

  return savedKeys;
}

interface ProjectCharterFormModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  initialState: ProjectFormState;
  employees: ProjectTeamMember[];
  onClose: () => void;
  onSubmit: (form: ProjectFormState) => Promise<void> | void;
}

const ProjectCharterFormModal: React.FC<ProjectCharterFormModalProps> = ({
  isOpen,
  mode,
  initialState,
  employees,
  onClose,
  onSubmit,
}) => {
  const [form, setForm] = useState<ProjectFormState>(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');
  const [visiblePhaseKeys, setVisiblePhaseKeys] = useState<string[]>(() => deriveVisiblePhaseKeys(initialState.phases, mode));
  const timelineTextareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  useEffect(() => {
    if (isOpen) {
      setForm(initialState);
      setValidationMessage('');
      setVisiblePhaseKeys(deriveVisiblePhaseKeys(initialState.phases, mode));
    }
  }, [initialState, isOpen, mode]);

  const employeeOptions = useMemo(
    () =>
      employees
        .map((employee) => ({
          id: employee.id,
          name: employee.name,
        }))
        .sort((left, right) => left.name.localeCompare(right.name)),
    [employees],
  );

  const phaseRows = useMemo(() => {
    return visiblePhaseKeys.map((key) => {
      const defaultPhase = PROJECT_REVIEW_PHASES.find((phase) => phase.key === key);
      if (defaultPhase) return defaultPhase;

      return {
        key,
        label: `Phase ${getPhaseNumberFromKey(key)}`,
        defaultValue: '',
      };
    });
  }, [visiblePhaseKeys]);

  const resizeTimelineTextarea = (phaseKey: string) => {
    const textarea = timelineTextareaRefs.current[phaseKey];
    if (!textarea) return;
    textarea.style.height = '0px';
    textarea.style.height = `${textarea.scrollHeight}px`;
  };

  useEffect(() => {
    phaseRows.forEach((phase) => resizeTimelineTextarea(phase.key));
  }, [form.phases, phaseRows]);

  const validate = () => {
    if (!form.teamMembers.some((member) => member.role === 'Project Lead' && member.name.trim())) {
      return 'Add a Project Lead before saving.';
    }
    if (form.startDate && form.endDate && form.startDate > form.endDate) {
      return 'End date must be after the start date.';
    }
    return '';
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextMessage = validate();
    setValidationMessage(nextMessage);
    if (nextMessage) return;

    setSubmitting(true);
    try {
      await onSubmit(form);
    } finally {
      setSubmitting(false);
    }
  };

  const updateTeamMember = (
    rowId: string,
    updater: (member: ProjectFormState['teamMembers'][number]) => ProjectFormState['teamMembers'][number],
  ) => {
    setForm((prev) => ({
      ...prev,
      teamMembers: prev.teamMembers.map((member) => (member.rowId === rowId ? updater(member) : member)),
    }));
  };

  const handleMemberNameChange = (rowId: string, value: string) => {
    const matchedEmployee = employeeOptions.find(
      (employee) => employee.name.trim().toLowerCase() === value.trim().toLowerCase(),
    );

    updateTeamMember(rowId, (member) => ({
      ...member,
      name: value,
      memberId: matchedEmployee?.id || '',
    }));
  };

  const addTeamMember = () => {
    setForm((prev) => ({
      ...prev,
      teamMembers: [
        ...prev.teamMembers,
        {
          rowId:
            typeof crypto !== 'undefined' && 'randomUUID' in crypto
              ? crypto.randomUUID()
              : `team-row-${Date.now()}`,
          role: 'Team Member',
          memberId: '',
          name: '',
        },
      ],
    }));
  };

  const removeTeamMember = (rowId: string) => {
    setForm((prev) => ({
      ...prev,
      teamMembers: prev.teamMembers.filter((member) => member.rowId !== rowId),
    }));
  };

  const addTimelinePhase = () => {
    const nextPhaseNumber = Math.max(
      ...visiblePhaseKeys.map((key) => getPhaseNumberFromKey(key)).filter((value) => Number.isFinite(value)),
      -1,
    ) + 1;
    const nextKey = `phase${nextPhaseNumber}`;

    setVisiblePhaseKeys((prev) => [...prev, nextKey]);
    setForm((prev) => ({
      ...prev,
      phases: {
        ...prev.phases,
        [nextKey]: '',
      },
    }));
  };

  const removeTimelinePhase = (phaseKey: string) => {
    setVisiblePhaseKeys((prev) => prev.filter((key) => key !== phaseKey));
    setForm((prev) => {
      const nextPhases = { ...(prev.phases || {}) };
      delete nextPhases[phaseKey];
      return {
        ...prev,
        phases: nextPhases,
      };
    });
    delete timelineTextareaRefs.current[phaseKey];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm">
      <div className="max-h-[94vh] w-full max-w-[1520px] overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_28px_80px_rgba(15,23,42,0.22)]">
        <div className="flex items-start justify-between border-b border-slate-200 px-7 py-5">
          <div>
            <p className="text-[0.8rem] font-semibold uppercase tracking-[0.28em] text-brand-red">
              {mode === 'create' ? 'New Project Charter' : 'Project Charter'}
            </p>
            <h2 className="mt-2 text-[2.2rem] font-semibold leading-none text-slate-950">
              {mode === 'create' ? 'Create Project Charter' : 'Update Project Charter'}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50"
            aria-label="Close"
          >
            <X size={22} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[calc(94vh-104px)] overflow-y-auto px-7 py-6">
          <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
            <div className="space-y-4">
              <section className="rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-[0_8px_28px_rgba(15,23,42,0.04)]">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-brand-red/10 text-brand-red">
                    <FileText size={18} />
                  </div>
                  <h3 className="text-[1.15rem] font-semibold text-slate-950">Business Case</h3>
                </div>

                <div className="mt-5 space-y-4">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-600">Project Name</span>
                    <input
                      value={form.name}
                      onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                      placeholder="Enter project name..."
                      className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-brand-red focus:ring-2 focus:ring-brand-red/10"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-600">Problem / Opportunity Statement</span>
                    <textarea
                      value={form.problemStatement}
                      onChange={(event) => setForm((prev) => ({ ...prev, problemStatement: event.target.value }))}
                      placeholder="Enter problem or opportunity statement..."
                      className="min-h-[84px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-brand-red focus:ring-2 focus:ring-brand-red/10"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-600">Objective</span>
                    <textarea
                      value={form.goalStatement}
                      onChange={(event) => setForm((prev) => ({ ...prev, goalStatement: event.target.value }))}
                      placeholder="Enter objective..."
                      className="min-h-[84px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-brand-red focus:ring-2 focus:ring-brand-red/10"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-600">Key Results</span>
                    <textarea
                      value={form.keyResults}
                      onChange={(event) => setForm((prev) => ({ ...prev, keyResults: event.target.value }))}
                      placeholder="Enter key results..."
                      className="min-h-[84px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-brand-red focus:ring-2 focus:ring-brand-red/10"
                    />
                  </label>
                </div>
              </section>

              <section className="rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-[0_8px_28px_rgba(15,23,42,0.04)]">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-brand-red/10 text-brand-red">
                    <Target size={18} />
                  </div>
                  <h3 className="text-[1.15rem] font-semibold text-slate-950">Project Scope</h3>
                </div>

                <div className="mt-5 space-y-4">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-600">In Scope</span>
                    <textarea
                      value={form.inScope}
                      onChange={(event) => setForm((prev) => ({ ...prev, inScope: event.target.value }))}
                      placeholder="Enter in scope items..."
                      className="min-h-[70px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-brand-red focus:ring-2 focus:ring-brand-red/10"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-600">Out of Scope</span>
                    <textarea
                      value={form.outOfScope}
                      onChange={(event) => setForm((prev) => ({ ...prev, outOfScope: event.target.value }))}
                      placeholder="Enter out of scope items..."
                      className="min-h-[70px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-brand-red focus:ring-2 focus:ring-brand-red/10"
                    />
                  </label>
                </div>
              </section>

              <section className="rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-[0_8px_28px_rgba(15,23,42,0.04)]">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-brand-red/10 text-brand-red">
                    <BarChart3 size={18} />
                  </div>
                  <h3 className="text-[1.15rem] font-semibold text-slate-950">Project Benefits / Revenue</h3>
                </div>

                <label className="mt-5 block">
                  <textarea
                    value={form.benefits}
                    onChange={(event) => setForm((prev) => ({ ...prev, benefits: event.target.value }))}
                    placeholder="Enter project benefits or revenue..."
                    className="min-h-[74px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-brand-red focus:ring-2 focus:ring-brand-red/10"
                  />
                </label>
              </section>
            </div>

            <div className="space-y-4">
              <section className="rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-[0_8px_28px_rgba(15,23,42,0.04)]">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-brand-red/10 text-brand-red">
                    <Users size={18} />
                  </div>
                  <div>
                    <h3 className="text-[1.15rem] font-semibold text-slate-950">Project Team</h3>
                    <p className="text-sm text-slate-500">Add key team members and their roles</p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-[1fr_1fr_32px] items-center gap-3 px-1 text-sm font-medium text-slate-700">
                  <span>Role</span>
                  <span>Name</span>
                  <span />
                </div>

                <div className="mt-3 space-y-2.5">
                  {form.teamMembers.map((member) => (
                    <div key={member.rowId} className="grid grid-cols-[1fr_1fr_32px] items-center gap-3">
                      <select
                        value={member.role}
                        onChange={(event) =>
                          updateTeamMember(member.rowId, (current) => ({
                            ...current,
                            role: event.target.value,
                          }))
                        }
                        className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition-all focus:border-brand-red focus:ring-2 focus:ring-brand-red/10"
                      >
                        {PROJECT_TEAM_ROLE_OPTIONS.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>

                      <input
                        value={member.name}
                        onChange={(event) => handleMemberNameChange(member.rowId, event.target.value)}
                        placeholder="Enter team member name"
                        list="project-charter-employee-options"
                        className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-brand-red focus:ring-2 focus:ring-brand-red/10"
                      />

                      <button
                        type="button"
                        onClick={() => removeTeamMember(member.rowId)}
                        className="flex h-9 w-9 items-center justify-center rounded-xl text-brand-red transition-colors hover:bg-brand-red/10"
                        aria-label="Remove team member"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addTeamMember}
                  className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand-red transition-colors hover:text-red-700"
                >
                  <Plus size={16} />
                  Add team member
                </button>
              </section>

              <section className="rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-[0_8px_28px_rgba(15,23,42,0.04)]">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-brand-red/10 text-brand-red">
                    <Clock3 size={18} />
                  </div>
                  <h3 className="text-[1.15rem] font-semibold text-slate-950">Project Review Timeline</h3>
                </div>

                <div className="mt-5 overflow-hidden rounded-[1.3rem] border border-slate-200">
                  {phaseRows.map((phase, index) => (
                    <div
                      key={phase.key}
                      className={`grid grid-cols-[88px_minmax(0,1fr)_32px] items-start gap-3 bg-white px-4 py-2 ${
                        index === phaseRows.length - 1 ? '' : 'border-b border-slate-200'
                      }`}
                    >
                      <span className="pt-1.5 text-sm font-semibold text-brand-red">{phase.label}:</span>
                      <textarea
                        ref={(element) => {
                          timelineTextareaRefs.current[phase.key] = element;
                        }}
                        value={form.phases[phase.key] || ''}
                        placeholder={phase.defaultValue}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            phases: {
                              ...prev.phases,
                              [phase.key]: event.target.value,
                            },
                          }))
                        }
                        onInput={() => resizeTimelineTextarea(phase.key)}
                        rows={1}
                        className="min-h-[32px] w-full resize-none overflow-hidden border-none bg-transparent px-0 py-0.5 text-sm leading-5 text-slate-700 outline-none placeholder:text-slate-400"
                      />
                      <button
                        type="button"
                        onClick={() => removeTimelinePhase(phase.key)}
                        className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl text-brand-red transition-colors hover:bg-brand-red/10"
                        aria-label={`Remove ${phase.label}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addTimelinePhase}
                  className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand-red transition-colors hover:text-red-700"
                >
                  <Plus size={16} />
                  Add phase
                </button>
              </section>
            </div>
          </div>

          <datalist id="project-charter-employee-options">
            {employeeOptions.map((employee) => (
              <option key={employee.id} value={employee.name} />
            ))}
          </datalist>

          {validationMessage ? (
            <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {validationMessage}
            </div>
          ) : null}

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-brand-red px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(239,68,68,0.2)] transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? 'Saving...' : 'Save Charter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProjectCharterFormModal;
