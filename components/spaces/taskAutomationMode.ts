import type React from 'react';
import type { TaskCreateRecurrenceDraft } from '../../types/spaces';
import { buildDefaultTaskCreateRecurrenceDraft } from '../../utils/spaces/taskRecurrence';
import type { TaskAutomationMode } from './SpacesTaskAutomationSection';

export function deriveTaskAutomationMode(params: {
  emailChecklistEnabled: boolean;
  taskRecurrenceEnabled: boolean;
}): TaskAutomationMode {
  if (params.emailChecklistEnabled) return 'mail_checklist';
  if (params.taskRecurrenceEnabled) return 'repeating';
  return 'none';
}

type ResetEmailChecklistParams = {
  setEmailChecklistEnabled: (value: boolean) => void;
  setAdditionalChecklistTitles: (value: string[]) => void;
  setEmailChecklistExternalPerson: (value: boolean) => void;
  setExternalAssigneeEmail: (value: string) => void;
  setExternalAssigneeName: (value: string) => void;
  setRepeatEveryWeek: (value: boolean) => void;
};

type ResetTaskRecurrenceParams = {
  setTaskRecurrence: React.Dispatch<React.SetStateAction<TaskCreateRecurrenceDraft>>;
};

export function applyTaskAutomationMode(
  mode: TaskAutomationMode,
  emailChecklist: ResetEmailChecklistParams,
  taskRecurrence: ResetTaskRecurrenceParams,
) {
  if (mode === 'none') {
    emailChecklist.setEmailChecklistEnabled(false);
    emailChecklist.setAdditionalChecklistTitles([]);
    emailChecklist.setEmailChecklistExternalPerson(false);
    emailChecklist.setExternalAssigneeEmail('');
    emailChecklist.setExternalAssigneeName('');
    emailChecklist.setRepeatEveryWeek(false);
    taskRecurrence.setTaskRecurrence((prev) => ({ ...prev, enabled: false }));
    return;
  }

  if (mode === 'mail_checklist') {
    emailChecklist.setEmailChecklistEnabled(true);
    taskRecurrence.setTaskRecurrence((prev) => ({ ...prev, enabled: false }));
    return;
  }

  emailChecklist.setEmailChecklistEnabled(false);
  emailChecklist.setAdditionalChecklistTitles([]);
  emailChecklist.setEmailChecklistExternalPerson(false);
  emailChecklist.setExternalAssigneeEmail('');
  emailChecklist.setExternalAssigneeName('');
  emailChecklist.setRepeatEveryWeek(false);
  taskRecurrence.setTaskRecurrence((prev) => ({
    ...buildDefaultTaskCreateRecurrenceDraft(),
    ...prev,
    enabled: true,
  }));
}
