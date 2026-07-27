import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { fetchWorkspaceLinkTasks } from '../../services/spacesApi';
import { fetchTabEndpoint } from '../../services/tabSessionCache';
import { getStoredAuthSession } from '../../config/api';
import { buildVisionStageHref, resolveVisionStageFromPath } from '../planning/visionNavigation';
import {
  averageProgress,
  buildVisionTree,
  getCalendarMonthLabel,
  getCalendarWeeksForMonth,
  getCurrentMonthTimeline,
  getCurrentQuarterLabel,
  getLoggedInEmployeeMeta,
  getPlanningYearStart,
  isDateWithinRange,
  normalizeRole,
} from './visionPlanningHelpers';

// Encapsulates all Vision view state, derived selections, and data loading.
// Returns a single context object consumed by useVisionGoalActions,
// useVisionTaskActions, and the Vision view itself.
export const useVisionPlanningState = ({ state, updateState, loading = false }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const stage = resolveVisionStageFromPath(location.pathname);
  const backendRole = String(getStoredAuthSession()?.employee?.role || '').toUpperCase();
  const isAdmin =
    state?.currentUser?.role === 'Admin' ||
    ['ADMIN', 'SUPER_ADMIN'].includes(backendRole);

  const [draftById, setDraftById] = useState({});
  const [editingId, setEditingId] = useState('');
  const [openCardMenuId, setOpenCardMenuId] = useState('');
  const [showVisionComposer, setShowVisionComposer] = useState(false);
  const [newVisionTitle, setNewVisionTitle] = useState('');
  const [newVisionDetails, setNewVisionDetails] = useState('');
  const [spacesTasks, setSpacesTasks] = useState([]);
  const [progressLoading, setProgressLoading] = useState(true);
  const [progressDataReady, setProgressDataReady] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [showTaskComposer, setShowTaskComposer] = useState(false);
  const [taskDraftByDay, setTaskDraftByDay] = useState({});
  const [taskDocumentByDay, setTaskDocumentByDay] = useState({});
  const [editingTaskId, setEditingTaskId] = useState('');
  const [openTaskMenuId, setOpenTaskMenuId] = useState('');
  const [viewingTaskId, setViewingTaskId] = useState('');
  const [savingTaskDayId, setSavingTaskDayId] = useState('');
  const [uploadingTaskDocument, setUploadingTaskDocument] = useState(false);
  const [deletingTaskId, setDeletingTaskId] = useState('');
  const [taskError, setTaskError] = useState('');

  const visions = useMemo(() => buildVisionTree(state), [state]);
  const yearIdFromQuery = searchParams.get('yearId') || '';
  const quarterIdFromQuery = searchParams.get('quarterId') || '';
  const monthIdFromQuery = searchParams.get('monthId') || '';
  const weekIdFromQuery = searchParams.get('weekId') || '';
  const weekSlotFromQuery = Number(searchParams.get('weekSlot') || 0);
  const dayIdFromQuery = searchParams.get('dayId') || '';

  const selectedYear = visions.find((item) => item.id === yearIdFromQuery) || visions[0] || null;
  const selectedQuarter =
    (selectedYear?.quarters || []).find((item) => item.id === quarterIdFromQuery) ||
    selectedYear?.quarters?.[0] ||
    null;
  const selectedMonth =
    (selectedQuarter?.months || []).find((item) => item.id === monthIdFromQuery) ||
    selectedQuarter?.months?.[0] ||
    null;
  const selectedWeek =
    (selectedMonth?.weeks || []).find(
      (item) => item.id === weekIdFromQuery && (!weekSlotFromQuery || Number(item.slotIndex || 0) === weekSlotFromQuery),
    ) ||
    (selectedMonth?.weeks || []).find((item) => weekSlotFromQuery && Number(item.slotIndex || 0) === weekSlotFromQuery) ||
    selectedMonth?.weeks?.[0] ||
    null;
  const [activeDayId, setActiveDayId] = useState('');
  const me = getLoggedInEmployeeMeta();
  const today = useMemo(() => new Date(), []);
  const currentPlanningYear = useMemo(() => getPlanningYearStart().getFullYear(), []);
  const isCurrentPlanningYear = today.getFullYear() === currentPlanningYear;
  const currentQuarterTimeline = useMemo(() => getCurrentQuarterLabel(today), [today]);
  const currentMonthTimeline = useMemo(() => getCurrentMonthTimeline(today), [today]);
  const currentWeekSlotIndex = useMemo(() => {
    if (!selectedQuarter?.timeline || !selectedMonth?.timeline) return 0;
    if (!isCurrentPlanningYear || selectedQuarter.timeline !== currentQuarterTimeline || selectedMonth.timeline !== currentMonthTimeline) {
      return 0;
    }
    const matchingWeek = getCalendarWeeksForMonth(selectedMonth.timeline, selectedQuarter.timeline).find((week) =>
      isDateWithinRange(today, week.start, week.end),
    );
    return matchingWeek?.slotIndex || 0;
  }, [today, isCurrentPlanningYear, currentQuarterTimeline, currentMonthTimeline, selectedQuarter?.timeline, selectedMonth?.timeline]);
  const selectedMonthDisplayLabel = useMemo(
    () => (selectedMonth?.timeline && selectedQuarter?.timeline ? getCalendarMonthLabel(selectedMonth.timeline, selectedQuarter.timeline) : 'Month'),
    [selectedMonth?.timeline, selectedQuarter?.timeline],
  );
  const selectedWeekDisplayLabel = useMemo(
    () => `Week ${selectedWeek?.yearWeekNumber || selectedWeek?.slotIndex || 1}`,
    [selectedWeek?.yearWeekNumber, selectedWeek?.slotIndex],
  );

  const assignableEmployees = useMemo(() => {
    const map = new Map();
    employees.forEach((emp) => map.set(String(emp.empId || ''), emp));
    if (me.empId) {
      map.set(me.empId, { empId: me.empId, empName: me.empName || 'You', role: me.role || 'EMPLOYEE' });
    }
    const all = Array.from(map.values()).filter((emp) => String(emp.empId || '').trim());
    const myRole = normalizeRole(me.role);
    if (myRole === 'SUPER_ADMIN' || myRole === 'ADMIN') {
      return all.filter((emp) => {
        const role = normalizeRole(emp.role);
        return emp.empId === me.empId || role === 'TEAM_LEAD' || role === 'EMPLOYEE' || role === 'UNKNOWN';
      });
    }
    if (myRole === 'TEAM_LEAD') {
      return all.filter((emp) => {
        const role = normalizeRole(emp.role);
        return emp.empId === me.empId || role === 'EMPLOYEE' || role === 'UNKNOWN';
      });
    }
    return all.filter((emp) => emp.empId === me.empId);
  }, [employees, me.empId, me.empName, me.role]);

  const taskAssigneeOptions = useMemo(
    () =>
      assignableEmployees.map((employee) => ({
        value: employee.empId,
        label: employee.empId === me.empId ? `${employee.empName || employee.empId} (You)` : employee.empName || employee.empId,
      })),
    [assignableEmployees, me.empId],
  );

  const taskPriorityOptions = useMemo(
    () => [
      { value: 'low', label: 'Low' },
      { value: 'medium', label: 'Medium' },
      { value: 'high', label: 'High' },
    ],
    [],
  );

  const taskStatusOptions = useMemo(
    () => [
      { value: 'todo', label: 'To Do' },
      { value: 'doing', label: 'Doing' },
      { value: 'review', label: 'Review' },
      { value: 'blocked', label: 'Blocked' },
      { value: 'done', label: 'Done' },
    ],
    [],
  );

  useEffect(() => {
    if (!selectedWeek?.days?.length) return;
    const preferredId = dayIdFromQuery && selectedWeek.days.some((item) => item.id === dayIdFromQuery)
      ? dayIdFromQuery
      : selectedWeek.days[0].id;
    setActiveDayId(preferredId);
  }, [selectedWeek, dayIdFromQuery]);

  useEffect(() => {
    if (loading) {
      setProgressLoading(true);
      setProgressDataReady(false);
      return undefined;
    }

    let active = true;
    const loadContext = async () => {
      setProgressLoading(true);
      setProgressDataReady(false);
      try {
        const [tasksPayload, employeesRes] = await Promise.all([
          fetchWorkspaceLinkTasks({ tabKey: 'planning' }),
          fetchTabEndpoint('planning', '/employees'),
        ]);
        if (!active) return;
        setSpacesTasks(Array.isArray(tasksPayload?.tasks) ? tasksPayload.tasks : []);
        const employees = Array.isArray(employeesRes) ? employeesRes : [];
        setEmployees(
          employees.map((emp) => ({
            empId: String(emp.empId || emp._id || ''),
            empName: String(emp.empName || emp.name || ''),
            role: String(emp.role || ''),
          })),
        );
      } catch (error) {
        console.error(error);
      } finally {
        if (active) {
          setProgressDataReady(true);
        }
      }
    };
    loadContext();
    return () => {
      active = false;
    };
  }, [loading]);

  useEffect(() => {
    if (!progressDataReady) return undefined;
    const frame = window.requestAnimationFrame(() => {
      setProgressLoading(false);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [progressDataReady, spacesTasks]);

  const isDailyStage = stage === 'day' && !!selectedWeek;
  const heroBadgeLabel = 'Vision Management';
  const heroStatLabel =
    stage === 'quarter'
      ? 'Active quarters'
      : stage === 'month'
        ? 'Active months'
        : stage === 'week'
          ? 'Active weeks'
          : stage === 'day'
            ? 'Active days'
            : 'Active visions';
  const heroStatValue =
    stage === 'quarter'
      ? selectedYear?.quarters?.length || 0
      : stage === 'month'
        ? selectedQuarter?.months?.length || 0
        : stage === 'week'
          ? selectedMonth?.weeks?.length || 0
          : stage === 'day'
            ? selectedWeek?.days?.length || 0
            : visions.length;
  const goalContextMaps = useMemo(() => {
    const weekContextById = new Map();
    const dayContextById = new Map();

    const markContext = (map, id, context) => {
      const key = String(id || '').trim();
      if (!key) return;
      const existing = map.get(key);
      if (existing) {
        map.set(key, { ...existing, ambiguous: true });
        return;
      }
      map.set(key, { ...context, ambiguous: false });
    };

    (visions || []).forEach((yearNode) => {
      (yearNode?.quarters || []).forEach((quarterNode) => {
        (quarterNode?.months || []).forEach((monthNode) => {
          (monthNode?.weeks || []).forEach((weekNode) => {
            const weekContext = {
              yearId: String(yearNode?.id || '').trim(),
              quarterId: String(quarterNode?.id || '').trim(),
              monthId: String(monthNode?.id || '').trim(),
              weekId: String(weekNode?.id || '').trim(),
            };
            markContext(weekContextById, weekNode?.id, weekContext);

            (weekNode?.days || []).forEach((dayNode) => {
              markContext(dayContextById, dayNode?.id, {
                ...weekContext,
                dayId: String(dayNode?.id || '').trim(),
              });
            });
          });
        });
      });
    });

    return { weekContextById, dayContextById };
  }, [visions]);

  const overallProgress = useMemo(() => averageProgress(visions), [visions]);
  const totalWeeks = useMemo(
    () =>
      visions.reduce(
        (sum, year) =>
          sum +
          year.quarters.reduce(
            (quarterSum, quarter) => quarterSum + quarter.months.reduce((monthSum, month) => monthSum + month.weeks.length, 0),
            0,
          ),
        0,
      ),
    [visions],
  );
  const totalCompletedDays = useMemo(
    () =>
      visions.reduce(
        (sum, year) =>
          sum +
          year.quarters.reduce(
            (quarterSum, quarter) =>
              quarterSum +
              quarter.months.reduce(
                (monthSum, month) => monthSum + month.weeks.reduce((weekSum, week) => weekSum + week.days.filter((day) => day.completed).length, 0),
                0,
              ),
            0,
          ),
        0,
      ),
    [visions],
  );
  const totalDays = useMemo(
    () =>
      visions.reduce(
        (sum, year) =>
          sum +
          year.quarters.reduce(
            (quarterSum, quarter) =>
              quarterSum + quarter.months.reduce((monthSum, month) => monthSum + month.weeks.reduce((weekSum, week) => weekSum + week.days.length, 0), 0),
            0,
          ),
        0,
      ),
    [visions],
  );

  const breadcrumbItems = [
    { label: 'Vision', to: '/yearly' },
    selectedYear ? { label: selectedYear.text || 'Yearly vision', to: buildVisionStageHref('quarter', { yearId: selectedYear.id }) } : null,
    stage === 'month' || stage === 'week' || stage === 'day'
      ? selectedQuarter
        ? {
            label: selectedQuarter.timeline || 'Quarter',
            to: buildVisionStageHref('month', { yearId: selectedYear?.id, quarterId: selectedQuarter.id }),
          }
        : null
      : null,
    stage === 'week' || stage === 'day'
      ? selectedMonth
        ? {
            label: selectedMonthDisplayLabel,
            to: buildVisionStageHref('week', {
              yearId: selectedYear?.id,
              quarterId: selectedQuarter?.id,
              monthId: selectedMonth.id,
            }),
          }
        : null
      : null,
    stage === 'day'
      ? selectedWeek
        ? { label: selectedWeekDisplayLabel }
        : null
      : null,
  ].filter(Boolean);

  return {
    location,
    navigate,
    searchParams,
    stage,
    backendRole,
    isAdmin,
    draftById,
    setDraftById,
    editingId,
    setEditingId,
    openCardMenuId,
    setOpenCardMenuId,
    showVisionComposer,
    setShowVisionComposer,
    newVisionTitle,
    setNewVisionTitle,
    newVisionDetails,
    setNewVisionDetails,
    spacesTasks,
    setSpacesTasks,
    progressLoading,
    setProgressLoading,
    progressDataReady,
    setProgressDataReady,
    employees,
    setEmployees,
    showTaskComposer,
    setShowTaskComposer,
    taskDraftByDay,
    setTaskDraftByDay,
    taskDocumentByDay,
    setTaskDocumentByDay,
    editingTaskId,
    setEditingTaskId,
    openTaskMenuId,
    setOpenTaskMenuId,
    viewingTaskId,
    setViewingTaskId,
    savingTaskDayId,
    setSavingTaskDayId,
    uploadingTaskDocument,
    setUploadingTaskDocument,
    deletingTaskId,
    setDeletingTaskId,
    taskError,
    setTaskError,
    visions,
    yearIdFromQuery,
    quarterIdFromQuery,
    monthIdFromQuery,
    weekIdFromQuery,
    weekSlotFromQuery,
    dayIdFromQuery,
    selectedYear,
    selectedQuarter,
    selectedMonth,
    selectedWeek,
    activeDayId,
    setActiveDayId,
    me,
    today,
    currentPlanningYear,
    isCurrentPlanningYear,
    currentQuarterTimeline,
    currentMonthTimeline,
    currentWeekSlotIndex,
    selectedMonthDisplayLabel,
    selectedWeekDisplayLabel,
    assignableEmployees,
    taskAssigneeOptions,
    taskPriorityOptions,
    taskStatusOptions,
    isDailyStage,
    heroBadgeLabel,
    heroStatLabel,
    heroStatValue,
    goalContextMaps,
    overallProgress,
    totalWeeks,
    totalCompletedDays,
    totalDays,
    breadcrumbItems,
  };
};
