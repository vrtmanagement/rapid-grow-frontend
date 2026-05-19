import React, { useEffect, useState } from 'react';
import { API_BASE, getAuthHeaders } from '../../config/api';
import {
  addTimeEntry,
  fetchTimeEntries,
  updateTaskDependencies,
  updateTaskRecurrence,
} from '../../services/p3Api';
import GoalTaskLinkField from '../goals/GoalTaskLinkField';

type TaskShape = {
  taskId: string;
  blockedByTaskIds?: string[];
  blocksTaskIds?: string[];
  estimatedHours?: number;
  actualHours?: number;
  linkedGoalId?: string;
  recurrence?: { enabled?: boolean; frequency?: string };
};

type Props = {
  task: TaskShape;
  allTasks: Array<{ taskId: string; title: string }>;
  onUpdated?: () => void;
};

const TaskEnhancementsPanel: React.FC<Props> = ({ task, allTasks, onUpdated }) => {
  const [blockedBy, setBlockedBy] = useState((task.blockedByTaskIds || []).join(', '));
  const [blocks, setBlocks] = useState((task.blocksTaskIds || []).join(', '));
  const [hours, setHours] = useState('');
  const [note, setNote] = useState('');
  const [timeSummary, setTimeSummary] = useState({ estimatedHours: 0, actualHours: 0 });
  const [recurrenceEnabled, setRecurrenceEnabled] = useState(Boolean(task.recurrence?.enabled));
  const [frequency, setFrequency] = useState(task.recurrence?.frequency || 'weekly');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadTime = async () => {
    const data = await fetchTimeEntries(task.taskId);
    setTimeSummary({
      estimatedHours: data.estimatedHours || task.estimatedHours || 0,
      actualHours: data.actualHours || task.actualHours || 0,
    });
  };

  useEffect(() => {
    loadTime().catch(() => undefined);
  }, [task.taskId]);

  const saveDependencies = async () => {
    setError(null);
    try {
      await updateTaskDependencies(
        task.taskId,
        blockedBy.split(',').map((s) => s.trim()).filter(Boolean),
        blocks.split(',').map((s) => s.trim()).filter(Boolean)
      );
      setMessage('Dependencies saved');
      onUpdated?.();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const saveRecurrence = async () => {
    setError(null);
    try {
      await updateTaskRecurrence(task.taskId, {
        enabled: recurrenceEnabled,
        frequency: recurrenceEnabled ? frequency : '',
        interval: 1,
        nextRunAt: new Date().toISOString(),
      });
      setMessage('Recurrence saved');
      onUpdated?.();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const logTime = async () => {
    setError(null);
    try {
      await addTimeEntry(task.taskId, Number(hours), note);
      setHours('');
      setNote('');
      await loadTime();
      setMessage('Time logged');
      onUpdated?.();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const saveLinkedGoal = async (goalId: string) => {
    await fetch(`${API_BASE}/spaces/tasks/${task.taskId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ linkedGoalId: goalId }),
    });
    onUpdated?.();
  };

  const isBlocked = (task.blockedByTaskIds || []).length > 0;

  return (
    <Panel isBlocked={isBlocked} error={error} message={message}>
      <GoalTaskLinkField value={task.linkedGoalId || ''} onChange={saveLinkedGoal} />

      <Section title="Dependencies (task IDs, comma-separated)">
        <input
          value={blockedBy}
          onChange={(e) => setBlockedBy(e.target.value)}
          placeholder="Blocked by: st-123"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm mb-2"
        />
        <input
          value={blocks}
          onChange={(e) => setBlocks(e.target.value)}
          placeholder="Blocks: st-456"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
        <button type="button" onClick={saveDependencies} className="mt-2 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white">
          Save dependencies
        </button>
      </Section>

      <Section title="Recurrence">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={recurrenceEnabled} onChange={(e) => setRecurrenceEnabled(e.target.checked)} />
          Enable recurring task
        </label>
        {recurrenceEnabled && (
          <select value={frequency} onChange={(e) => setFrequency(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        )}
        <button type="button" onClick={saveRecurrence} className="mt-2 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white">
          Save recurrence
        </button>
      </Section>

      <Section title={`Time (${timeSummary.actualHours}h / ${timeSummary.estimatedHours}h est.)`}>
        <div className="flex gap-2">
          <input type="number" min="0.25" step="0.25" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="Hours" className="w-24 rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note" className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        </div>
        <button type="button" onClick={logTime} className="mt-2 rounded-lg bg-brand-red px-3 py-1.5 text-xs font-semibold text-white">
          Log time
        </button>
      </Section>
    </Panel>
  );
};

function Panel({
  isBlocked,
  error,
  message,
  children,
}: {
  isBlocked: boolean;
  error: string | null;
  message: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-6 space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <h3 className="text-sm font-semibold text-slate-900">Task enhancements</h3>
      {isBlocked && <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">Blocked</span>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && <p className="text-sm text-emerald-700">{message}</p>}
      {children}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">{title}</p>
      {children}
    </div>
  );
}

export default TaskEnhancementsPanel;
