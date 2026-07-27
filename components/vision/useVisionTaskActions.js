import { useMemo } from 'react';
import { API_BASE, getAuthHeaders, getStoredAuthSession } from '../../config/api';
import { buildVisionChainKey } from './visionPlanningHelpers';

// Encapsulates the daily task board behavior (linking Spaces tasks to a
// selected day/week, task CRUD, and document upload). Consumes the context
// returned by useVisionPlanningState plus persistGoal/upsertGoalIntoState
// from useVisionGoalActions.
export const useVisionTaskActions = (ctx, goalActions, { updateState }) => {
  const {
    isAdmin,
    spacesTasks,
    setSpacesTasks,
    selectedYear,
    selectedQuarter,
    selectedMonth,
    selectedWeek,
    activeDayId,
    goalContextMaps,
    taskDraftByDay,
    setTaskDraftByDay,
    taskDocumentByDay,
    setTaskDocumentByDay,
    editingTaskId,
    setEditingTaskId,
    viewingTaskId,
    setViewingTaskId,
    setShowTaskComposer,
    setOpenTaskMenuId,
    savingTaskDayId,
    setSavingTaskDayId,
    setUploadingTaskDocument,
    setDeletingTaskId,
    setTaskError,
    me,
  } = ctx;
  const { persistGoal, upsertGoalIntoState } = goalActions;

  const selectedDayIndex = Math.max(
    0,
    (selectedWeek?.days || []).findIndex((item) => item.id === (activeDayId || selectedWeek?.days?.[0]?.id)),
  );
  const selectedDay = selectedWeek?.days?.[selectedDayIndex] || selectedWeek?.days?.[0] || null;
  const doesTaskBelongToWeekNode = useMemo(() => {
    const matchesWeekContext = (context, target) =>
      !!context &&
      context.yearId === target.yearId &&
      context.quarterId === target.quarterId &&
      context.monthId === target.monthId &&
      context.weekId === target.weekId;

    return (task, weekNode, context = {}) => {
      const cf = task?.customFields || {};
      const target = {
        yearId: String(context.yearId || '').trim(),
        quarterId: String(context.quarterId || '').trim(),
        monthId: String(context.monthId || '').trim(),
        weekId: String(weekNode?.id || '').trim(),
      };

      const taskYearId = String(cf.yearlyGoalId || cf.planningYearId || '').trim();
      const taskQuarterId = String(cf.quarterlyGoalId || cf.planningQuarterId || '').trim();
      const taskMonthId = String(cf.monthlyGoalId || cf.planningMonthId || '').trim();
      const weeklyGoalId = String(cf.weeklyGoalId || cf.planningWeekId || '').trim();
      const dailyGoalId = String(cf.dailyGoalId || '').trim();
      const explicitWeekChainKey = String(cf.weekChainKey || '').trim();
      const explicitDayChainKey = String(cf.dayChainKey || '').trim();
      const targetWeekChainKey = buildVisionChainKey(target);

      if (explicitWeekChainKey) {
        return explicitWeekChainKey === targetWeekChainKey;
      }

      if (explicitDayChainKey) {
        return explicitDayChainKey.startsWith(`${targetWeekChainKey}::`);
      }

      if (taskYearId && taskQuarterId && taskMonthId && weeklyGoalId) {
        return (
          taskYearId === target.yearId &&
          taskQuarterId === target.quarterId &&
          taskMonthId === target.monthId &&
          weeklyGoalId === target.weekId
        );
      }

      if (weeklyGoalId) {
        const weekContext = goalContextMaps.weekContextById.get(weeklyGoalId);
        if (weekContext && !weekContext.ambiguous) {
          return matchesWeekContext(weekContext, target);
        }
      }

      if (dailyGoalId) {
        const dayContext = goalContextMaps.dayContextById.get(dailyGoalId);
        if (dayContext && !dayContext.ambiguous) {
          return matchesWeekContext(dayContext, target);
        }
      }

      return false;
    };
  }, [goalContextMaps]);

  const doesTaskBelongToDayNode = useMemo(() => {
    const matchesDayContext = (context, target) =>
      !!context &&
      context.yearId === target.yearId &&
      context.quarterId === target.quarterId &&
      context.monthId === target.monthId &&
      context.weekId === target.weekId &&
      context.dayId === target.dayId;

    return (task, dayNode, context = {}) => {
      const cf = task?.customFields || {};
      const target = {
        yearId: String(context.yearId || '').trim(),
        quarterId: String(context.quarterId || '').trim(),
        monthId: String(context.monthId || '').trim(),
        weekId: String(context.weekId || '').trim(),
        dayId: String(dayNode?.id || '').trim(),
      };

      const taskYearId = String(cf.yearlyGoalId || cf.planningYearId || '').trim();
      const taskQuarterId = String(cf.quarterlyGoalId || cf.planningQuarterId || '').trim();
      const taskMonthId = String(cf.monthlyGoalId || cf.planningMonthId || '').trim();
      const weeklyGoalId = String(cf.weeklyGoalId || cf.planningWeekId || '').trim();
      const dailyGoalId = String(cf.dailyGoalId || '').trim();
      const explicitDayChainKey = String(cf.dayChainKey || '').trim();
      const targetDayChainKey = buildVisionChainKey(target);

      if (explicitDayChainKey) {
        return explicitDayChainKey === targetDayChainKey;
      }

      if (taskYearId && taskQuarterId && taskMonthId && weeklyGoalId && dailyGoalId) {
        return (
          taskYearId === target.yearId &&
          taskQuarterId === target.quarterId &&
          taskMonthId === target.monthId &&
          weeklyGoalId === target.weekId &&
          dailyGoalId === target.dayId
        );
      }

      if (dailyGoalId) {
        const dayContext = goalContextMaps.dayContextById.get(dailyGoalId);
        if (dayContext && !dayContext.ambiguous) {
          return matchesDayContext(dayContext, target);
        }
      }

      return false;
    };
  }, [goalContextMaps]);

  const isTaskLinkedToSelectedWeek = useMemo(() => {
    return (task) => {
      return doesTaskBelongToWeekNode(task, selectedWeek, {
        yearId: selectedYear?.id,
        quarterId: selectedQuarter?.id,
        monthId: selectedMonth?.id,
      });
    };
  }, [doesTaskBelongToWeekNode, selectedYear?.id, selectedQuarter?.id, selectedMonth?.id, selectedWeek]);

  const selectedDayTasks = useMemo(() => {
    if (!selectedDay) return [];
    return spacesTasks.filter((task) =>
      doesTaskBelongToDayNode(task, selectedDay, {
        yearId: selectedYear?.id,
        quarterId: selectedQuarter?.id,
        monthId: selectedMonth?.id,
        weekId: selectedWeek?.id,
      }),
    );
  }, [spacesTasks, selectedYear?.id, selectedQuarter?.id, selectedMonth?.id, selectedWeek?.id, selectedDay, doesTaskBelongToDayNode]);

  const weekCardProgressById = useMemo(() => {
    const map = new Map();
    const weeks = selectedMonth?.weeks || [];
    if (!weeks.length) return map;

    weeks.forEach((week) => {
      const linkedTasks = spacesTasks.filter((task) => {
        return doesTaskBelongToWeekNode(task, week, {
          yearId: selectedYear?.id,
          quarterId: selectedQuarter?.id,
          monthId: selectedMonth?.id,
        });
      });
      const total = linkedTasks.length;
      const done = linkedTasks.filter((task) => String(task.status || '').toLowerCase() === 'done').length;
      map.set(String(week?.id || '').trim(), total ? Math.round((done / total) * 100) : 0);
    });

    return map;
  }, [selectedMonth?.weeks, selectedYear?.id, selectedQuarter?.id, selectedMonth?.id, spacesTasks, doesTaskBelongToWeekNode]);

  const hierarchyProgressById = useMemo(() => {
    const yearMap = new Map();
    const quarterMap = new Map();
    const monthMap = new Map();

    const percentFromTasksForWeekNode = (weekNode, context) => {
      const linkedTasks = spacesTasks.filter((task) => {
        return doesTaskBelongToWeekNode(task, weekNode, context);
      });
      const total = linkedTasks.length;
      const done = linkedTasks.filter((task) => String(task.status || '').toLowerCase() === 'done').length;
      return total ? Math.round((done / total) * 100) : 0;
    };

    const avg = (values) => {
      if (!values.length) return 0;
      const sum = values.reduce((s, v) => s + (Number.isFinite(v) ? v : 0), 0);
      return Math.round(sum / values.length);
    };

    (ctx.visions || []).forEach((yearNode) => {
      const quarterPercents = (yearNode?.quarters || []).map((quarterNode) => {
        const monthPercents = (quarterNode?.months || []).map((monthNode) => {
          const weekPercents = (monthNode?.weeks || []).map((weekNode) =>
            percentFromTasksForWeekNode(weekNode, {
              yearId: yearNode?.id,
              quarterId: quarterNode?.id,
              monthId: monthNode?.id,
            }),
          );
          const monthPercent = avg(weekPercents);
          monthMap.set(String(monthNode.id || '').trim(), monthPercent);
          return monthPercent;
        });
        const quarterPercent = avg(monthPercents);
        quarterMap.set(String(quarterNode.id || '').trim(), quarterPercent);
        return quarterPercent;
      });
      const yearPercent = avg(quarterPercents);
      yearMap.set(String(yearNode.id || '').trim(), yearPercent);
    });

    return { yearMap, quarterMap, monthMap };
  }, [ctx.visions, spacesTasks, doesTaskBelongToWeekNode]);

  const weekProgress = useMemo(() => {
    if (!selectedWeek?.days?.length || !selectedMonth?.timeline || !selectedQuarter?.timeline) {
      return { percent: 0, doneTasks: 0, totalTasks: 0 };
    }

    const tasksForThisWeek = spacesTasks.filter((task) => isTaskLinkedToSelectedWeek(task));
    const totalTasks = tasksForThisWeek.length;
    const doneTasks = tasksForThisWeek.filter((task) => String(task.status || '').toLowerCase() === 'done').length;
    const percent = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;
    return { percent, doneTasks, totalTasks };
  }, [selectedWeek, selectedMonth?.timeline, selectedQuarter?.timeline, spacesTasks, isTaskLinkedToSelectedWeek]);

  const getDefaultTaskDraft = (day, week) => ({
    title: day?.text || '',
    description: `Created from Daily plan: ${week?.text || 'Weekly Goal'}`,
    assigneeId: me.empId || '',
    dueDate: '',
    priority: 'medium',
    status: 'todo',
  });

  const getTaskDraftForDay = (day, week = selectedWeek) => {
    const fallback = getDefaultTaskDraft(day, week);
    if (!day) return fallback;
    return {
      ...fallback,
      ...(taskDraftByDay[day.id] || {}),
    };
  };

  const updateSelectedDayTaskDraft = (patch) => {
    if (!selectedDay) return;
    setTaskDraftByDay((prev) => ({
      ...prev,
      [selectedDay.id]: {
        ...getDefaultTaskDraft(selectedDay, selectedWeek),
        ...(prev[selectedDay.id] || {}),
        ...patch,
      },
    }));
  };

  const closeTaskComposer = () => {
    setShowTaskComposer(false);
    setEditingTaskId('');
    setTaskError('');
  };

  const selectedTaskDraft = selectedDay ? getTaskDraftForDay(selectedDay, selectedWeek) : getDefaultTaskDraft(null, selectedWeek);
  const selectedTaskDocument = selectedDay ? taskDocumentByDay[selectedDay.id] || null : null;
  const editingTask = editingTaskId ? spacesTasks.find((task) => task.taskId === editingTaskId) || null : null;
  const viewingTask = viewingTaskId ? spacesTasks.find((task) => task.taskId === viewingTaskId) || null : null;
  const editingTaskDocumentUrl = String(editingTask?.documentUrl || '').trim();
  const editingTaskDocumentName = String(editingTask?.documentName || '').trim() || 'Current document';

  const syncDayCompletionFromTasks = async (day, tasksForDay) => {
    if (!day) return;
    const done = tasksForDay.length > 0 && tasksForDay.every((task) => String(task.status || '').toLowerCase() === 'done');
    if (!!day.completed === done) return;
    const nextGoal = {
      id: day.id,
      text: day.text || '',
      details: day.details || '',
      completed: done,
      level: 'day',
      parentId: day.parentId || '',
      timeline: day.timeline || '',
    };
    updateState((prev) => upsertGoalIntoState(prev, nextGoal));
    try {
      await persistGoal(nextGoal);
    } catch (error) {
      console.error(error);
    }
  };

  const createTaskForSelectedDay = async () => {
    if (!selectedDay || !selectedWeek) return;
    const draft = getTaskDraftForDay(selectedDay, selectedWeek);
    const taskDocumentFile = taskDocumentByDay[selectedDay.id] || null;
    const existingTask = editingTaskId ? spacesTasks.find((task) => task.taskId === editingTaskId) || null : null;
    const title = String(draft.title || selectedDay.text || '').trim();
    const assigneeId = String(draft.assigneeId || me.empId || '').trim();
    const dueDate = String(draft.dueDate || '').trim();
    const priority = String(draft.priority || 'medium').trim() || 'medium';
    const status = String(draft.status || 'todo').trim() || 'todo';
    const description = String(draft.description || `Created from Daily plan: ${selectedWeek.text || 'Weekly Goal'}`).trim();
    if (!title) {
      setTaskError('Task title is required.');
      return;
    }
    if (!assigneeId) {
      setTaskError('Assignee is required.');
      return;
    }
    setSavingTaskDayId(selectedDay.id);
    setTaskError('');
    try {
      let uploadedDocument = existingTask
        ? {
            documentUrl: String(existingTask.documentUrl || ''),
            documentName: String(existingTask.documentName || ''),
            documentMimeType: String(existingTask.documentMimeType || ''),
          }
        : null;

      if (taskDocumentFile) {
        setUploadingTaskDocument(true);
        const formData = new FormData();
        formData.append('file', taskDocumentFile);
        const session = getStoredAuthSession();
        const token = typeof session?.token === 'string' ? session.token : '';
        const uploadRes = await fetch(`${API_BASE}/spaces/tasks/upload-document`, {
          method: 'POST',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: formData,
        });
        const uploaded = await uploadRes.json().catch(() => ({}));
        if (!uploadRes.ok) {
          throw new Error(uploaded?.message || 'Failed to upload task document');
        }
        uploadedDocument = {
          documentUrl: String(uploaded?.documentUrl || ''),
          documentName: String(uploaded?.documentName || taskDocumentFile.name || ''),
          documentMimeType: String(uploaded?.documentMimeType || taskDocumentFile.type || ''),
        };
      }

      const requestBody = {
        title,
        assigneeId,
        dueDate,
        priority,
        status,
        description,
        documentUrl: uploadedDocument?.documentUrl || '',
        documentName: uploadedDocument?.documentName || '',
        documentMimeType: uploadedDocument?.documentMimeType || '',
        customFields: {
          yearlyGoalId: selectedYear?.id || '',
          quarterlyGoalId: selectedQuarter?.id || '',
          monthlyGoalId: selectedMonth?.id || '',
          dailyGoalId: selectedDay.id,
          weeklyGoalId: selectedWeek.id,
          weekChainKey: buildVisionChainKey({
            yearId: selectedYear?.id,
            quarterId: selectedQuarter?.id,
            monthId: selectedMonth?.id,
            weekId: selectedWeek?.id,
          }),
          dayChainKey: buildVisionChainKey({
            yearId: selectedYear?.id,
            quarterId: selectedQuarter?.id,
            monthId: selectedMonth?.id,
            weekId: selectedWeek?.id,
            dayId: selectedDay?.id,
          }),
          dailyGoalText: selectedDay.text || '',
        },
      };

      const res = await fetch(existingTask ? `${API_BASE}/spaces/tasks/${existingTask.taskId}` : `${API_BASE}/spaces/tasks`, {
        method: existingTask ? 'PATCH' : 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(requestBody),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.message || (existingTask ? 'Failed to update task' : 'Failed to create task'));
      }
      const nextTasks = existingTask
        ? spacesTasks.map((item) =>
            item.taskId === existingTask.taskId
              ? {
                  ...item,
                  ...payload,
                  taskId: payload?.taskId || item.taskId,
                  customFields: payload?.customFields || item.customFields,
                }
              : item,
          )
        : [payload, ...spacesTasks];
      setSpacesTasks(nextTasks);
      const tasksForDay = nextTasks.filter((item) =>
        doesTaskBelongToDayNode(item, selectedDay, {
          yearId: selectedYear?.id,
          quarterId: selectedQuarter?.id,
          monthId: selectedMonth?.id,
          weekId: selectedWeek?.id,
        }),
      );
      await syncDayCompletionFromTasks(selectedDay, tasksForDay);
      closeTaskComposer();
      setTaskDraftByDay((prev) => ({
        ...prev,
        [selectedDay.id]: getDefaultTaskDraft(selectedDay, selectedWeek),
      }));
      setTaskDocumentByDay((prev) => ({
        ...prev,
        [selectedDay.id]: null,
      }));
      setOpenTaskMenuId('');
    } catch (error) {
      setTaskError(error?.message || (existingTask ? 'Failed to update task' : 'Failed to create task'));
    } finally {
      setUploadingTaskDocument(false);
      setSavingTaskDayId('');
    }
  };

  const updateTaskStatus = async (task, checked) => {
    if (!task?.taskId || !selectedDay) return;
    const nextStatus = checked ? 'done' : 'todo';
    setTaskError('');
    const previous = spacesTasks;
    const optimistic = previous.map((item) => (item.taskId === task.taskId ? { ...item, status: nextStatus } : item));
    setSpacesTasks(optimistic);
    try {
      const res = await fetch(`${API_BASE}/spaces/tasks/${task.taskId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.message || 'Failed to update task status');
      }
      const updated = await res.json().catch(() => ({}));
      const nextTasks = optimistic.map((item) => {
        if (item.taskId !== task.taskId) return item;
        return {
          ...item,
          ...updated,
          // Preserve linking fields if patch response omits them.
          taskId: updated?.taskId || item.taskId,
          customFields: updated?.customFields || item.customFields,
        };
      });
      setSpacesTasks(nextTasks);
      const nextDayTasks = nextTasks.filter((item) => {
        return doesTaskBelongToDayNode(item, selectedDay, {
          yearId: selectedYear?.id,
          quarterId: selectedQuarter?.id,
          monthId: selectedMonth?.id,
          weekId: selectedWeek?.id,
        });
      });
      await syncDayCompletionFromTasks(selectedDay, nextDayTasks);
    } catch (error) {
      setSpacesTasks(previous);
      setTaskError(error?.message || 'Failed to update task status');
    }
  };

  const deleteTaskFromDay = async (task) => {
    if (!isAdmin || !task?.taskId || !selectedDay) return;
    setDeletingTaskId(task.taskId);
    setOpenTaskMenuId('');
    setTaskError('');
    const previous = spacesTasks;
    const optimistic = previous.filter((item) => item.taskId !== task.taskId);
    setSpacesTasks(optimistic);
    try {
      const res = await fetch(`${API_BASE}/spaces/tasks/${task.taskId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.message || 'Failed to delete task');
      }
      const nextDayTasks = optimistic.filter((item) => {
        return doesTaskBelongToDayNode(item, selectedDay, {
          yearId: selectedYear?.id,
          quarterId: selectedQuarter?.id,
          monthId: selectedMonth?.id,
          weekId: selectedWeek?.id,
        });
      });
      await syncDayCompletionFromTasks(selectedDay, nextDayTasks);
    } catch (error) {
      setSpacesTasks(previous);
      setTaskError(error?.message || 'Failed to delete task');
    } finally {
      setDeletingTaskId('');
    }
  };

  const openTaskEditor = (task) => {
    if (!selectedDay || !task?.taskId) return;
    setTaskDraftByDay((prev) => ({
      ...prev,
      [selectedDay.id]: {
        title: String(task.title || selectedDay.text || ''),
        description: String(task.description || `Created from Daily plan: ${selectedWeek?.text || 'Weekly Goal'}`),
        assigneeId: String(task.assigneeId || me.empId || ''),
        dueDate: String(task.dueDate || ''),
        priority: String(task.priority || 'medium'),
        status: String(task.status || 'todo'),
      },
    }));
    setTaskDocumentByDay((prev) => ({
      ...prev,
      [selectedDay.id]: null,
    }));
    setEditingTaskId(task.taskId);
    setOpenTaskMenuId('');
    setTaskError('');
    setShowTaskComposer(true);
  };

  const openTaskViewer = (task) => {
    if (!task?.taskId) return;
    setViewingTaskId(task.taskId);
    setOpenTaskMenuId('');
  };

  return {
    selectedDayIndex,
    selectedDay,
    doesTaskBelongToWeekNode,
    doesTaskBelongToDayNode,
    isTaskLinkedToSelectedWeek,
    selectedDayTasks,
    weekCardProgressById,
    hierarchyProgressById,
    weekProgress,
    getDefaultTaskDraft,
    getTaskDraftForDay,
    updateSelectedDayTaskDraft,
    closeTaskComposer,
    selectedTaskDraft,
    selectedTaskDocument,
    editingTask,
    viewingTask,
    editingTaskDocumentUrl,
    editingTaskDocumentName,
    syncDayCompletionFromTasks,
    createTaskForSelectedDay,
    updateTaskStatus,
    deleteTaskFromDay,
    openTaskEditor,
    openTaskViewer,
  };
};
