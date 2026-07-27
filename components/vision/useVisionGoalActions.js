import { useEffect } from 'react';
import { removeGoal, saveGoal } from '../../services/goalApi';
import { GOAL_COLLECTIONS, createId, dayLabel, getWeekPlan, getWeeksInMonth } from './visionPlanningHelpers';

// Encapsulates create/edit/delete behavior for vision hierarchy nodes
// (years, quarters, months, weeks, days). Consumes the context returned
// by useVisionPlanningState.
export const useVisionGoalActions = (ctx, { state, updateState }) => {
  const {
    isAdmin,
    draftById,
    setDraftById,
    editingId,
    setEditingId,
    openCardMenuId,
    setOpenCardMenuId,
    newVisionTitle,
    setNewVisionTitle,
    newVisionDetails,
    setNewVisionDetails,
    setShowVisionComposer,
    selectedQuarter,
  } = ctx;

  const persistGoal = async (goal) => {
    await saveGoal({
      id: goal.id,
      text: goal.text || '',
      completed: !!goal.completed,
      level: goal.level,
      parentId: goal.parentId || '',
      details: goal.details || '',
      timeline: goal.timeline || '',
    });
  };

  const upsertGoalIntoState = (prev, goal) => {
    const collectionKey = GOAL_COLLECTIONS[goal.level];
    const collection = Array.isArray(prev[collectionKey]) ? prev[collectionKey] : [];
    const existingIndex = collection.findIndex((item) => item.id === goal.id);
    const nextCollection =
      existingIndex >= 0
        ? collection.map((item) => (item.id === goal.id ? { ...item, ...goal } : item))
        : [...collection, goal];
    return {
      ...prev,
      [collectionKey]: nextCollection,
    };
  };

  const upsertManyGoalsIntoState = (prev, goals) =>
    goals.reduce((next, goal) => upsertGoalIntoState(next, goal), prev);

  const setDraft = (goal, updates = {}) => {
    setDraftById((prev) => ({
      ...prev,
      [goal.id]: {
        text: prev[goal.id]?.text ?? goal.text ?? '',
        details: prev[goal.id]?.details ?? goal.details ?? '',
        ...updates,
      },
    }));
  };

  const openEditor = (goal) => {
    if (!isAdmin || !goal) return;
    setOpenCardMenuId('');
    setDraft(goal);
    setEditingId(goal.id);
  };

  useEffect(() => {
    if (!openCardMenuId) return undefined;
    const closeMenu = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest('[data-vision-card-menu="true"]')) return;
      setOpenCardMenuId('');
    };
    document.addEventListener('mousedown', closeMenu);
    return () => document.removeEventListener('mousedown', closeMenu);
  }, [openCardMenuId]);

  const closeEditor = () => setEditingId('');

  const saveNode = async (goal) => {
    if (!isAdmin || !goal) return;
    const draft = draftById[goal.id] || {};
    const nextGoal = {
      id: goal.id,
      text: String(draft.text ?? goal.text ?? '').trim(),
      details: String(draft.details ?? goal.details ?? '').trim(),
      completed: !!goal.completed,
      level: goal.level,
      parentId: goal.parentId || '',
      timeline: goal.timeline || '',
    };
    updateState((prev) => upsertGoalIntoState(prev, nextGoal));
    try {
      await persistGoal(nextGoal);
      closeEditor();
    } catch (error) {
      console.error(error);
    }
  };

  const addVision = async () => {
    if (!isAdmin) return;
    const text = newVisionTitle.trim();
    if (!text || state.yearlyGoals.length >= 5) return;

    const goal = {
      id: `y-${createId()}`,
      text,
      details: newVisionDetails.trim(),
      completed: false,
      level: 'year',
    };

    updateState((prev) => ({
      ...prev,
      yearlyGoals: [...prev.yearlyGoals, goal],
    }));

    try {
      await persistGoal(goal);
      setNewVisionTitle('');
      setNewVisionDetails('');
      setShowVisionComposer(false);
    } catch (error) {
      console.error(error);
    }
  };

  const deleteVision = async (vision) => {
    if (!isAdmin || !vision) return;
    const collectNodeIds = (node) => {
      if (!node) return [];
      return [
        node.id,
        ...((node.quarters || []).flatMap((child) => collectNodeIds(child))),
        ...((node.months || []).flatMap((child) => collectNodeIds(child))),
        ...((node.weeks || []).flatMap((child) => collectNodeIds(child))),
        ...((node.days || []).flatMap((child) => collectNodeIds(child))),
      ];
    };

    const idsToRemove = collectNodeIds(vision);
    const idSet = new Set(idsToRemove);

    updateState((prev) => ({
      ...prev,
      yearlyGoals: (prev.yearlyGoals || []).filter((goal) => !idSet.has(goal.id)),
      quarterlyGoals: (prev.quarterlyGoals || []).filter((goal) => !idSet.has(goal.id)),
      monthlyGoals: (prev.monthlyGoals || []).filter((goal) => !idSet.has(goal.id)),
      weeklyGoals: (prev.weeklyGoals || []).filter((goal) => !idSet.has(goal.id)),
      dailyGoals: (prev.dailyGoals || []).filter((goal) => !idSet.has(goal.id)),
    }));

    if (editingId && idSet.has(editingId)) {
      setEditingId('');
    }

    try {
      await Promise.all(idsToRemove.map((id) => removeGoal(id)));
    } catch (error) {
      console.error(error);
    }
  };

  const deleteHierarchyItem = async (item) => {
    if (!isAdmin || !item) return;
    await deleteVision(item);
  };

  const addWeekGoal = async (month) => {
    if (!isAdmin || !month) return;
    const monthWeekLimit = getWeeksInMonth(month.timeline, selectedQuarter?.timeline);
    const existingRealWeeks = month.weeks.filter((week) => !week.isPlaceholder);
    if (existingRealWeeks.length >= monthWeekLimit) {
      const firstEditableWeek = month.weeks.find((week) => !week.text && !week.details) || month.weeks[0];
      openEditor(firstEditableWeek);
      return;
    }

    const targetWeek = month.weeks.find((week) => week.isPlaceholder) || month.weeks[existingRealWeeks.length];
    if (!targetWeek) return;

    const weekGoal = {
      id: targetWeek.id,
      text: '',
      details: '',
      completed: false,
      level: 'week',
      parentId: month.id,
      timeline: targetWeek.timeline || `W${targetWeek.slotIndex || existingRealWeeks.length + 1}`,
    };

    const plannedDayCount = Math.max(
      1,
      getWeekPlan(targetWeek.slotIndex || existingRealWeeks.length + 1, month.timeline, selectedQuarter?.timeline)?.days?.length || 0,
    );

    const seededDays = Array.from({ length: plannedDayCount }, (_, index) => ({
      id: `d-${weekGoal.id}-${index + 1}`,
      text: dayLabel(index),
      completed: false,
      level: 'day',
      parentId: weekGoal.id,
      timeline: `D${index + 1}`,
    }));

    updateState((prev) => upsertManyGoalsIntoState(prev, [weekGoal, ...seededDays]));
    setDraft(weekGoal, { text: '', details: '' });
    setEditingId(weekGoal.id);

    try {
      await Promise.all([persistGoal(weekGoal), ...seededDays.map((day) => persistGoal(day))]);
    } catch (error) {
      console.error(error);
    }
  };

  const ensureWeekDays = async (week) => {
    if (!isAdmin || !week) return;
    const existingRealDays = week.days.filter((day) => !day.isPlaceholder);
    const dayLimit = Math.max(1, week.days.length || 0);
    if (existingRealDays.length >= dayLimit) {
      const firstEditableDay = week.days.find((day) => !day.text || day.text.startsWith('Day ')) || week.days[0];
      openEditor(firstEditableDay);
      return;
    }

    const missingDays = Array.from({ length: dayLimit - existingRealDays.length }, (_, index) => {
      const slot = existingRealDays.length + index + 1;
      return {
        id: `d-${week.id}-${slot}`,
        text: dayLabel(slot - 1),
        details: '',
        completed: false,
        level: 'day',
        parentId: week.id,
        timeline: `D${slot}`,
      };
    });

    updateState((prev) => upsertManyGoalsIntoState(prev, missingDays));
    if (missingDays[0]) {
      setDraft(missingDays[0], { text: missingDays[0].text, details: '' });
      setEditingId(missingDays[0].id);
    }

    try {
      await Promise.all(missingDays.map((day) => persistGoal(day)));
    } catch (error) {
      console.error(error);
    }
  };

  const toggleDayComplete = async (goal) => {
    if (!isAdmin || !goal) return;
    const nextGoal = {
      id: goal.id,
      text: goal.text || '',
      details: goal.details || '',
      completed: !goal.completed,
      level: 'day',
      parentId: goal.parentId || '',
      timeline: goal.timeline || '',
    };
    updateState((prev) => upsertGoalIntoState(prev, nextGoal));
    try {
      await persistGoal(nextGoal);
    } catch (error) {
      console.error(error);
    }
  };

  return {
    persistGoal,
    upsertGoalIntoState,
    upsertManyGoalsIntoState,
    setDraft,
    openEditor,
    closeEditor,
    saveNode,
    addVision,
    deleteVision,
    deleteHierarchyItem,
    addWeekGoal,
    ensureWeekDays,
    toggleDayComplete,
  };
};
