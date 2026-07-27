import { useEffect, useMemo, useState } from 'react';
import { QUARTER_LABELS } from '../../appSeedConstants';
import { saveGoal } from '../../services/goalApi';
import type { Goal, PlanningState } from '../../types';
import type { SpacesTask, WeeklyTaskGroup } from '../../types/spaces';
import type { MonthGoalContext } from '../../components/spaces/monthGoalsHelpers';
import { parseDateValue } from '../../components/spaces/SpacesFormControls';
import { NO_VISION_SELECTOR_VALUE } from '../../utils/spaces/taskRecurrence';
import {
  buildWeeklyTaskGroups,
  createDaysForWeekHelper,
  ensureWeeklyGroupPersistedHelper,
  getDayDisplay,
  getWeekBreadcrumb,
  getWeekStartDate,
  toggleDailyHelper,
} from '../../views/spacesViewHelpers';

export interface UseSpacesWeeklyPlannerParams {
  state?: PlanningState;
  updateState?: (updater: (prev: PlanningState) => PlanningState) => PlanningState;
  visibleTasks: SpacesTask[];
  weeklyProjectOptions: Array<{ value: string; label: string; description: string }>;
  yearlyVisionMetaById: Map<string, { title: string; details: string }>;
  createTaskMonthGoalContext: MonthGoalContext | null;
  canManageWeeklyRows: boolean;
  canToggleWeeklyDay: boolean;
}

/**
 * Owns the quarter/month/week planner navigation used by the Daily/Weekly
 * task creation flow (weeklyPeriodPicker) plus the weekly task groups it is
 * built from. Extracted from useSpacesViewController without changing behavior.
 */
export const useSpacesWeeklyPlanner = ({
  state,
  updateState,
  visibleTasks,
  weeklyProjectOptions,
  yearlyVisionMetaById,
  createTaskMonthGoalContext,
  canManageWeeklyRows,
  canToggleWeeklyDay,
}: UseSpacesWeeklyPlannerParams) => {
  const [weeklyError, setWeeklyError] = useState('');
  const [selectedDayByWeek, setSelectedDayByWeek] = useState<Record<string, string>>({});
  const [selectedWeeklyProjectId, setSelectedWeeklyProjectId] = useState('');
  const [selectedWeeklyQuarterId, setSelectedWeeklyQuarterId] = useState('');
  const [selectedWeeklyMonthId, setSelectedWeeklyMonthId] = useState('');
  const [selectedWeeklyGroupId, setSelectedWeeklyGroupId] = useState('');
  const [createTaskPlannerEnabled, setCreateTaskPlannerEnabled] = useState(false);
  const [createTaskPlannerQuarterId, setCreateTaskPlannerQuarterId] = useState('');
  const [createTaskPlannerMonthId, setCreateTaskPlannerMonthId] = useState('');
  const [createTaskPlannerWeekId, setCreateTaskPlannerWeekId] = useState('');
  const [createTaskPlannerDayId, setCreateTaskPlannerDayId] = useState('');

  const weeklyTaskGroups = useMemo<WeeklyTaskGroup[]>(
    () => buildWeeklyTaskGroups(state, visibleTasks, parseDateValue),
    [state, visibleTasks],
  );
  const isNoVisionSelected = selectedWeeklyProjectId === NO_VISION_SELECTOR_VALUE;
  const noVisionWeeklyGroups = useMemo<WeeklyTaskGroup[]>(() => {
    if (!weeklyTaskGroups.length) return [];
    const uniqueGroups = new Map<string, WeeklyTaskGroup>();

    weeklyTaskGroups.forEach((group) => {
      const baseKey = [
        group.quarterLabel,
        group.monthLabel,
        group.weekLabel,
        group.weekRangeLabel,
      ].join('::');
      if (uniqueGroups.has(baseKey)) return;

      const quarterId = group.quarterId;
      const monthId = group.monthId;
      const syntheticWeekId = `${NO_VISION_SELECTOR_VALUE}::${quarterId}::${monthId}::${group.weekLabel}::${group.weekRangeLabel}`;
      const syntheticWeek = {
        ...group.week,
        id: syntheticWeekId,
        parentId: monthId,
        text: String(group.week.text || '').trim() || 'Weekly goal',
      };
      const syntheticDays = group.days.map((day, index) => ({
        ...day,
        id: `${syntheticWeekId}::day-${index + 1}`,
        parentId: syntheticWeekId,
        text: String(day.text || '').trim() || `Day ${index + 1}`,
      }));

      uniqueGroups.set(baseKey, {
        ...group,
        year: undefined,
        quarter: undefined,
        month: undefined,
        yearId: NO_VISION_SELECTOR_VALUE,
        quarterId,
        monthId,
        weekId: syntheticWeekId,
        week: syntheticWeek,
        days: syntheticDays,
        breadcrumbLabel: [group.quarterLabel, group.monthLabel, group.weekLabel].join(' > '),
        weekSelectionKey: syntheticWeekId,
      });
    });

    return Array.from(uniqueGroups.values()).sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime());
  }, [weeklyTaskGroups]);
  const activeWeeklyGroups = isNoVisionSelected ? noVisionWeeklyGroups : weeklyTaskGroups;

  const defaultNoVisionWeeklyTaskGroup = useMemo(() => {
    if (!noVisionWeeklyGroups.length) return null;
    const today = new Date();
    return (
      noVisionWeeklyGroups.find((group) => group.weekEnd.getTime() >= today.getTime()) ||
      noVisionWeeklyGroups[noVisionWeeklyGroups.length - 1] ||
      noVisionWeeklyGroups[0]
    );
  }, [noVisionWeeklyGroups]);

  const getWeekBreadcrumbForView = (weekId: string): string => getWeekBreadcrumb(state, weekId);
  const getWeekStartDateForView = (week: Goal, days: Goal[]): Date =>
    getWeekStartDate(week, days, visibleTasks, parseDateValue);

  const defaultWeeklyTaskGroup = useMemo(() => {
    if (!weeklyTaskGroups.length) return null;
    const today = new Date();
    return (
      weeklyTaskGroups.find((group) => group.weekEnd.getTime() >= today.getTime()) ||
      weeklyTaskGroups[weeklyTaskGroups.length - 1] ||
      weeklyTaskGroups[0]
    );
  }, [weeklyTaskGroups]);

  const defaultWeeklyTaskGroupForSelectedProject = useMemo(() => {
    if (selectedWeeklyProjectId === NO_VISION_SELECTOR_VALUE) {
      return (
        noVisionWeeklyGroups.find(
          (group) =>
            (!selectedWeeklyQuarterId || group.quarterId === selectedWeeklyQuarterId) &&
            (!selectedWeeklyMonthId || group.monthId === selectedWeeklyMonthId) &&
            (!selectedWeeklyGroupId || group.weekSelectionKey === selectedWeeklyGroupId),
        ) ||
        defaultNoVisionWeeklyTaskGroup ||
        defaultWeeklyTaskGroup
      );
    }
    const activeYearId =
      selectedWeeklyProjectId ||
      defaultWeeklyTaskGroup?.yearId ||
      state?.yearlyGoals?.[0]?.id ||
      '';
    const scopedGroups = weeklyTaskGroups.filter((group) => group.yearId === activeYearId);
    if (!scopedGroups.length) return defaultWeeklyTaskGroup;
    const today = new Date();
    return (
      scopedGroups.find((group) => group.weekEnd.getTime() >= today.getTime()) ||
      scopedGroups[scopedGroups.length - 1] ||
      scopedGroups[0]
    );
  }, [defaultNoVisionWeeklyTaskGroup, defaultWeeklyTaskGroup, noVisionWeeklyGroups, selectedWeeklyGroupId, selectedWeeklyMonthId, selectedWeeklyProjectId, selectedWeeklyQuarterId, state, weeklyTaskGroups]);

  const weeklyQuarterOptions = useMemo(() => {
    const selectedQuarterGoal = (state?.quarterlyGoals || []).find((quarter) => quarter.id === selectedWeeklyQuarterId);
    const activeYearId =
      selectedWeeklyProjectId === NO_VISION_SELECTOR_VALUE
        ? String(selectedQuarterGoal?.parentId || defaultWeeklyTaskGroup?.yearId || state?.yearlyGoals?.[0]?.id || '')
        : selectedWeeklyProjectId ||
      defaultWeeklyTaskGroupForSelectedProject?.yearId ||
      state?.yearlyGoals?.[0]?.id ||
      '';
    const quarterGoals = (state?.quarterlyGoals || []).filter((quarter) => quarter.parentId === activeYearId);
    return QUARTER_LABELS.map((quarterLabel, index) => {
      const label = quarterLabel;
      const quarterNumber = index + 1;
      const startMonth = ((quarterNumber - 1) * 3) + 1;
      const endMonth = startMonth + 2;
      const quarter = quarterGoals.find((item) => String(item.timeline || '').trim().toUpperCase() === quarterLabel);
      const quarterSummary = String(quarter?.text || quarter?.details || '').trim() || 'Quarter plan';
      return {
        value: quarter?.id || `${activeYearId || 'year'}-${quarterLabel.toLowerCase()}`,
        label,
        caption: `Months ${startMonth}-${endMonth}`,
        description: quarterSummary,
      };
    });
  }, [defaultWeeklyTaskGroup?.yearId, defaultWeeklyTaskGroupForSelectedProject?.yearId, selectedWeeklyProjectId, selectedWeeklyQuarterId, state]);

  useEffect(() => {
    if (!weeklyProjectOptions.length) {
      setSelectedWeeklyProjectId('');
      return;
    }

    setSelectedWeeklyProjectId((prev) => {
      if (prev && weeklyProjectOptions.some((option) => option.value === prev)) {
        return prev;
      }
      if (
        defaultWeeklyTaskGroupForSelectedProject?.yearId &&
        weeklyProjectOptions.some((option) => option.value === defaultWeeklyTaskGroupForSelectedProject.yearId)
      ) {
        return defaultWeeklyTaskGroupForSelectedProject.yearId;
      }
      return weeklyProjectOptions[0]?.value || '';
    });
  }, [defaultWeeklyTaskGroupForSelectedProject, weeklyProjectOptions]);

  useEffect(() => {
    if (!weeklyQuarterOptions.length) {
      setSelectedWeeklyQuarterId('');
      return;
    }

    setSelectedWeeklyQuarterId((prev) => {
      if (prev && weeklyQuarterOptions.some((option) => option.value === prev)) {
        return prev;
      }
      if (
        defaultWeeklyTaskGroupForSelectedProject?.quarterId &&
        weeklyQuarterOptions.some((option) => option.value === defaultWeeklyTaskGroupForSelectedProject.quarterId)
      ) {
        return defaultWeeklyTaskGroupForSelectedProject.quarterId;
      }
      return weeklyQuarterOptions[0]?.value || '';
    });
  }, [defaultWeeklyTaskGroupForSelectedProject, weeklyQuarterOptions]);

  const weeklyMonthOptions = useMemo(() => {
    const quarterMonths = (state?.monthlyGoals || [])
      .filter((month) => month.parentId === selectedWeeklyQuarterId)
      .sort((a, b) => {
        const aOrder = Number(String(a.timeline || '').replace(/[^0-9]/g, '')) || 0;
        const bOrder = Number(String(b.timeline || '').replace(/[^0-9]/g, '')) || 0;
        return aOrder - bOrder;
      });
    const selectedVision = yearlyVisionMetaById.get(selectedWeeklyProjectId);
    const selectedVisionTitle =
      selectedWeeklyProjectId === NO_VISION_SELECTOR_VALUE ? 'No vision' : selectedVision?.title || 'Selected vision';
    const selectedVisionDetails =
      selectedWeeklyProjectId === NO_VISION_SELECTOR_VALUE
        ? 'Not linked to the Vision planner'
        : selectedVision?.details || selectedVisionTitle;
    const selectedQuarterLabel =
      weeklyQuarterOptions.find((option) => option.value === selectedWeeklyQuarterId)?.label || 'Q1';
    const selectedQuarterNumber = Number(String(selectedQuarterLabel).replace(/[^0-9]/g, '')) || 1;
    return quarterMonths.slice(0, 3).map((month, index) => {
      const absoluteMonthNumber = ((selectedQuarterNumber - 1) * 3) + index + 1;
      const calendarMonthName = new Date(Number(state?.currentYear) || new Date().getFullYear(), absoluteMonthNumber - 1, 1).toLocaleDateString(undefined, { month: 'long' });
      return {
        value: month.id,
        label: `M${absoluteMonthNumber}`,
        caption: calendarMonthName,
        description: selectedVisionDetails || selectedVisionTitle,
      };
    });
  }, [selectedWeeklyProjectId, selectedWeeklyQuarterId, state, weeklyQuarterOptions, yearlyVisionMetaById]);

  useEffect(() => {
    if (!weeklyMonthOptions.length) {
      setSelectedWeeklyMonthId('');
      return;
    }

    setSelectedWeeklyMonthId((prev) => {
      if (prev && weeklyMonthOptions.some((option) => option.value === prev)) {
        return prev;
      }
      if (
        defaultWeeklyTaskGroupForSelectedProject?.quarterId === selectedWeeklyQuarterId &&
        weeklyMonthOptions.some((option) => option.value === defaultWeeklyTaskGroupForSelectedProject.monthId)
      ) {
        return defaultWeeklyTaskGroupForSelectedProject.monthId;
      }
      return weeklyMonthOptions[0]?.value || '';
    });
  }, [defaultWeeklyTaskGroupForSelectedProject, selectedWeeklyQuarterId, weeklyMonthOptions]);

  const weeklyWeekOptions = useMemo(() => {
    const groupsForMonth = activeWeeklyGroups.filter((group) => group.monthId === selectedWeeklyMonthId);
    const uniqueOptions = new Map<
      string,
      { value: string; label: string; caption: string; description: string; isPlaceholderWeek?: boolean }
    >();

    groupsForMonth.forEach((group) => {
      const optionKey = `${group.weekLabel}::${group.weekRangeLabel}`;
      const nextOption = {
        value: group.weekSelectionKey,
        label: group.weekLabel,
        caption: group.weekRangeLabel,
        description: group.week.text || yearlyVisionMetaById.get(selectedWeeklyProjectId)?.details || 'Weekly goal',
        isPlaceholderWeek: group.isPlaceholderWeek,
      };
      const existingOption = uniqueOptions.get(optionKey);

      if (
        !existingOption ||
        (existingOption.isPlaceholderWeek && !nextOption.isPlaceholderWeek) ||
        (existingOption.description === 'Weekly goal' && nextOption.description !== 'Weekly goal')
      ) {
        uniqueOptions.set(optionKey, nextOption);
      }
    });

    return Array.from(uniqueOptions.values()).map(({ isPlaceholderWeek: _omit, ...option }) => option);
  }, [activeWeeklyGroups, selectedWeeklyMonthId, selectedWeeklyProjectId, yearlyVisionMetaById]);

  const selectedWeeklyWeekId = useMemo(() => {
    if (!weeklyWeekOptions.length) return '';
    if (selectedWeeklyGroupId && weeklyWeekOptions.some((option) => option.value === selectedWeeklyGroupId)) {
      return selectedWeeklyGroupId;
    }
    return weeklyWeekOptions[0]?.value || '';
  }, [selectedWeeklyGroupId, weeklyWeekOptions]);

  useEffect(() => {
    if (!weeklyWeekOptions.length) {
      setSelectedWeeklyGroupId('');
      return;
    }

    setSelectedWeeklyGroupId((prev) => {
      if (prev && weeklyWeekOptions.some((option) => option.value === prev)) {
        return prev;
      }
      if (
        defaultWeeklyTaskGroupForSelectedProject?.monthId === selectedWeeklyMonthId &&
        weeklyWeekOptions.some((option) => option.value === defaultWeeklyTaskGroupForSelectedProject.weekSelectionKey)
      ) {
        return defaultWeeklyTaskGroupForSelectedProject.weekSelectionKey;
      }
      return weeklyWeekOptions[0]?.value || '';
    });
  }, [defaultWeeklyTaskGroupForSelectedProject, selectedWeeklyMonthId, weeklyWeekOptions]);

  const selectedWeeklyTaskGroup = useMemo(
    () =>
      activeWeeklyGroups.find(
        (group) =>
          (isNoVisionSelected || group.yearId === selectedWeeklyProjectId) &&
          group.quarterId === selectedWeeklyQuarterId &&
          group.monthId === selectedWeeklyMonthId &&
          group.weekSelectionKey === selectedWeeklyWeekId,
      ) ||
      activeWeeklyGroups.find(
        (group) =>
          (isNoVisionSelected || group.yearId === selectedWeeklyProjectId) &&
          group.quarterId === selectedWeeklyQuarterId &&
          group.monthId === selectedWeeklyMonthId &&
          group.weekSelectionKey === weeklyWeekOptions[0]?.value,
      ) ||
      null,
    [activeWeeklyGroups, isNoVisionSelected, selectedWeeklyMonthId, selectedWeeklyProjectId, selectedWeeklyQuarterId, selectedWeeklyWeekId, weeklyWeekOptions],
  );
  const selectedWeeklyDay = useMemo(() => {
    if (!selectedWeeklyTaskGroup?.days?.length) return null;
    const explicitSelectedDayId = selectedDayByWeek[selectedWeeklyTaskGroup.weekId] || '';
    const today = new Date();
    const normalizedToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const todayDay =
      selectedWeeklyTaskGroup.days.find((day, index) => {
        const dayDate = new Date(selectedWeeklyTaskGroup.weekStart);
        dayDate.setDate(selectedWeeklyTaskGroup.weekStart.getDate() + index);
        const normalizedDay = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate()).getTime();
        return normalizedDay === normalizedToday;
      }) || null;
    const selectedDayId = explicitSelectedDayId || todayDay?.id || selectedWeeklyTaskGroup.days[0]?.id || '';
    return selectedWeeklyTaskGroup.days.find((day) => day.id === selectedDayId) || todayDay || selectedWeeklyTaskGroup.days[0] || null;
  }, [selectedDayByWeek, selectedWeeklyTaskGroup]);
  const activeQuarterOption = weeklyQuarterOptions.find((option) => option.value === selectedWeeklyQuarterId) || null;
  const activeMonthOption = weeklyMonthOptions.find((option) => option.value === selectedWeeklyMonthId) || null;
  const activeWeekOption = weeklyWeekOptions.find((option) => option.value === selectedWeeklyWeekId) || null;

  const handleWeeklyProjectChange = (visionId: string) => {
    setSelectedWeeklyProjectId(visionId);
    if (visionId === NO_VISION_SELECTOR_VALUE) return;
    setSelectedWeeklyQuarterId('');
    setSelectedWeeklyMonthId('');
    setSelectedWeeklyGroupId('');
  };

  const handleWeeklyQuarterChange = (quarterId: string) => {
    if (quarterId === selectedWeeklyQuarterId) return;
    setSelectedWeeklyQuarterId(quarterId);
    setSelectedWeeklyMonthId('');
    setSelectedWeeklyGroupId('');
  };

  const handleWeeklyMonthChange = (monthId: string) => {
    setSelectedWeeklyMonthId(monthId);
    setSelectedWeeklyGroupId('');
  };

  const handleWeeklyWeekChange = (weekId: string) => {
    setSelectedWeeklyGroupId(weekId);
  };

  const plannerWeekOptions = useMemo(
    () =>
      activeWeeklyGroups.map((group) => ({
        value: group.weekSelectionKey,
        label: `${group.weekSummaryLabel} · ${group.weekRangeLabel}`,
      })),
    [activeWeeklyGroups],
  );

  const selectedPlannerWeekGroup = useMemo(
    () => activeWeeklyGroups.find((group) => group.weekSelectionKey === createTaskPlannerWeekId) || null,
    [activeWeeklyGroups, createTaskPlannerWeekId],
  );

  const plannerDayOptions = useMemo(() => {
    if (!selectedPlannerWeekGroup?.days?.length) return [];
    return selectedPlannerWeekGroup.days.map((day, idx) => {
      const info = getDayDisplay(selectedPlannerWeekGroup.weekStart, idx);
      return {
        value: day.id,
        label: `${info.weekday} · ${info.dateText}`,
      };
    });
  }, [getDayDisplay, selectedPlannerWeekGroup]);

  const plannerSummary = useMemo(() => {
    if (createTaskMonthGoalContext) {
      return `${createTaskMonthGoalContext.monthLabel} · ${createTaskMonthGoalContext.weekLabel} · ${createTaskMonthGoalContext.dayLabel}`;
    }
    if (!selectedPlannerWeekGroup) return '';
    const selectedPlannerDay =
      selectedPlannerWeekGroup.days.find((day) => day.id === createTaskPlannerDayId) ||
      selectedPlannerWeekGroup.days[0] ||
      null;
    if (!selectedPlannerDay) return `${selectedPlannerWeekGroup.weekSummaryLabel} · ${selectedPlannerWeekGroup.weekRangeLabel}`;
    const dayIndex = selectedPlannerWeekGroup.days.findIndex((day) => day.id === selectedPlannerDay.id);
    const dayInfo = getDayDisplay(selectedPlannerWeekGroup.weekStart, Math.max(dayIndex, 0));
    return `${selectedPlannerWeekGroup.weekSummaryLabel} · ${dayInfo.weekday} ${dayInfo.dateText}`;
  }, [createTaskMonthGoalContext, createTaskPlannerDayId, getDayDisplay, selectedPlannerWeekGroup]);

  useEffect(() => {
    if (!createTaskPlannerEnabled) return;
    if (!plannerWeekOptions.length) {
      setCreateTaskPlannerWeekId('');
      setCreateTaskPlannerDayId('');
      return;
    }
    setCreateTaskPlannerWeekId((prev) => prev || selectedWeeklyTaskGroup?.weekSelectionKey || plannerWeekOptions[0]?.value || '');
  }, [createTaskPlannerEnabled, plannerWeekOptions, selectedWeeklyTaskGroup]);

  useEffect(() => {
    if (!createTaskPlannerEnabled) return;
    if (!selectedPlannerWeekGroup?.days?.length) {
      setCreateTaskPlannerDayId('');
      return;
    }
    setCreateTaskPlannerDayId((prev) => {
      if (prev && selectedPlannerWeekGroup.days.some((day) => day.id === prev)) {
        return prev;
      }
      return selectedPlannerWeekGroup.days[0]?.id || '';
    });
  }, [createTaskPlannerEnabled, selectedPlannerWeekGroup]);

  const formatWeeklyPeriodSummaryLabel = (label: string | undefined, type: 'quarter' | 'month' | 'week') => {
    const trimmed = String(label || '').trim();
    if (!trimmed) {
      if (type === 'quarter') return 'Quarter ?';
      if (type === 'month') return 'Month ?';
      return 'Week ?';
    }

    const prefix = type === 'quarter' ? 'Q' : type === 'month' ? 'M' : 'W';
    const match = trimmed.match(new RegExp(`^${prefix}(\\d+)$`, 'i'));
    if (!match) return trimmed;

    const word = type === 'quarter' ? 'Quarter' : type === 'month' ? 'Month' : 'Week';
    return `${word} ${match[1]}`;
  };

  const weeklyPeriodPicker = useMemo(
    () => ({
      summary:
        `${formatWeeklyPeriodSummaryLabel(activeQuarterOption?.label, 'quarter')} / ${formatWeeklyPeriodSummaryLabel(activeMonthOption?.label, 'month')} / ${formatWeeklyPeriodSummaryLabel(activeWeekOption?.label, 'week')}`,
      detail: selectedWeeklyTaskGroup
        ? `${selectedWeeklyTaskGroup.weekRangeLabel} - ${selectedWeeklyTaskGroup.week.text || 'Weekly goal'}`
        : activeMonthOption
          ? `Choose a week inside ${activeQuarterOption?.label || 'selected quarter'} ${activeMonthOption.label}`
          : 'Choose a quarter, month, and week',
      projectOptions: weeklyProjectOptions
        .filter((option) => option.value !== NO_VISION_SELECTOR_VALUE)
        .map((option) => ({
          value: option.value,
          label: option.label,
          description: option.description,
        })),
      selectedProject: selectedWeeklyProjectId,
      onProjectChange: handleWeeklyProjectChange,
      quarterOptions: weeklyQuarterOptions,
      selectedQuarter: selectedWeeklyQuarterId,
      onQuarterChange: handleWeeklyQuarterChange,
      monthOptions: weeklyMonthOptions,
      selectedMonth: selectedWeeklyMonthId,
      onMonthChange: handleWeeklyMonthChange,
      weekOptions: weeklyWeekOptions,
      selectedWeek: selectedWeeklyWeekId,
      onWeekChange: handleWeeklyWeekChange,
      disabled: !weeklyQuarterOptions.length,
    }),
    [
      activeMonthOption,
      activeQuarterOption,
      activeWeekOption,
      formatWeeklyPeriodSummaryLabel,
      handleWeeklyProjectChange,
      handleWeeklyMonthChange,
      handleWeeklyQuarterChange,
      handleWeeklyWeekChange,
      weeklyProjectOptions,
      selectedWeeklyProjectId,
      selectedWeeklyDay,
      selectedWeeklyTaskGroup,
      selectedWeeklyWeekId,
      selectedWeeklyMonthId,
      selectedWeeklyQuarterId,
      weeklyMonthOptions,
      weeklyProjectOptions,
      weeklyQuarterOptions,
      weeklyWeekOptions,
    ],
  );

  const createDaysForWeek = async (weekId: string) =>
    createDaysForWeekHelper({
      weekId,
      state,
      updateState,
      canManageWeeklyRows,
      saveGoalFn: saveGoal,
      setWeeklyError,
    });

  const toggleDaily = (id: string) =>
    (async () => {
      if (!selectedWeeklyTaskGroup) return;
      const prepared = await ensureWeeklyGroupPersistedHelper({
        weeklyGroup: selectedWeeklyTaskGroup,
        state,
        updateState,
        saveGoalFn: saveGoal,
        setWeeklyError,
      });
      if (!prepared) return;
      toggleDailyHelper({
        id,
        state,
        updateState,
        canManageWeeklyRows: canToggleWeeklyDay,
        saveGoalFn: saveGoal,
        setWeeklyError,
      });
    })();

  useEffect(() => {
    setSelectedDayByWeek((prev) => {
      if (!weeklyTaskGroups.length) return prev;
      const today = new Date();
      const normalizedToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
      let changed = false;
      const next = { ...prev };
      weeklyTaskGroups.forEach(({ week, weekStart, days }) => {
        if (!days.length) return;
        const selected = next[week.id];
        if (!selected || !days.some((d) => d.id === selected)) {
          const todayDay =
            days.find((day, index) => {
              const dayDate = new Date(weekStart);
              dayDate.setDate(weekStart.getDate() + index);
              const normalizedDay = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate()).getTime();
              return normalizedDay === normalizedToday;
            }) || null;
          next[week.id] = todayDay?.id || days[0].id;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [weeklyTaskGroups]);

  return {
    weeklyError,
    setWeeklyError,
    selectedDayByWeek,
    setSelectedDayByWeek,
    selectedWeeklyProjectId,
    selectedWeeklyQuarterId,
    selectedWeeklyMonthId,
    selectedWeeklyGroupId,
    createTaskPlannerEnabled,
    setCreateTaskPlannerEnabled,
    createTaskPlannerQuarterId,
    setCreateTaskPlannerQuarterId,
    createTaskPlannerMonthId,
    setCreateTaskPlannerMonthId,
    createTaskPlannerWeekId,
    setCreateTaskPlannerWeekId,
    createTaskPlannerDayId,
    setCreateTaskPlannerDayId,
    weeklyTaskGroups,
    isNoVisionSelected,
    noVisionWeeklyGroups,
    activeWeeklyGroups,
    getWeekBreadcrumbForView,
    getWeekStartDateForView,
    defaultWeeklyTaskGroup,
    weeklyQuarterOptions,
    weeklyMonthOptions,
    weeklyWeekOptions,
    selectedWeeklyWeekId,
    selectedWeeklyTaskGroup,
    selectedWeeklyDay,
    handleWeeklyProjectChange,
    handleWeeklyQuarterChange,
    handleWeeklyMonthChange,
    handleWeeklyWeekChange,
    plannerWeekOptions,
    selectedPlannerWeekGroup,
    plannerDayOptions,
    plannerSummary,
    weeklyPeriodPicker,
    createDaysForWeek,
    toggleDaily,
  };
};
