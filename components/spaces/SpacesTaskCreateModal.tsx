import React from 'react';
import { Paperclip, Plus, X } from 'lucide-react';
import { CREATE_INPUT_CLASS, ThemedDatePicker, ThemedSelect } from './SpacesFormControls';

const SpacesTaskCreateModal: React.FC<any> = (props) => {
  const {
    open,
    onClose,
    onSubmit,
    canUseEmailChecklist,
    title,
    setTitle,
    description,
    setDescription,
    assigneeId,
    setAssigneeId,
    createAssigneeOptions,
    employeesLoading,
    dueDate,
    setDueDate,
    priority,
    setPriority,
    priorityOptions,
    status,
    setStatus,
    emailChecklistEnabled,
    setEmailChecklistEnabled,
    additionalChecklistTitles,
    setAdditionalChecklistTitles,
    reminderIntervalHours,
    setReminderIntervalHours,
    statusOptions,
    selectedProjectId,
    setSelectedProjectId,
    projectSelectOptions,
    projectsLoading,
    taskDocumentFile,
    setTaskDocumentFile,
    saving,
    uploadingTaskDocument,
    error,
    addToWeeklyPlanner,
    setAddToWeeklyPlanner,
    plannerWeekOptions,
    plannerWeekId,
    setPlannerWeekId,
    plannerDayOptions,
    plannerDayId,
    setPlannerDayId,
    plannerSummary,
  } = props;

  const normalizedPlannerWeekOptions = React.useMemo(() => {
    const unique = new Map<string, { value: string; label: string }>();
    (plannerWeekOptions || []).forEach((option: any) => {
      const cleanLabel = String(option?.label || '').replace(/Â·/g, '·').trim();
      if (!cleanLabel || unique.has(cleanLabel)) return;
      unique.set(cleanLabel, { value: option.value, label: cleanLabel });
    });
    return Array.from(unique.values());
  }, [plannerWeekOptions]);

  const parsePlannerLabel = React.useCallback((label: string) => {
    const match = String(label || '').match(/(Q\d+)\s*\/\s*(M\d+)\s*\/\s*(W\d+)/i);
    return {
      quarter: match?.[1] || '',
      month: match?.[2] || '',
      week: match?.[3] || '',
    };
  }, []);

  const [plannerQuarterLabel, setPlannerQuarterLabel] = React.useState('');
  const [plannerMonthLabel, setPlannerMonthLabel] = React.useState('');

  const plannerQuarterOptions = React.useMemo(() => {
    const unique = new Map<string, { value: string; label: string }>();
    normalizedPlannerWeekOptions.forEach((option) => {
      const parsed = parsePlannerLabel(option.label);
      if (parsed.quarter && !unique.has(parsed.quarter)) {
        unique.set(parsed.quarter, { value: parsed.quarter, label: parsed.quarter });
      }
    });
    return Array.from(unique.values());
  }, [normalizedPlannerWeekOptions, parsePlannerLabel]);

  const plannerMonthOptions = React.useMemo(() => {
    const unique = new Map<string, { value: string; label: string }>();
    normalizedPlannerWeekOptions.forEach((option) => {
      const parsed = parsePlannerLabel(option.label);
      if (plannerQuarterLabel && parsed.quarter !== plannerQuarterLabel) return;
      if (parsed.month && !unique.has(parsed.month)) {
        unique.set(parsed.month, { value: parsed.month, label: parsed.month });
      }
    });
    return Array.from(unique.values());
  }, [normalizedPlannerWeekOptions, parsePlannerLabel, plannerQuarterLabel]);

  const compactPlannerWeekOptions = React.useMemo(
    () =>
      normalizedPlannerWeekOptions
        .filter((option) => {
          const parsed = parsePlannerLabel(option.label);
          if (plannerQuarterLabel && parsed.quarter !== plannerQuarterLabel) return false;
          if (plannerMonthLabel && parsed.month !== plannerMonthLabel) return false;
          return true;
        })
        .map((option) => {
          const parsed = parsePlannerLabel(option.label);
          const [, range = ''] = option.label.split('·');
          return {
            value: option.value,
            label: parsed.week ? `${parsed.week} · ${range.trim()}` : option.label,
          };
        }),
    [normalizedPlannerWeekOptions, parsePlannerLabel, plannerMonthLabel, plannerQuarterLabel],
  );

  React.useEffect(() => {
    const selectedOption = normalizedPlannerWeekOptions.find((option) => option.value === plannerWeekId) || normalizedPlannerWeekOptions[0] || null;
    if (!selectedOption) {
      setPlannerQuarterLabel('');
      setPlannerMonthLabel('');
      return;
    }
    const parsed = parsePlannerLabel(selectedOption.label);
    setPlannerQuarterLabel(parsed.quarter || '');
    setPlannerMonthLabel(parsed.month || '');
  }, [normalizedPlannerWeekOptions, parsePlannerLabel, plannerWeekId]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-3xl overflow-hidden rounded-[28px] border border-slate-200 bg-white"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <div className="text-[13px] font-semibold uppercase tracking-[0.18em] text-slate-400">Task Hub</div>
            <h3 className="mt-1 text-[30px] font-semibold leading-none text-slate-900">Create New Task</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[74vh] overflow-y-auto px-6 py-3.5">
          <div className="space-y-3">
            {error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">{error}</div>
            ) : null}

            <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.35fr)_300px]">
              <div className="space-y-3">
                <div>
                  <label className="mb-2 block text-[13px] font-semibold uppercase tracking-[0.08em] text-slate-700">Task Name *</label>
                  <input value={title} onChange={(e) => setTitle(e.target.value)} className={CREATE_INPUT_CLASS} placeholder="Enter task name" />
                </div>

                <div>
                  <label className="mb-2 block text-[13px] font-semibold uppercase tracking-[0.08em] text-slate-700">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="min-h-[126px] w-full rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-[15px] text-slate-700 outline-none shadow-[0_10px_30px_rgba(15,23,42,0.04)] transition-colors placeholder:text-slate-400 focus:border-brand-red focus:ring-2 focus:ring-brand-red/15"
                    placeholder="Add task description..."
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-[13px] font-semibold uppercase tracking-[0.08em] text-slate-700">Assignee</label>
                    <ThemedSelect value={assigneeId} onChange={setAssigneeId} options={createAssigneeOptions} placeholder="Unassigned" disabled={employeesLoading} forceOpenDown={true} />
                  </div>
                  <div>
                    <label className="mb-2 block text-[13px] font-semibold uppercase tracking-[0.08em] text-slate-700">Due Date</label>
                    <ThemedDatePicker value={dueDate} onChange={setDueDate} forceOpenDown={true} />
                  </div>
                  <div>
                    <label className="mb-2 block text-[13px] font-semibold uppercase tracking-[0.08em] text-slate-700">Priority</label>
                    <ThemedSelect value={priority} onChange={setPriority} options={priorityOptions} forceOpenDown={true} />
                  </div>
                  <div>
                    <label className="mb-2 block text-[13px] font-semibold uppercase tracking-[0.08em] text-slate-700">Status</label>
                    <ThemedSelect value={status} onChange={setStatus} options={statusOptions} forceOpenDown={true} />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-[13px] font-semibold uppercase tracking-[0.08em] text-slate-700">Project</label>
                  <ThemedSelect value={selectedProjectId} onChange={setSelectedProjectId} options={projectSelectOptions} placeholder="No project" disabled={projectsLoading} forceOpenDown={true} />
                </div>
              </div>

              <div className="space-y-3">
                <div className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-3.5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-[13px] font-semibold uppercase tracking-[0.14em] text-slate-700">Weekly Planner</div>
                      <p className="mt-1 text-[12px] leading-5 text-slate-500">Plan this task inside the selected quarter, month, week, and day.</p>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        checked={addToWeeklyPlanner}
                        onChange={(e) => setAddToWeeklyPlanner(e.target.checked)}
                        className="peer sr-only"
                      />
                      <span className="h-7 w-12 rounded-full bg-slate-200 transition peer-checked:bg-brand-red/90" />
                      <span className="absolute left-1 h-5 w-5 rounded-full bg-white shadow-sm transition peer-checked:translate-x-5" />
                    </label>
                  </div>

                  {addToWeeklyPlanner ? (
                    <div className="mt-3.5 space-y-3 border-t border-slate-200 pt-3">
                      <div className="rounded-2xl border border-red-100 bg-red-50/70 px-3 py-2.5">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-red">Planner Context</div>
                        <div className="mt-1 text-[13px] font-semibold text-slate-900">{plannerSummary || 'Choose a week and day'}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-700">Quarter</label>
                          <ThemedSelect
                            value={plannerQuarterLabel}
                            onChange={(value) => {
                              setPlannerQuarterLabel(value);
                              const nextMonth = normalizedPlannerWeekOptions
                                .map((option) => ({ option, parsed: parsePlannerLabel(option.label) }))
                                .find(({ parsed }) => parsed.quarter === value)?.parsed.month || '';
                              setPlannerMonthLabel(nextMonth);
                              const nextWeek = normalizedPlannerWeekOptions.find((option) => {
                                const parsed = parsePlannerLabel(option.label);
                                return parsed.quarter === value && (!nextMonth || parsed.month === nextMonth);
                              })?.value || '';
                              setPlannerWeekId(nextWeek);
                            }}
                            options={plannerQuarterOptions}
                            placeholder="Quarter"
                            compact={true}
                            fullWidthCompact={true}
                            denseMenu={true}
                            forceOpenDown={true}
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-700">Month</label>
                          <ThemedSelect
                            value={plannerMonthLabel}
                            onChange={(value) => {
                              setPlannerMonthLabel(value);
                              const nextWeek = normalizedPlannerWeekOptions.find((option) => {
                                const parsed = parsePlannerLabel(option.label);
                                return (!plannerQuarterLabel || parsed.quarter === plannerQuarterLabel) && parsed.month === value;
                              })?.value || '';
                              setPlannerWeekId(nextWeek);
                            }}
                            options={plannerMonthOptions}
                            placeholder="Month"
                            compact={true}
                            fullWidthCompact={true}
                            denseMenu={true}
                            forceOpenDown={true}
                            disabled={!plannerQuarterOptions.length}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-700">Week</label>
                          <ThemedSelect
                            value={plannerWeekId}
                            onChange={setPlannerWeekId}
                            options={compactPlannerWeekOptions}
                            placeholder="Week"
                            compact={true}
                            fullWidthCompact={true}
                            denseMenu={true}
                            forceOpenDown={true}
                            disabled={!plannerMonthOptions.length}
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-700">Day</label>
                          <ThemedSelect
                            value={plannerDayId}
                            onChange={setPlannerDayId}
                            options={plannerDayOptions}
                            placeholder="Day"
                            compact={true}
                            fullWidthCompact={true}
                            denseMenu={true}
                            forceOpenDown={true}
                            disabled={!compactPlannerWeekOptions.length}
                          />
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div>
                  <label className="mb-2 block text-[13px] font-semibold uppercase tracking-[0.08em] text-slate-700">Document / Attachments</label>
                  <label className="flex min-h-[132px] cursor-pointer flex-col items-center justify-center rounded-[22px] border border-dashed border-red-200 bg-slate-50/70 px-5 text-center transition hover:bg-red-50/50">
                    <input type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp" className="hidden" onChange={(e) => setTaskDocumentFile(e.target.files?.[0] || null)} />
                    <div className="flex h-14 w-14 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500">
                      <Paperclip size={20} />
                    </div>
                    <div className="mt-3 text-[15px] font-medium text-slate-700">
                      {taskDocumentFile ? taskDocumentFile.name : 'Click to upload or drag and drop'}
                    </div>
                    <div className="mt-1 text-[12px] text-slate-500">PDF, DOCX, JPG, PNG, WEBP</div>
                  </label>
                </div>

                {canUseEmailChecklist ? <div className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[13px] font-semibold uppercase tracking-[0.12em] text-slate-700">Automated Mail Checklist</div>
                      <p className="mt-1 text-[12px] leading-5 text-slate-500">Email assigned work and repeat only unfinished items.</p>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        checked={emailChecklistEnabled}
                        onChange={(event) => {
                          const enabled = event.target.checked;
                          setEmailChecklistEnabled(enabled);
                          if (!enabled) setAdditionalChecklistTitles([]);
                        }}
                        className="peer sr-only"
                      />
                      <span className="h-7 w-12 rounded-full bg-slate-200 transition peer-checked:bg-emerald-600" />
                      <span className="absolute left-1 h-5 w-5 rounded-full bg-white shadow-sm transition peer-checked:translate-x-5" />
                    </label>
                  </div>

                  {emailChecklistEnabled ? (
                    <div className="mt-3 space-y-3 border-t border-slate-200 pt-3">
                      <div>
                        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-700">Email Reminder Gap</label>
                        <ThemedSelect
                          value={reminderIntervalHours}
                          onChange={setReminderIntervalHours}
                          options={[
                            { value: '1', label: 'Every 1 hour' },
                            { value: '6', label: 'Every 6 hours' },
                            { value: '12', label: 'Every 12 hours' },
                            { value: '24', label: 'Every 24 hours' },
                            { value: '48', label: 'Every 2 days' },
                            { value: '168', label: 'Every 7 days' },
                          ]}
                          compact={true}
                          fullWidthCompact={true}
                          forceOpenDown={true}
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-700">Checklist Tasks</label>
                          <span className="text-[11px] text-slate-400">{1 + additionalChecklistTitles.length}/5</span>
                        </div>
                        <div className="mt-2 rounded-xl border border-emerald-100 bg-white px-3 py-2 text-[12px] text-slate-600">
                          1. {title.trim() || 'Enter the task name above'}
                        </div>
                        <div className="mt-2 space-y-2">
                          {additionalChecklistTitles.map((taskTitle: string, index: number) => (
                            <div key={`checklist-title-${index}`} className="flex items-center gap-2">
                              <input
                                value={taskTitle}
                                onChange={(event) => {
                                  const next = [...additionalChecklistTitles];
                                  next[index] = event.target.value;
                                  setAdditionalChecklistTitles(next);
                                }}
                                className="h-10 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-[13px] outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15"
                                placeholder={`Checklist task ${index + 2}`}
                              />
                              <button
                                type="button"
                                onClick={() => setAdditionalChecklistTitles(additionalChecklistTitles.filter((_: string, itemIndex: number) => itemIndex !== index))}
                                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-100"
                                aria-label={`Remove checklist task ${index + 2}`}
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                        {additionalChecklistTitles.length < 4 ? (
                          <button
                            type="button"
                            onClick={() => setAdditionalChecklistTitles([...additionalChecklistTitles, ''])}
                            className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-emerald-700 hover:text-emerald-800"
                          >
                            <Plus size={13} /> Add checklist task
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </div> : null}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/70 px-6 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3 text-[15px] font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={saving || uploadingTaskDocument || !title.trim()}
            className={`inline-flex items-center gap-2 rounded-full bg-brand-red px-7 py-3 text-[15px] font-black text-white shadow-lg transition-colors hover:bg-brand-navy ${
              saving || uploadingTaskDocument || !title.trim() ? 'cursor-not-allowed opacity-60' : ''
            }`}
          >
            <Plus size={16} />
            {uploadingTaskDocument ? 'Uploading...' : saving ? 'Creating...' : 'Create Task'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SpacesTaskCreateModal;
