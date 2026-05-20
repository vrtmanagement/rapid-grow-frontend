import React, { useEffect, useMemo, useState } from 'react';
import { BrainCircuit, RefreshCw, Sparkles, Users } from 'lucide-react';
import { fetchStrengthsDashboard } from '../services/p3Api';
import ErrorAlert from '../components/ui/ErrorAlert';
import SkillGapAnalysisView from './SkillGapAnalysisView';

type Skill = {
  name: string;
  level?: number;
  count?: number;
  lastUsedAt?: string;
};

type EmployeeStrength = {
  empId: string;
  empName?: string;
  designation?: string;
  department?: string;
  role?: string;
  topSkills?: Skill[];
};

type StrengthsPayload = {
  teamStrengths?: Array<{ name: string; avgLevel: number; people: number }>;
  byEmployee?: EmployeeStrength[];
};

const StrengthsDashboardView: React.FC = () => {
  const [activePanel, setActivePanel] = useState<'strengths' | 'gaps'>('strengths');
  const [data, setData] = useState<StrengthsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchStrengthsDashboard());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load strengths');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const employees = data?.byEmployee || [];
  const teamStrengths = data?.teamStrengths || [];
  const learnedSkillCount = useMemo(
    () => employees.reduce((sum, row) => sum + (row.topSkills?.length || 0), 0),
    [employees],
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-red">People intelligence</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-950">Strengths and skill gaps</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Learned skills by person and project-readiness gaps in one place.
          </p>
        </div>
        {activePanel === 'strengths' && (
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        )}
      </div>

      <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
        <button
          type="button"
          onClick={() => setActivePanel('strengths')}
          className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
            activePanel === 'strengths' ? 'bg-brand-red text-white' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          Strengths
        </button>
        <button
          type="button"
          onClick={() => setActivePanel('gaps')}
          className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
            activePanel === 'gaps' ? 'bg-brand-red text-white' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          Skill gaps
        </button>
      </div>

      {activePanel === 'gaps' ? (
        <SkillGapAnalysisView embedded />
      ) : (
        <>
          <ErrorAlert message={error} />

          <div className="grid gap-4 sm:grid-cols-3">
            <Stat icon={<Users size={18} />} label="People tracked" value={employees.length} />
            <Stat icon={<Sparkles size={18} />} label="Learned skills" value={learnedSkillCount} />
            <Stat icon={<BrainCircuit size={18} />} label="Team strengths" value={teamStrengths.length} />
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.9fr_1.4fr]">
            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">Team top skills</h2>
              <div className="mt-4 space-y-3">
                {loading ? (
                  <LoadingRows count={6} />
                ) : teamStrengths.length ? (
                  teamStrengths.map((row) => <TeamSkillBar key={row.name} row={row} />)
                ) : (
                  <EmptyState title="No team skills learned yet" text="Complete a few assigned tasks and the skill learner will start filling this dashboard." />
                )}
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">By employee</h2>
              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                {loading ? (
                  <LoadingCards count={4} />
                ) : employees.length ? (
                  employees.map((employee) => <EmployeeCard key={employee.empId} employee={employee} />)
                ) : (
                  <EmptyState title="No active employees found" text="Add employees first, then completed TaskHub work can build strength profiles." />
                )}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
};

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-slate-500">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 text-3xl font-bold text-slate-950">{value}</p>
    </div>
  );
}

function TeamSkillBar({ row }: { row: { name: string; avgLevel: number; people: number } }) {
  const pct = Math.max(4, Math.min(100, (Number(row.avgLevel || 0) / 5) * 100));
  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-semibold text-slate-800">{row.name}</span>
        <span className="text-slate-500">{row.avgLevel}/5 / {row.people} people</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-slate-100">
        <div className="h-2 rounded-full bg-brand-red" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function EmployeeCard({ employee }: { employee: EmployeeStrength }) {
  const skills = employee.topSkills || [];
  return (
    <article className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-950">{employee.empName || employee.empId}</h3>
          <p className="mt-1 text-xs text-slate-500">
            {employee.designation || employee.role || 'Employee'} / {employee.department || 'No department'}
          </p>
        </div>
        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">
          {employee.empId}
        </span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {skills.length ? (
          skills.map((skill) => (
            <span key={skill.name} className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              {skill.name} / L{skill.level || 1}
            </span>
          ))
        ) : (
          <span className="rounded-full border border-dashed border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-500">
            No learned skills yet
          </span>
        )}
      </div>
    </article>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-5 text-sm">
      <p className="font-semibold text-slate-800">{title}</p>
      <p className="mt-1 leading-6 text-slate-500">{text}</p>
    </div>
  );
}

function LoadingRows({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="animate-pulse">
          <div className="h-4 w-2/3 rounded bg-slate-200" />
          <div className="mt-2 h-2 rounded bg-slate-100" />
        </div>
      ))}
    </>
  );
}

function LoadingCards({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="h-32 animate-pulse rounded-lg bg-slate-100" />
      ))}
    </>
  );
}

export default StrengthsDashboardView;
