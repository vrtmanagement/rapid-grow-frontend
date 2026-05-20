import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Search } from 'lucide-react';
import { analyzeSkillGaps } from '../services/p3Api';
import ErrorAlert from '../components/ui/ErrorAlert';

type GapRow = {
  skill: string;
  availableCount: number;
  gap: 'covered' | 'missing' | string;
  bestMatch?: {
    empId: string;
    empName?: string;
    designation?: string;
    department?: string;
    level?: number;
    count?: number;
  } | null;
};

const DEFAULT_SKILLS = 'React, Node.js, Project management';

const SkillGapAnalysisView: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const [required, setRequired] = useState(DEFAULT_SKILLS);
  const [gaps, setGaps] = useState<GapRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasRun, setHasRun] = useState(false);

  const skills = useMemo(
    () => required.split(',').map((s) => s.trim()).filter(Boolean),
    [required],
  );

  const run = async () => {
    setHasRun(true);
    setError(null);
    if (!skills.length) {
      setGaps([]);
      setError('Add at least one required skill.');
      return;
    }
    setLoading(true);
    try {
      const data = await analyzeSkillGaps(skills);
      setGaps(Array.isArray(data.gaps) ? data.gaps : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze skill gaps');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void run();
    // Run once on first open so the page is never blank.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const covered = gaps.filter((gap) => gap.gap !== 'missing').length;

  return (
    <div className={`${embedded ? '' : 'mx-auto max-w-5xl'} space-y-6`}>
      {!embedded && (
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-red">Project readiness</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-950">Skill gap analysis</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Compare project-required skills against learned employee skills. Use commas to add multiple skills.
          </p>
        </div>
      )}

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <label className="text-sm font-semibold text-slate-800">Required skills</label>
        <textarea
          value={required}
          onChange={(e) => setRequired(e.target.value)}
          className="mt-2 min-h-[96px] w-full rounded-lg border border-slate-200 p-3 text-sm text-slate-800 outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red"
          placeholder="React, Node.js, Project management"
        />
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">{skills.length} skill(s) ready to check</p>
          <button
            type="button"
            onClick={run}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-red px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            <Search size={16} />
            {loading ? 'Analyzing...' : 'Analyze gaps'}
          </button>
        </div>
      </section>

      <ErrorAlert message={error} />

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Required" value={skills.length} />
        <Stat label="Covered" value={covered} />
        <Stat label="Missing" value={Math.max(0, gaps.length - covered)} />
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">Gap results</h2>
        <div className="mt-4 space-y-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-20 animate-pulse rounded-lg bg-slate-100" />
            ))
          ) : gaps.length ? (
            gaps.map((gap) => <GapResult key={gap.skill} gap={gap} />)
          ) : hasRun ? (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
              No result returned. Check that the backend is running and that required skills are filled in.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
};

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-bold text-slate-950">{value}</p>
    </div>
  );
}

function GapResult({ gap }: { gap: GapRow }) {
  const missing = gap.gap === 'missing';
  return (
    <article className={`rounded-lg border p-4 ${missing ? 'border-rose-200 bg-rose-50' : 'border-emerald-200 bg-emerald-50'}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          {missing ? <AlertCircle className="mt-0.5 text-rose-600" size={18} /> : <CheckCircle2 className="mt-0.5 text-emerald-700" size={18} />}
          <div>
            <h3 className="font-semibold text-slate-950">{gap.skill}</h3>
            <p className="mt-1 text-sm text-slate-600">
              {missing
                ? 'No learned match yet. Assign related work or add training for this skill.'
                : `${gap.availableCount} matching employee(s) found.`}
            </p>
          </div>
        </div>
        {gap.bestMatch && (
          <div className="rounded-lg bg-white px-3 py-2 text-sm shadow-sm">
            <p className="font-semibold text-slate-900">{gap.bestMatch.empName || gap.bestMatch.empId}</p>
            <p className="text-xs text-slate-500">
              L{gap.bestMatch.level || 1} / {gap.bestMatch.designation || gap.bestMatch.department || gap.bestMatch.empId}
            </p>
          </div>
        )}
      </div>
    </article>
  );
}

export default SkillGapAnalysisView;
