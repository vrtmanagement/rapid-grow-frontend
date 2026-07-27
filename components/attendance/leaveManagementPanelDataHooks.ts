import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getSocket } from '../../realtime/socket';
import {
  LeaveAdminActivityItem,
  LeaveBalanceOverviewResponse,
  LeaveLopEvaluation,
  LeaveLopSummary,
  LeavePolicyConfig,
  LeaveRequest,
  LopPolicyConfig,
} from './attendanceUtils';
import {
  createLeaveAdjustment as createLeaveAdjustmentApi,
  downloadLeaveReport,
  fetchLeaveActivity,
  fetchLeaveBalanceOverview,
  fetchLeavePolicies,
  saveLeavePolicy,
} from './leaveBalanceApi';
import {
  applyLeaveLopAction,
  fetchLopPolicy,
  fetchMyLopSummary,
  previewLeaveLop,
  saveLopPolicy,
} from './lopPolicyApi';
import {
  REASON_SUGGESTIONS,
  LEAVE_TYPE_OPTIONS,
  ActivePopup,
  calculateLeaveDays,
  getMonthInputValue,
} from './leaveManagementPanelUtils';
import type { AttendanceEmployeeOption } from './attendanceViewUtils';

type ViewerRole = 'employee' | 'team_lead' | 'admin';
type ToastTone = 'success' | 'info';

export function useLeaveToast() {
  const [toast, setToast] = useState<{ tone: ToastTone; message: string } | null>(null);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const showToast = useCallback((tone: ToastTone, message: string) => {
    setToast({ tone, message });
  }, []);

  return { toast, showToast };
}

export function useLeaveOverviewData({
  viewerRole,
  currentEmployeeId,
  employeeOptions,
  currentOverview,
  currentOverviewLoading,
  showToast,
}: {
  viewerRole: ViewerRole;
  currentEmployeeId?: string;
  employeeOptions: AttendanceEmployeeOption[];
  currentOverview: LeaveBalanceOverviewResponse | null;
  currentOverviewLoading: boolean;
  showToast: (tone: ToastTone, message: string) => void;
}) {
  const currentMonthValue = useMemo(() => getMonthInputValue(new Date()), []);
  const [overviewPeriod, setOverviewPeriod] = useState<'month' | 'year'>('month');
  const [overviewMonth, setOverviewMonth] = useState(currentMonthValue);
  const [overviewYear, setOverviewYear] = useState(new Date().getFullYear());
  const [overviewEmployeeEmpId, setOverviewEmployeeEmpId] = useState(currentEmployeeId || '');
  const [overviewData, setOverviewData] = useState<LeaveBalanceOverviewResponse | null>(currentOverview);
  const [overviewLoading, setOverviewLoading] = useState(currentOverviewLoading);
  const [exportLoading, setExportLoading] = useState(false);
  const latestOverviewRequestRef = useRef(0);
  const overviewCacheRef = useRef(new Map<string, LeaveBalanceOverviewResponse>());

  useEffect(() => {
    if (viewerRole === 'employee') {
      setOverviewEmployeeEmpId(currentEmployeeId || '');
      return;
    }

    setOverviewEmployeeEmpId((current) => {
      if (current && employeeOptions.some((employee) => employee.empId === current)) {
        return current;
      }
      return employeeOptions[0]?.empId || currentEmployeeId || '';
    });
  }, [currentEmployeeId, employeeOptions, viewerRole]);

  useEffect(() => {
    if (!currentOverview) return;
    if (viewerRole === 'employee' || (currentEmployeeId && overviewEmployeeEmpId === currentEmployeeId)) {
      setOverviewData(currentOverview);
    }
  }, [currentEmployeeId, currentOverview, overviewEmployeeEmpId, viewerRole]);

  useEffect(() => {
    setOverviewLoading(currentOverviewLoading);
  }, [currentOverviewLoading]);

  const loadOverview = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent === true;
    const requestId = latestOverviewRequestRef.current + 1;
    latestOverviewRequestRef.current = requestId;

    const targetEmployeeEmpId =
      viewerRole === 'employee'
        ? currentEmployeeId
        : overviewEmployeeEmpId || currentEmployeeId || employeeOptions[0]?.empId;
    const overviewCacheKey = [
      targetEmployeeEmpId || '',
      overviewPeriod,
      overviewMonth.slice(5, 7),
      overviewYear,
    ].join(':');
    const cachedOverview = overviewCacheRef.current.get(overviewCacheKey);

    if (!silent) {
      if (cachedOverview) {
        setOverviewData(cachedOverview);
        setOverviewLoading(false);
      } else {
        setOverviewLoading(true);
      }
    }

    try {
      const data = await fetchLeaveBalanceOverview({
        employeeEmpId: targetEmployeeEmpId,
        period: overviewPeriod,
        month: overviewMonth.slice(5, 7),
        year: overviewYear,
      });
      overviewCacheRef.current.set(overviewCacheKey, data);
      if (latestOverviewRequestRef.current === requestId) {
        setOverviewData(data);
      }
    } catch (error) {
      console.error('Failed to load leave overview section', error);
      if (!silent && latestOverviewRequestRef.current === requestId) {
        setOverviewData(null);
      }
    } finally {
      if (latestOverviewRequestRef.current === requestId) {
        setOverviewLoading(false);
      }
    }
  }, [currentEmployeeId, employeeOptions, overviewEmployeeEmpId, overviewMonth, overviewPeriod, overviewYear, viewerRole]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const handleExport = useCallback(async () => {
    setExportLoading(true);
    try {
      const report = await downloadLeaveReport({
        employeeEmpId:
          viewerRole === 'employee'
            ? currentEmployeeId
            : overviewEmployeeEmpId || currentEmployeeId || employeeOptions[0]?.empId,
        period: overviewPeriod,
        month: overviewMonth.slice(5, 7),
        year: overviewYear,
      });
      const url = window.URL.createObjectURL(report.blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = report.filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
      showToast('success', 'Leave report exported');
    } catch (error) {
      console.error('Failed to export leave report', error);
      showToast('info', error instanceof Error ? error.message : 'Unable to export leave report');
    } finally {
      setExportLoading(false);
    }
  }, [currentEmployeeId, employeeOptions, overviewEmployeeEmpId, overviewMonth, overviewPeriod, overviewYear, showToast, viewerRole]);

  return {
    overviewPeriod,
    setOverviewPeriod,
    overviewMonth,
    setOverviewMonth,
    overviewYear,
    setOverviewYear,
    overviewEmployeeEmpId,
    setOverviewEmployeeEmpId,
    overviewData,
    overviewLoading,
    exportLoading,
    loadOverview,
    handleExport,
  };
}

export function useLeaveAdminSettings({
  isApproverPortal,
  showToast,
  loadOverview,
}: {
  isApproverPortal: boolean;
  showToast: (tone: ToastTone, message: string) => void;
  loadOverview: (options?: { silent?: boolean }) => Promise<void>;
}) {
  const [lopPolicy, setLopPolicy] = useState<LopPolicyConfig | null>(null);
  const [lopPolicySaving, setLopPolicySaving] = useState(false);
  const [policyItems, setPolicyItems] = useState<LeavePolicyConfig[]>([]);
  const [activityItems, setActivityItems] = useState<LeaveAdminActivityItem[]>([]);
  const [policySaving, setPolicySaving] = useState(false);
  const [adjustmentSaving, setAdjustmentSaving] = useState(false);

  const loadAdminMeta = useCallback(async () => {
    if (!isApproverPortal) {
      setPolicyItems([]);
      setActivityItems([]);
      return;
    }

    try {
      const [policies, activity, lopPolicyData] = await Promise.all([
        fetchLeavePolicies(),
        fetchLeaveActivity(8),
        fetchLopPolicy().catch(() => null),
      ]);
      setPolicyItems(policies);
      setActivityItems(activity);
      if (lopPolicyData) setLopPolicy(lopPolicyData);
    } catch (error) {
      console.error('Failed to load leave admin metadata', error);
      setPolicyItems([]);
      setActivityItems([]);
    }
  }, [isApproverPortal]);

  useEffect(() => {
    void loadAdminMeta();
  }, [loadAdminMeta]);

  const handleSaveLopPolicy = useCallback(async (payload: Record<string, unknown>) => {
    setLopPolicySaving(true);
    try {
      const saved = await saveLopPolicy(payload);
      setLopPolicy(saved);
      showToast('success', 'LOP policy saved');
    } catch (error) {
      showToast('info', error instanceof Error ? error.message : 'Failed to save LOP policy');
    } finally {
      setLopPolicySaving(false);
    }
  }, [showToast]);

  const handleSavePolicy = useCallback(async (payload: Record<string, unknown>) => {
    setPolicySaving(true);
    try {
      await saveLeavePolicy(payload);
      await loadAdminMeta();
      await loadOverview({ silent: true });
      showToast('success', 'Leave policy saved successfully');
    } catch (error) {
      console.error('Failed to save leave policy', error);
      showToast('info', error instanceof Error ? error.message : 'Unable to save leave policy');
    } finally {
      setPolicySaving(false);
    }
  }, [loadAdminMeta, loadOverview, showToast]);

  const handleCreateAdjustment = useCallback(async (payload: Record<string, unknown>) => {
    setAdjustmentSaving(true);
    try {
      await createLeaveAdjustmentApi(payload);
      await Promise.all([
        loadOverview({ silent: true }),
        loadAdminMeta(),
      ]);
      showToast('success', 'Leave balance adjusted successfully');
    } catch (error) {
      console.error('Failed to adjust leave balance', error);
      showToast('info', error instanceof Error ? error.message : 'Unable to adjust leave balance');
    } finally {
      setAdjustmentSaving(false);
    }
  }, [loadAdminMeta, loadOverview, showToast]);

  return {
    lopPolicy,
    lopPolicySaving,
    policyItems,
    activityItems,
    policySaving,
    adjustmentSaving,
    loadAdminMeta,
    handleSaveLopPolicy,
    handleSavePolicy,
    handleCreateAdjustment,
  };
}

export function useLeaveLopSummary({
  viewerRole,
  myLeavesLength,
  canApplyLeave,
  hasInvalidRange,
  leaveStart,
  leaveEnd,
  leaveType,
  onLeaveLopAction,
  showToast,
}: {
  viewerRole: ViewerRole;
  myLeavesLength: number;
  canApplyLeave: boolean;
  hasInvalidRange: boolean;
  leaveStart: string;
  leaveEnd: string;
  leaveType: string;
  onLeaveLopAction?: (id: string, action: string, reason?: string) => Promise<void>;
  showToast: (tone: ToastTone, message: string) => void;
}) {
  const [lopSummary, setLopSummary] = useState<LeaveLopSummary | null>(null);
  const [lopSummaryLoading, setLopSummaryLoading] = useState(false);
  const [lopPreviewLoading, setLopPreviewLoading] = useState(false);
  const [lopEvaluation, setLopEvaluation] = useState<LeaveLopEvaluation | null>(null);

  const loadLopSummary = useCallback(async () => {
    if (viewerRole !== 'employee') {
      setLopSummary(null);
      return;
    }
    setLopSummaryLoading(true);
    try {
      const summary = await fetchMyLopSummary(new Date().getFullYear());
      setLopSummary(summary);
    } catch (error) {
      console.error('Failed to load LOP summary', error);
      setLopSummary(null);
    } finally {
      setLopSummaryLoading(false);
    }
  }, [viewerRole]);

  useEffect(() => {
    void loadLopSummary();
  }, [loadLopSummary, myLeavesLength]);

  useEffect(() => {
    if (!canApplyLeave || !leaveStart || !leaveEnd || hasInvalidRange) {
      setLopEvaluation(null);
      return undefined;
    }

    let mounted = true;
    const timer = window.setTimeout(async () => {
      setLopPreviewLoading(true);
      try {
        const preview = await previewLeaveLop({
          startDate: leaveStart,
          endDate: leaveEnd,
          type: leaveType,
        });
        if (mounted) setLopEvaluation(preview.evaluation);
      } catch {
        if (mounted) setLopEvaluation(null);
      } finally {
        if (mounted) setLopPreviewLoading(false);
      }
    }, 350);

    return () => {
      mounted = false;
      window.clearTimeout(timer);
    };
  }, [canApplyLeave, hasInvalidRange, leaveEnd, leaveStart, leaveType]);

  const handleLeaveLopAction = useCallback(async (leaveId: string, action: string, reason?: string) => {
    if (onLeaveLopAction) {
      await onLeaveLopAction(leaveId, action, reason);
      showToast('success', 'LOP action applied');
      return;
    }
    await applyLeaveLopAction(leaveId, action, reason);
    showToast('success', 'LOP action applied');
  }, [onLeaveLopAction, showToast]);

  return {
    lopSummary,
    lopSummaryLoading,
    lopPreviewLoading,
    lopEvaluation,
    handleLeaveLopAction,
  };
}

export function useLeaveApplyForm({
  leaveStart,
  leaveEnd,
  leaveReason,
  leaveType,
  onApply,
  onDeleteLeave,
  onChangeStart,
  onChangeEnd,
  onChangeReason,
  onChangeType,
  showToast,
}: {
  leaveStart: string;
  leaveEnd: string;
  leaveReason: string;
  leaveType: string;
  onApply: () => Promise<boolean> | boolean;
  onDeleteLeave: (leave: LeaveRequest) => Promise<boolean> | boolean;
  onChangeStart: (value: string) => void;
  onChangeEnd: (value: string) => void;
  onChangeReason: (value: string) => void;
  onChangeType: (value: string) => void;
  showToast: (tone: ToastTone, message: string) => void;
}) {
  const [activePopup, setActivePopup] = useState<ActivePopup>(null);
  const startFieldRef = useRef<HTMLDivElement | null>(null);
  const endFieldRef = useRef<HTMLDivElement | null>(null);
  const reasonFieldRef = useRef<HTMLDivElement | null>(null);
  const typeFieldRef = useRef<HTMLDivElement | null>(null);

  const { total: calculatedDays, invalid: hasInvalidRange } = useMemo(
    () => calculateLeaveDays(leaveStart, leaveEnd, true, { type: leaveType }),
    [leaveEnd, leaveStart, leaveType],
  );

  const filteredSuggestions = useMemo(() => {
    const query = leaveReason.trim().toLowerCase();
    if (!query) return REASON_SUGGESTIONS;
    return REASON_SUGGESTIONS.filter((suggestion) => suggestion.toLowerCase().includes(query));
  }, [leaveReason]);

  const selectedLeaveTypeOption = useMemo(
    () => LEAVE_TYPE_OPTIONS.find((option) => option.value === leaveType) || LEAVE_TYPE_OPTIONS[0],
    [leaveType],
  );

  useEffect(() => {
    if (!activePopup) return undefined;

    const getActiveRef = () => {
      if (activePopup === 'start') return startFieldRef.current;
      if (activePopup === 'end') return endFieldRef.current;
      if (activePopup === 'reason') return reasonFieldRef.current;
      if (activePopup === 'type') return typeFieldRef.current;
      return null;
    };

    const handlePointerDown = (event: MouseEvent) => {
      const container = getActiveRef();
      if (container && !container.contains(event.target as Node)) {
        setActivePopup(null);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActivePopup(null);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [activePopup]);

  const handleSubmitLeave = useCallback(async () => {
    if (hasInvalidRange) {
      showToast('info', 'Please choose a valid leave date range.');
      return;
    }

    const success = await onApply();
    if (success) {
      setActivePopup(null);
      showToast('success', 'Leave request submitted');
    }
  }, [hasInvalidRange, onApply, showToast]);

  const handleEditLeave = useCallback((leave: LeaveRequest) => {
    onChangeStart(leave.startDate.slice(0, 10));
    onChangeEnd(leave.endDate.slice(0, 10));
    onChangeReason(leave.reason || '');
    onChangeType(leave.type || 'CASUAL');
    setActivePopup(null);
    showToast('info', 'Pending leave loaded into the form for quick editing.');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [onChangeEnd, onChangeReason, onChangeStart, onChangeType, showToast]);

  const handleDeleteLeave = useCallback(async (leave: LeaveRequest) => {
    const success = await onDeleteLeave(leave);
    showToast(success ? 'success' : 'info', success ? 'Leave request deleted' : 'Unable to delete leave request');
  }, [onDeleteLeave, showToast]);

  return {
    activePopup,
    setActivePopup,
    startFieldRef,
    endFieldRef,
    reasonFieldRef,
    typeFieldRef,
    calculatedDays,
    hasInvalidRange,
    filteredSuggestions,
    selectedLeaveTypeOption,
    handleSubmitLeave,
    handleEditLeave,
    handleDeleteLeave,
  };
}

export function useLeaveLiveRefresh({
  isApproverPortal,
  loadOverview,
  loadAdminMeta,
}: {
  isApproverPortal: boolean;
  loadOverview: (options?: { silent?: boolean }) => Promise<void>;
  loadAdminMeta: () => Promise<void>;
}) {
  useEffect(() => {
    const socket = getSocket();
    const handleLeaveLiveRefresh = () => {
      void loadOverview({ silent: true });
      if (isApproverPortal) {
        void loadAdminMeta();
      }
    };

    socket.on('leave:created', handleLeaveLiveRefresh);
    socket.on('leave:updated', handleLeaveLiveRefresh);
    socket.on('leave:balance_changed', handleLeaveLiveRefresh);
    socket.on('leave:policy_changed', handleLeaveLiveRefresh);

    return () => {
      socket.off('leave:created', handleLeaveLiveRefresh);
      socket.off('leave:updated', handleLeaveLiveRefresh);
      socket.off('leave:balance_changed', handleLeaveLiveRefresh);
      socket.off('leave:policy_changed', handleLeaveLiveRefresh);
    };
  }, [isApproverPortal, loadAdminMeta, loadOverview]);
}
