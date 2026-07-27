import { monthSlotSortKey } from '../../planning/goalHierarchy';
import { getStoredAuthSession } from '../../config/api';

export const VISION_PROGRESS_SHIMMER_STYLE = `
@keyframes vision-progress-shimmer {
  0% { background-position: 180% 0; }
  100% { background-position: -80% 0; }
}
`;

export const QUARTER_LABELS = ['Q1', 'Q2', 'Q3', 'Q4'];
export const MONTH_LABELS = ['M1', 'M2', 'M3'];
export const DAY_SLOT_COUNT = 7;

export const GOAL_COLLECTIONS = {
  year: 'yearlyGoals',
  quarter: 'quarterlyGoals',
  month: 'monthlyGoals',
  week: 'weeklyGoals',
  day: 'dailyGoals',
};

export const createId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

export const dayLabel = (index) => `Day ${index + 1}`;

export const buildVisionChainKey = ({ yearId = '', quarterId = '', monthId = '', weekId = '', dayId = '' }) =>
  [yearId, quarterId, monthId, weekId, dayId].map((value) => String(value || '').trim()).join('::');

export const getLoggedInEmployeeMeta = () => {
  const session = getStoredAuthSession();
  const emp = session?.employee || {};
  return {
    empId: String(emp.empId || emp._id || ''),
    empName: String(emp.empName || ''),
    role: String(emp.role || '').toUpperCase(),
  };
};

export const normalizeRole = (role) => {
  const value = String(role || '').toUpperCase();
  if (value === 'SUPER_ADMIN') return 'SUPER_ADMIN';
  if (value === 'ADMIN') return 'ADMIN';
  if (value === 'TEAM_LEAD') return 'TEAM_LEAD';
  if (value === 'EMPLOYEE') return 'EMPLOYEE';
  return 'UNKNOWN';
};

export const averageProgress = (items) => {
  if (!items.length) return 0;
  const total = items.reduce((sum, item) => sum + (item.progress || 0), 0);
  return Math.round(total / items.length);
};

export const cloneGoal = (goal, overrides = {}) => ({
  id: goal.id,
  text: goal.text || '',
  completed: !!goal.completed,
  level: goal.level,
  parentId: goal.parentId || '',
  details: goal.details || '',
  timeline: goal.timeline || '',
  ...overrides,
});

export const findByTimeline = (items, timeline) =>
  items.find((item) => String(item.timeline || '').toUpperCase() === String(timeline).toUpperCase());

export const weekSortValue = (timeline) => {
  const value = String(timeline || '').trim().toUpperCase();
  const weekMatch = /^W(\d+)$/.exec(value);
  if (weekMatch) return Number(weekMatch[1]);
  const parsed = Date.parse(value);
  if (!Number.isNaN(parsed)) return 100 + parsed;
  return 999999;
};

export const daySortValue = (goal, index) => {
  const match = /(\d+)$/.exec(String(goal.id || ''));
  if (match) return Number(match[1]);
  const parsed = Date.parse(String(goal.timeline || '').trim());
  if (!Number.isNaN(parsed)) return parsed;
  return index + 1;
};

// Date helper functions with proper calendar calculations
export const getPlanningYearStart = () => {
  const now = new Date();
  return new Date(now.getFullYear(), 0, 1);
};

export const formatDateLabel = (date, options) => date.toLocaleDateString('en-US', options);

export const getQuarterMonths = (quarterLabel) => {
  const quarterNum = parseInt(quarterLabel.replace('Q', '')) || 1;
  const startMonth = (quarterNum - 1) * 3;
  return [startMonth, startMonth + 1, startMonth + 2];
};

export const addDays = (date, amount) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
export const normalizeDate = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
export const isSameCalendarDate = (left, right) => normalizeDate(left).getTime() === normalizeDate(right).getTime();
export const isDateWithinRange = (date, start, end) => {
  const value = normalizeDate(date).getTime();
  return value >= normalizeDate(start).getTime() && value <= normalizeDate(end).getTime();
};
export const getCurrentQuarterLabel = (date = new Date()) => `Q${Math.floor(date.getMonth() / 3) + 1}`;
export const getCurrentMonthTimeline = (date = new Date()) => `M${(date.getMonth() % 3) + 1}`;
export const getCalendarMonthNumber = (monthLabel, quarterLabel) => {
  const quarterMonths = getQuarterMonths(quarterLabel);
  const monthIndex = Math.min(Math.max(parseInt(String(monthLabel || '').replace('M', ''), 10) || 1, 1), 3) - 1;
  return (quarterMonths[monthIndex] ?? 0) + 1;
};
export const getCalendarMonthLabel = (monthLabel, quarterLabel) => `Month ${getCalendarMonthNumber(monthLabel, quarterLabel)}`;
export const getPlanningWeekNumber = (date, startDate = getPlanningYearStart()) => {
  if (!date) return 1;
  const start = normalizeDate(startDate);
  const target = normalizeDate(date);
  const dayOffset = Math.floor((target.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
  return Math.floor((dayOffset + start.getDay()) / DAY_SLOT_COUNT) + 1;
};
export const getMonthStartDate = (monthLabel, quarterLabel, startDate = getPlanningYearStart()) => {
  const quarterMonths = getQuarterMonths(quarterLabel);
  const monthIndex = Math.min(Math.max(parseInt(String(monthLabel || '').replace('M', ''), 10) || 1, 1), 3) - 1;
  const year = startDate.getFullYear();
  return new Date(year, quarterMonths[monthIndex] ?? 0, 1);
};
export const getMonthEndDate = (monthLabel, quarterLabel, startDate = getPlanningYearStart()) => {
  const monthStart = getMonthStartDate(monthLabel, quarterLabel, startDate);
  return new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
};
export const getDaysInMonth = (monthLabel, quarterLabel, startDate = getPlanningYearStart()) =>
  getMonthEndDate(monthLabel, quarterLabel, startDate).getDate();
export const getQuarterDayCount = (quarterLabel, startDate = getPlanningYearStart()) =>
  MONTH_LABELS.reduce((sum, monthLabel) => sum + getDaysInMonth(monthLabel, quarterLabel, startDate), 0);
export const getCalendarWeeksForMonth = (monthLabel, quarterLabel, startDate = getPlanningYearStart()) => {
  const monthStart = getMonthStartDate(monthLabel, quarterLabel, startDate);
  const monthEnd = getMonthEndDate(monthLabel, quarterLabel, startDate);
  const leadingOffset = monthStart.getDay();
  const gridStart = addDays(monthStart, -leadingOffset);
  const totalCalendarCells = leadingOffset + monthEnd.getDate();
  const weekCount = Math.max(1, Math.ceil(totalCalendarCells / DAY_SLOT_COUNT));
  return Array.from({ length: weekCount }, (_, weekIndex) => {
    const weekStart = addDays(gridStart, weekIndex * DAY_SLOT_COUNT);
    const weekEnd = addDays(weekStart, DAY_SLOT_COUNT - 1);
    const days = Array.from({ length: DAY_SLOT_COUNT }, (_, dayIndex) => addDays(weekStart, dayIndex)).filter(
      (day) => isDateWithinRange(day, monthStart, monthEnd),
    );
    return { slotIndex: weekIndex + 1, start: weekStart, end: weekEnd, days };
  }).filter((week) => week.days.length > 0);
};
export const getWeekPlan = (weekIndex, monthLabel, quarterLabel, startDate = getPlanningYearStart()) =>
  getCalendarWeeksForMonth(monthLabel, quarterLabel, startDate)[weekIndex - 1] || null;
export const getWeeksInMonth = (monthLabel, quarterLabel, startDate = getPlanningYearStart()) => {
  return getCalendarWeeksForMonth(monthLabel, quarterLabel, startDate).length;
};
export const getQuarterWeekCount = (quarterLabel, startDate = getPlanningYearStart()) =>
  MONTH_LABELS.reduce((sum, monthLabel) => sum + getWeeksInMonth(monthLabel, quarterLabel, startDate), 0);
export const getYearWeekCount = () => 52;
export const getYearlyDateRange = (startDate = getPlanningYearStart()) => {
  const year = startDate.getFullYear();
  const startStr = formatDateLabel(startDate, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const endDate = new Date(year + 1, 0, 0); // Last day of Dec
  const endStr = formatDateLabel(endDate, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  return `${startStr} - ${endStr}`;
};
export const getQuarterlyDateRange = (quarterLabel, startDate = getPlanningYearStart()) => {
  const months = getQuarterMonths(quarterLabel);
  const year = startDate.getFullYear();
  const startMonth = new Date(year, months[0], 1);
  const endMonth = new Date(year, months[2] + 1, 0); // Last day of last month in quarter
  const startStr = formatDateLabel(startMonth, { weekday: 'short', day: 'numeric', month: 'short' });
  const endStr = formatDateLabel(endMonth, { weekday: 'short', day: 'numeric', month: 'short' });
  return `${startStr} - ${endStr}`;
};
export const getMonthlyDate = (monthLabel, quarterLabel, startDate = getPlanningYearStart()) => {
  const monthStart = getMonthStartDate(monthLabel, quarterLabel, startDate);
  const monthEnd = getMonthEndDate(monthLabel, quarterLabel, startDate);
  const startStr = formatDateLabel(monthStart, { weekday: 'short', day: 'numeric', month: 'short' });
  const endStr = formatDateLabel(monthEnd, { weekday: 'short', day: 'numeric', month: 'short' });
  return `${startStr} - ${endStr}`;
};
export const getWeeklyDateRange = (weekIndex, monthLabel, quarterLabel, startDate = getPlanningYearStart()) => {
  const weekPlan = getWeekPlan(weekIndex, monthLabel, quarterLabel, startDate);
  if (!weekPlan) return '';
  const startStr = formatDateLabel(weekPlan.start, { weekday: 'short', day: 'numeric', month: 'short' });
  const endStr = formatDateLabel(weekPlan.end, { weekday: 'short', day: 'numeric', month: 'short' });
  return `${startStr} - ${endStr}`;
};
export const getDailyDate = (dayIndex, weekIndex, monthLabel, quarterLabel, startDate = getPlanningYearStart()) => {
  const weekPlan = getWeekPlan(weekIndex, monthLabel, quarterLabel, startDate);
  const dayDate = weekPlan?.days?.[Math.max(dayIndex, 1) - 1];
  if (!dayDate) return '';
  return formatDateLabel(dayDate, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
};

export const buildVisionTree = (state) =>
  state.yearlyGoals.map((yearGoal, yearIndex) => {
    const yearQuarterGoals = state.quarterlyGoals.filter((goal) => goal.parentId === yearGoal.id);

    const quarters = QUARTER_LABELS.map((quarterLabel) => {
      const quarterGoal =
        findByTimeline(yearQuarterGoals, quarterLabel) ||
        cloneGoal(
          {
            id: `${String(yearGoal.id || '').toLowerCase()}-${quarterLabel.toLowerCase()}`,
            text: '',
            completed: false,
            level: 'quarter',
            parentId: yearGoal.id,
            timeline: quarterLabel,
          },
          { isPlaceholder: true },
        );

      const quarterMonthGoals = state.monthlyGoals
        .filter((goal) => goal.parentId === quarterGoal.id)
        .sort((left, right) => monthSlotSortKey(left.timeline) - monthSlotSortKey(right.timeline) || left.id.localeCompare(right.id));

      const usedMonthIds = new Set();
      const baseMonths = MONTH_LABELS.map((monthLabel) => {
        const monthGoal =
          findByTimeline(quarterMonthGoals, monthLabel) ||
          cloneGoal(
            {
              id: `${String(quarterGoal.id || '').toLowerCase()}-${monthLabel.toLowerCase()}`,
              text: '',
              completed: false,
              level: 'month',
              parentId: quarterGoal.id,
              timeline: monthLabel,
            },
            { isPlaceholder: true },
          );
        usedMonthIds.add(monthGoal.id);
        return monthGoal;
      });

      const extraMonths = quarterMonthGoals.filter((goal) => !usedMonthIds.has(goal.id));
      const months = [...baseMonths, ...extraMonths].map((monthGoal, monthIndex) => {
        const monthWeekGoals = state.weeklyGoals
          .filter((goal) => goal.parentId === monthGoal.id)
          .sort((left, right) => weekSortValue(left.timeline) - weekSortValue(right.timeline) || left.id.localeCompare(right.id));

        const monthCalendarWeeks = getCalendarWeeksForMonth(monthGoal.timeline, quarterGoal.timeline);
        const defaultWeekCount = monthCalendarWeeks.length;
        const weekCount = Math.max(defaultWeekCount, monthWeekGoals.length || 0);
        const weeks = Array.from({ length: weekCount }, (_, slotIndex) => {
          const calendarWeek = monthCalendarWeeks[slotIndex] || null;
          const weekGoal =
            monthWeekGoals[slotIndex] ||
            cloneGoal(
              {
                id: `${String(monthGoal.id || '').toLowerCase()}-w${slotIndex + 1}`,
                text: '',
                completed: false,
                level: 'week',
                parentId: monthGoal.id,
                timeline: `W${slotIndex + 1}`,
              },
              { isPlaceholder: true },
            );

          const weekDays = state.dailyGoals
            .filter((goal) => goal.parentId === weekGoal.id)
            .sort((left, right) => daySortValue(left, 0) - daySortValue(right, 0) || left.id.localeCompare(right.id));

          const plannedDayCount = Math.max(1, calendarWeek?.days?.length || 0);
          const days = Array.from({ length: plannedDayCount }, (_, dayIndex) =>
            weekDays[dayIndex] ||
            cloneGoal(
              {
                id: `d-${weekGoal.id}-${dayIndex + 1}`,
                text: dayLabel(dayIndex),
                completed: false,
                level: 'day',
                parentId: weekGoal.id,
                timeline: `D${dayIndex + 1}`,
              },
              { isPlaceholder: true },
            ),
          );

          const progress = days.length ? Math.round((days.filter((day) => day.completed).length / days.length) * 100) : 0;

          return {
            ...weekGoal,
            slotIndex: slotIndex + 1,
            yearWeekNumber: calendarWeek ? getPlanningWeekNumber(calendarWeek.start) : slotIndex + 1,
            progress,
            days,
            dateRange: calendarWeek ? getWeeklyDateRange(slotIndex + 1, monthGoal.timeline, quarterGoal.timeline) : '',
          };
        });

        return {
          ...monthGoal,
          order: monthIndex + 1,
          calendarMonthNumber: getCalendarMonthNumber(monthGoal.timeline, quarterGoal.timeline),
          progress: averageProgress(weeks),
          weeks,
        };
      });

      return {
        ...quarterGoal,
        progress: averageProgress(months),
        months,
      };
    });

    return {
      ...yearGoal,
      visionIndex: yearIndex + 1,
      progress: averageProgress(quarters),
      quarters,
    };
  });
