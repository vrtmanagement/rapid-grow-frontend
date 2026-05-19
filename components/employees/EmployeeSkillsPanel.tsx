import React, { useEffect, useState } from 'react';
import { API_BASE, getAuthHeaders } from '../../config/api';
import ErrorAlert from '../ui/ErrorAlert';
import { getReadableError, parseApiResponse } from '../../services/apiClient';

type SkillRow = {
  name: string;
  proficiency: number;
  lastUsedAt?: string;
  usageCount?: number;
};

type RelatedTask = {
  title: string;
  status: string;
  dueDate?: string;
  projectId?: string;
};

const EmployeeSkillsPanel: React.FC<{ empId: string }> = ({ empId }) => {
  const [skills, setSkills] = useState<SkillRow[]>([]);
  const [relatedTasks, setRelatedTasks] = useState<RelatedTask[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/employees/${encodeURIComponent(empId)}/skills`, {
          headers: getAuthHeaders(),
        });
        const data = await parseApiResponse<{
          skills: SkillRow[];
          relatedTasks: RelatedTask[];
        }>(res);
        if (active) {
          setSkills(data.skills || []);
          setRelatedTasks(data.relatedTasks || []);
        }
      } catch (err: any) {
        if (active) setError(getReadableError(err, 'Failed to load skills'));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [empId]);

  if (loading) return <p className="text-sm text-slate-500">Loading skills...</p>;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Skills profile</h2>
      <ErrorAlert message={error} />
      {skills.length ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {skills.map((skill) => (
            <li key={skill.name} className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm">
              <p className="font-semibold text-slate-900">{skill.name}</p>
              <p className="text-slate-600">Proficiency: {skill.proficiency}/5</p>
              <p className="text-slate-500 text-xs mt-1">
                Last used:{' '}
                {skill.lastUsedAt
                  ? new Date(skill.lastUsedAt).toLocaleDateString()
                  : 'Not recorded'}
                {skill.usageCount ? ` · ${skill.usageCount} tasks` : ''}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-500">Skills will appear as tasks are completed.</p>
      )}
      {relatedTasks.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-800 mb-2">Related open tasks</h3>
          <ul className="space-y-2 text-sm">
            {relatedTasks.map((task, index) => (
              <li key={`${task.title}-${index}`} className="rounded-lg border border-slate-100 px-3 py-2">
                <span className="font-medium text-slate-900">{task.title}</span>
                <span className="text-slate-500"> · {task.status}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
};

export default EmployeeSkillsPanel;
