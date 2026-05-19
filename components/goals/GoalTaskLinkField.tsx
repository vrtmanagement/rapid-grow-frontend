import React, { useEffect, useState } from 'react';
import { API_BASE, getAuthHeaders } from '../../config/api';
import { getReadableError, parseApiResponse } from '../../services/apiClient';

type GoalOption = {
  _id: string;
  title?: string;
  text?: string;
  type?: string;
};

type Props = {
  value?: string;
  onChange: (goalId: string) => void;
};

const GoalTaskLinkField: React.FC<Props> = ({ value = '', onChange }) => {
  const [goals, setGoals] = useState<GoalOption[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/goals`, { headers: getAuthHeaders() });
        const data = await parseApiResponse<{ goals?: GoalOption[] } | GoalOption[]>(res);
        const raw = Array.isArray(data) ? data : data.goals || [];
        const list = raw.map((g: any) => ({
          _id: g.goalId || g._id,
          title: g.text || g.title,
          type: g.level || g.type,
        }));
        if (active) setGoals(list);
      } catch (err: any) {
        if (active) setError(getReadableError(err, 'Failed to load goals'));
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="mt-4">
      <label className="block text-sm font-semibold text-slate-700 mb-2">Linked goal (optional)</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
      >
        <option value="">No goal linked</option>
        {goals.map((goal) => (
          <option key={goal._id} value={goal._id}>
            {(goal.title || goal.text || 'Goal').slice(0, 80)}
            {goal.type ? ` (${goal.type})` : ''}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      <p className="text-xs text-slate-500 mt-1">
        Task completion updates goal progress in Vision when linked.
      </p>
    </div>
  );
};

export default GoalTaskLinkField;
