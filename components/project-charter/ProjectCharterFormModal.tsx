import React, { useEffect, useMemo, useState } from 'react';
import { Plus, UserRound, UsersRound, X } from 'lucide-react';
import { ProjectTeamMember } from '../../types';
import { PROJECT_PRIORITY_OPTIONS, PROJECT_STATUS_OPTIONS, ProjectFormState } from './projectCharterUtils';

interface ProjectCharterFormModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  initialState: ProjectFormState;
  employees: ProjectTeamMember[];
  onClose: () => void;
  onSubmit: (form: ProjectFormState) => Promise<void> | void;
}

const DEFAULT_LEAD_ROLE = 'Team Lead';

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
  const [nextLeadId, setNextLeadId] = useState('');

  useEffect(() => {
    if (isOpen) {
      setForm(initialState);
      setValidationMessage('');
      setNextLeadId('');
    }
  }, [isOpen]);

  const selectedLeadIds = useMemo(() => new Set(form.teamLeads.map((lead) => lead.leadId)), [form.teamLeads]);

  const leadPickerOptions = employees.filter(
    (employee) => employee.id !== form.projectManagerId && !selectedLeadIds.has(employee.id),
  );

  const validate = () => {
    if (!form.name.trim()) return 'Project name is required.';
    if (!form.description.trim()) return 'Project description is required.';
    if (!form.projectManagerId) return 'Assign one project manager before saving.';
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-red">
              {mode === 'create' ? 'New Charter' : 'Edit Charter'}
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-950">
              {mode === 'create' ? 'Create project charter' : 'Update project charter'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition-colors hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[calc(92vh-81px)] overflow-y-auto p-6">
          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <section className="space-y-6">
              <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50/80 p-6">
                <h3 className="text-lg font-semibold text-slate-950">Project Overview</h3>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <label className="md:col-span-2">
                    <span className="mb-2 block text-sm font-medium text-slate-700">Project Name</span>
                    <input
                      value={form.name}
                      onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all focus:border-brand-red focus:ring-2 focus:ring-brand-red/10"
                      placeholder="Launch website replatform"
                    />
                  </label>

                  <label className="md:col-span-2">
                    <span className="mb-2 block text-sm font-medium text-slate-700">Description</span>
                    <textarea
                      value={form.description}
                      onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                      className="min-h-[120px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all focus:border-brand-red focus:ring-2 focus:ring-brand-red/10"
                      placeholder="What is this project solving, who owns it, and how will success be measured?"
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-medium text-slate-700">Start Date</span>
                    <input
                      type="date"
                      value={form.startDate}
                      onChange={(event) => setForm((prev) => ({ ...prev, startDate: event.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all focus:border-brand-red focus:ring-2 focus:ring-brand-red/10"
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-medium text-slate-700">End Date</span>
                    <input
                      type="date"
                      value={form.endDate}
                      onChange={(event) => setForm((prev) => ({ ...prev, endDate: event.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all focus:border-brand-red focus:ring-2 focus:ring-brand-red/10"
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-medium text-slate-700">Status</span>
                    <select
                      value={form.status}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          status: event.target.value as ProjectFormState['status'],
                        }))
                      }
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all focus:border-brand-red focus:ring-2 focus:ring-brand-red/10"
                    >
                      {PROJECT_STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-medium text-slate-700">Priority</span>
                    <select
                      value={form.priority}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          priority: event.target.value as ProjectFormState['priority'],
                        }))
                      }
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all focus:border-brand-red focus:ring-2 focus:ring-brand-red/10"
                    >
                      {PROJECT_PRIORITY_OPTIONS.map((priority) => (
                        <option key={priority} value={priority}>
                          {priority}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            </section>

            <section className="space-y-6">
              <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50/80 p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-red/10 text-brand-red">
                    <UserRound size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-950">Project Manager</h3>
                    <p className="text-sm text-slate-500">Assign one accountable owner for this charter.</p>
                  </div>
                </div>

                <select
                  value={form.projectManagerId}
                  onChange={(event) => setForm((prev) => ({ ...prev, projectManagerId: event.target.value }))}
                  className="mt-5 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all focus:border-brand-red focus:ring-2 focus:ring-brand-red/10"
                >
                  <option value="">Select a project manager</option>
                  {employees.map((employee) => (
                    <option key={`pm-${employee.id}`} value={employee.id}>
                      {employee.name} - {employee.role}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50/80 p-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
                      <UsersRound size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-950">Lead Pods</h3>
                      <p className="text-sm text-slate-500">Team leads own workstreams and members roll up beneath them.</p>
                    </div>
                  </div>

                  {leadPickerOptions.length > 0 ? (
                    <div className="flex items-center gap-3">
                      <select
                        value={nextLeadId}
                        onChange={(event) => setNextLeadId(event.target.value)}
                        className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-all focus:border-brand-red focus:ring-2 focus:ring-brand-red/10"
                      >
                        <option value="">Select lead</option>
                        {leadPickerOptions.map((employee) => (
                          <option key={`lead-option-${employee.id}`} value={employee.id}>
                            {employee.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          if (!nextLeadId) return;
                          setForm((prev) => ({
                            ...prev,
                            teamLeads: [
                              ...prev.teamLeads,
                              { leadId: nextLeadId, leadRole: DEFAULT_LEAD_ROLE, memberIds: [] },
                            ],
                          }));
                          setNextLeadId('');
                        }}
                        className="inline-flex items-center gap-2 rounded-2xl bg-brand-red px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-950"
                      >
                        <Plus size={15} />
                        Add lead
                      </button>
                    </div>
                  ) : null}
                </div>

                <div className="mt-5 space-y-4">
                  {form.teamLeads.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
                      No team leads added yet. Add a lead to build the member hierarchy.
                    </div>
                  ) : null}

                  {form.teamLeads.map((lead, index) => {
                    const leadMember = employees.find((employee) => employee.id === lead.leadId);
                    const reservedLeadIds = new Set(form.teamLeads.map((item) => item.leadId));
                    const availableMemberOptions = employees.filter(
                      (employee) =>
                        employee.id !== form.projectManagerId &&
                        (!reservedLeadIds.has(employee.id) || lead.memberIds.includes(employee.id)),
                    );

                    return (
                      <div key={`lead-card-${lead.leadId}-${index}`} className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <p className="text-base font-semibold text-slate-950">{leadMember?.name || 'Lead'}</p>
                            <p className="text-sm text-slate-500">{leadMember?.role || 'Team Lead'}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setForm((prev) => ({
                                ...prev,
                                teamLeads: prev.teamLeads.filter((_, leadIndex) => leadIndex !== index),
                              }))
                            }
                            className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100"
                          >
                            Remove
                          </button>
                        </div>

                        <label className="mt-4 block">
                          <span className="mb-2 block text-sm font-medium text-slate-700">Lead Role Label</span>
                          <input
                            value={lead.leadRole}
                            onChange={(event) =>
                              setForm((prev) => ({
                                ...prev,
                                teamLeads: prev.teamLeads.map((item, leadIndex) =>
                                  leadIndex === index ? { ...item, leadRole: event.target.value } : item,
                                ),
                              }))
                            }
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition-all focus:border-brand-red focus:bg-white focus:ring-2 focus:ring-brand-red/10"
                          />
                        </label>

                        <div className="mt-4">
                          <p className="mb-3 text-sm font-medium text-slate-700">Team Members</p>
                          {availableMemberOptions.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-center text-sm text-slate-500">
                              No members available for this lead yet.
                            </div>
                          ) : (
                            <div className="grid gap-3 md:grid-cols-2">
                              {availableMemberOptions.map((employee) => {
                                const checked = lead.memberIds.includes(employee.id);
                                return (
                                  <label
                                    key={`lead-${lead.leadId}-member-${employee.id}`}
                                    className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 transition-all ${
                                      checked
                                        ? 'border-brand-red/30 bg-brand-red/5'
                                        : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() =>
                                        setForm((prev) => ({
                                          ...prev,
                                          teamLeads: prev.teamLeads.map((item, leadIndex) => {
                                            if (leadIndex !== index) return item;
                                            const memberIds = checked
                                              ? item.memberIds.filter((memberId) => memberId !== employee.id)
                                              : [...item.memberIds, employee.id];
                                            return { ...item, memberIds };
                                          }),
                                        }))
                                      }
                                      className="h-4 w-4 rounded border-slate-300 text-brand-red focus:ring-brand-red"
                                    />
                                    <img
                                      src={employee.avatar}
                                      alt={employee.name}
                                      className="h-10 w-10 rounded-2xl border border-slate-200 object-cover"
                                    />
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-semibold text-slate-900">{employee.name}</p>
                                      <p className="truncate text-xs text-slate-500">{employee.role}</p>
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          </div>

          {validationMessage ? (
            <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {validationMessage}
            </div>
          ) : null}

          <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-2xl bg-brand-red px-5 py-3 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-slate-950 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? 'Saving...' : mode === 'create' ? 'Create Project' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProjectCharterFormModal;
