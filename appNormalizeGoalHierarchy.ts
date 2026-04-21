import { MONTH_SLOT_LABELS } from './planning/goalHierarchy';
import { Goal, PlanningState } from './types';
import { QUARTER_LABELS } from './appSeedConstants';

export function normalizeGoalHierarchy(state: PlanningState): PlanningState {
  const yearlyGoals = state.yearlyGoals;
  const yearlyIds = new Set(yearlyGoals.map((g) => g.id));

  const quarterMap = new Map<string, Goal>();
  for (const quarter of state.quarterlyGoals) {
    if (!quarter.parentId || !yearlyIds.has(quarter.parentId)) continue;
    const label = quarter.timeline || '';
    if (!QUARTER_LABELS.includes(label)) continue;
    quarterMap.set(`${quarter.parentId}:${label}`, quarter);
  }

  const quarterlyGoals: Goal[] = [];
  for (const year of yearlyGoals) {
    QUARTER_LABELS.forEach((label) => {
      const key = `${year.id}:${label}`;
      const existing = quarterMap.get(key);
      quarterlyGoals.push(
        existing || {
          id: `${year.id.toLowerCase()}-${label.toLowerCase()}`,
          text: '',
          completed: false,
          level: 'quarter',
          parentId: year.id,
          timeline: label,
        },
      );
    });
  }

  const quarterIds = new Set(quarterlyGoals.map((q) => q.id));

  const monthlyGoals: Goal[] = [];
  for (const quarter of quarterlyGoals) {
    const raw = state.monthlyGoals.filter((m) => m.parentId === quarter.id);
    const byTimeline = new Map<string, Goal>();
    const orphans: Goal[] = [];
    for (const m of raw) {
      const label = m.timeline || '';
      if (MONTH_SLOT_LABELS.includes(label as (typeof MONTH_SLOT_LABELS)[number]) && !byTimeline.has(label)) {
        byTimeline.set(label, m);
      } else {
        orphans.push(m);
      }
    }
    for (const label of MONTH_SLOT_LABELS) {
      const existing = byTimeline.get(label);
      if (existing) {
        monthlyGoals.push(existing);
      } else if (orphans.length) {
        const next = orphans.shift()!;
        monthlyGoals.push({ ...next, parentId: quarter.id, timeline: label });
      } else {
        monthlyGoals.push({
          id: `${quarter.id.toLowerCase()}-${label.toLowerCase()}`,
          text: '',
          completed: false,
          level: 'month',
          parentId: quarter.id,
          timeline: label,
        });
      }
    }
    monthlyGoals.push(...orphans);
  }
  const monthIds = new Set(monthlyGoals.map((m) => m.id));
  const weeklyGoals = state.weeklyGoals.filter((w) => w.parentId && monthIds.has(w.parentId));
  const weekIds = new Set(weeklyGoals.map((w) => w.id));
  const dailyGoals = state.dailyGoals.filter((d) => d.parentId && weekIds.has(d.parentId));

  const dailyByWeek = new Map<string, Goal[]>();
  dailyGoals.forEach((d) => {
    const key = d.parentId as string;
    const list = dailyByWeek.get(key) || [];
    list.push(d);
    dailyByWeek.set(key, list);
  });

  const weeklyWithCompletion = weeklyGoals.map((w) => {
    const children = dailyByWeek.get(w.id) || [];
    const completed = children.length > 0 ? children.every((d) => d.completed) : w.completed;
    return { ...w, completed };
  });

  const weeklyByMonth = new Map<string, Goal[]>();
  weeklyWithCompletion.forEach((w) => {
    const key = w.parentId as string;
    const list = weeklyByMonth.get(key) || [];
    list.push(w);
    weeklyByMonth.set(key, list);
  });

  const monthlyWithCompletion = monthlyGoals.map((m) => {
    const children = weeklyByMonth.get(m.id) || [];
    return { ...m, completed: children.length > 0 && children.every((w) => w.completed) };
  });

  const monthlyByQuarter = new Map<string, Goal[]>();
  monthlyWithCompletion.forEach((m) => {
    const key = m.parentId as string;
    const list = monthlyByQuarter.get(key) || [];
    list.push(m);
    monthlyByQuarter.set(key, list);
  });

  const quarterlyWithCompletion = quarterlyGoals.map((q) => {
    const children = monthlyByQuarter.get(q.id) || [];
    return { ...q, completed: children.length > 0 && children.every((m) => m.completed) };
  });

  const quarterByYear = new Map<string, Goal[]>();
  quarterlyWithCompletion.forEach((q) => {
    const key = q.parentId as string;
    const list = quarterByYear.get(key) || [];
    list.push(q);
    quarterByYear.set(key, list);
  });

  const yearlyWithCompletion = yearlyGoals.map((y) => {
    const children = quarterByYear.get(y.id) || [];
    return { ...y, completed: children.length > 0 && children.every((q) => q.completed) };
  });

  return {
    ...state,
    yearlyGoals: yearlyWithCompletion,
    quarterlyGoals: quarterlyWithCompletion,
    monthlyGoals: monthlyWithCompletion,
    weeklyGoals: weeklyWithCompletion,
    dailyGoals,
  };
}
