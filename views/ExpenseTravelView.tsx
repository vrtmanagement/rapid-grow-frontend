import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { useLocation, useNavigate } from 'react-router-dom';

import { MapPin, Plus } from 'lucide-react';

import PageSectionSubnav from '../components/layout/PageSectionSubnav';

import ExpenseSubnavActionButton from '../components/expense/ExpenseSubnavActionButton';

import ExpenseForm from '../components/expense/ExpenseForm';

import TravelRequestForm from '../components/expense/TravelRequestForm';

import MyExpensesSection from '../components/expense/MyExpensesSection';

import TravelRequestsSection from '../components/expense/TravelRequestsSection';

import ApprovalQueue from '../components/expense/ApprovalQueue';

import ReportsAnalyticsSection from '../components/expense/ReportsAnalyticsSection';

import PolicyLimitsSection from '../components/expense/PolicyLimitsSection';

import {

  fetchApprovalHistory,

  fetchApprovals,

  fetchClaimsSummary,

  fetchExpenses,

  fetchPolicyDashboard,

  fetchReportsAnalytics,

  fetchTravelRequests,

} from '../components/expense/expenseApi';

import type {
  ApprovalHistoryItem,
  ClaimsSummaryStats,
  ExpenseClaim,
  ExpenseSection,
  PolicyDashboard,
  ReportsAnalytics,
  TravelRequest,
} from '../components/expense/expenseTypes';
import { computeClaimsSummaryFromItems, hasClaimsSummaryData } from '../components/expense/expenseTypes';

import { getStoredAuthSession } from '../config/api';

import { usePermissions } from '../context/usePermissions';



interface Props {

  mode?: 'manager' | 'employee';

}



const employeeSections: Array<{ id: ExpenseSection; label: string }> = [

  { id: 'claims', label: 'My Expenses' },

  { id: 'travel', label: 'Travel Requests' },

  { id: 'reports', label: 'Reports' },

];



const managerSections: Array<{ id: ExpenseSection; label: string }> = [

  { id: 'claims', label: 'My Expenses' },

  { id: 'travel', label: 'Travel Requests' },

  { id: 'approvals', label: 'Approvals' },

  { id: 'reports', label: 'Reports & Analytics' },

  { id: 'policy', label: 'Policy & Limits' },

];



const parseSection = (value: string | null, isEmployeePortal: boolean): ExpenseSection => {

  const allowed = isEmployeePortal

    ? new Set<ExpenseSection>(['claims', 'travel', 'reports'])

    : new Set<ExpenseSection>(['claims', 'travel', 'approvals', 'reports', 'policy']);

  if (value === 'dashboard') return 'reports';

  if (value && allowed.has(value as ExpenseSection)) return value as ExpenseSection;

  return 'claims';

};



const ExpenseTravelView: React.FC<Props> = ({ mode = 'manager' }) => {

  const { hasPermission } = usePermissions();

  const location = useLocation();

  const navigate = useNavigate();

  const session = getStoredAuthSession()?.employee || {};

  const role = String(session.role || '');

  const isEmployeePortal = mode === 'employee';



  const [activeSection, setActiveSection] = useState<ExpenseSection>(() => {

    const params = new URLSearchParams(location.search || '');

    return parseSection(params.get('section'), isEmployeePortal);

  });

  const [claimsSummary, setClaimsSummary] = useState<ClaimsSummaryStats | null>(null);

  const [claims, setClaims] = useState<ExpenseClaim[]>([]);

  const [travelRequests, setTravelRequests] = useState<TravelRequest[]>([]);

  const [approvalExpenses, setApprovalExpenses] = useState<ExpenseClaim[]>([]);

  const [approvalTravel, setApprovalTravel] = useState<TravelRequest[]>([]);

  const [approvalHistory, setApprovalHistory] = useState<ApprovalHistoryItem[]>([]);

  const [reportsData, setReportsData] = useState<ReportsAnalytics | null>(null);

  const [policyData, setPolicyData] = useState<PolicyDashboard | null>(null);

  const [claimsLoading, setClaimsLoading] = useState(false);

  const [travelLoading, setTravelLoading] = useState(false);

  const [approvalsLoading, setApprovalsLoading] = useState(false);

  const [historyLoading, setHistoryLoading] = useState(false);

  const [reportsLoading, setReportsLoading] = useState(false);

  const [policyLoading, setPolicyLoading] = useState(false);

  const [expenseFormOpen, setExpenseFormOpen] = useState(false);

  const [travelFormOpen, setTravelFormOpen] = useState(false);

  const [editingClaim, setEditingClaim] = useState<ExpenseClaim | null>(null);

  const [toast, setToast] = useState<string | null>(null);



  const canApprove = hasPermission('EXPENSE_APPROVE') || role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'TEAM_LEAD';

  const canReimburse = hasPermission('EXPENSE_REIMBURSE') || role === 'ADMIN' || role === 'SUPER_ADMIN';

  const canManageClaims = hasPermission('EXPENSE_MANAGE') || role !== 'SUPER_ADMIN';



  const visibleSections = useMemo(() => {

    const sections = isEmployeePortal ? employeeSections : managerSections;

    return sections.filter((section) => section.id !== 'approvals' || canApprove);

  }, [canApprove, isEmployeePortal]);



  const syncSectionToUrl = useCallback(

    (section: ExpenseSection) => {

      const params = new URLSearchParams(location.search || '');

      params.set('section', section);

      navigate(`${location.pathname}?${params.toString()}`, { replace: true });

    },

    [location.pathname, location.search, navigate],

  );



  const showToast = (message: string) => {

    setToast(message);

    window.setTimeout(() => setToast(null), 3200);

  };



  const loadClaims = useCallback(async () => {

    setClaimsLoading(true);

    try {

      const data = await fetchExpenses({ limit: 50, sortBy: 'createdAt', sortOrder: 'desc' });

      setClaims(data.items);

      try {

        const summary = await fetchClaimsSummary();

        if (!hasClaimsSummaryData(summary) && data.items.length > 0) {

          setClaimsSummary(computeClaimsSummaryFromItems(data.items));

        } else {

          setClaimsSummary(summary);

        }

      } catch {

        setClaimsSummary(data.items.length > 0 ? computeClaimsSummaryFromItems(data.items) : null);

      }

    } catch {

      setClaimsSummary(null);

      setClaims([]);

    } finally {

      setClaimsLoading(false);

    }

  }, []);



  const loadTravel = useCallback(async () => {

    setTravelLoading(true);

    try {

      const data = await fetchTravelRequests({ limit: 50, sortBy: 'createdAt', sortOrder: 'desc' });

      setTravelRequests(data.items);

    } finally {

      setTravelLoading(false);

    }

  }, []);



  const loadApprovals = useCallback(async () => {

    if (!canApprove) return;

    setApprovalsLoading(true);

    setHistoryLoading(true);

    try {

      const [data, history] = await Promise.all([

        fetchApprovals({ limit: 50 }),

        fetchApprovalHistory(20),

      ]);

      setApprovalExpenses(data.expenses.items);

      setApprovalTravel(data.travel.items);

      setApprovalHistory(history.items);

    } finally {

      setApprovalsLoading(false);

      setHistoryLoading(false);

    }

  }, [canApprove]);



  const loadReports = useCallback(async () => {

    setReportsLoading(true);

    try {

      const data = await fetchReportsAnalytics();

      setReportsData(data);

    } catch {

      setReportsData(null);

    } finally {

      setReportsLoading(false);

    }

  }, []);



  const loadPolicy = useCallback(async () => {

    setPolicyLoading(true);

    try {

      const data = await fetchPolicyDashboard();

      setPolicyData(data);

    } catch {

      setPolicyData(null);

    } finally {

      setPolicyLoading(false);

    }

  }, []);



  useEffect(() => {

    if (activeSection === 'claims') loadClaims();

    if (activeSection === 'travel') loadTravel();

    if (activeSection === 'approvals') loadApprovals();

    if (activeSection === 'reports') loadReports();

    if (activeSection === 'policy') loadPolicy();

  }, [activeSection, loadClaims, loadTravel, loadApprovals, loadReports, loadPolicy]);



  const handleSectionChange = (section: ExpenseSection) => {

    setActiveSection(section);

    syncSectionToUrl(section);

  };



  const refreshAll = async () => {

    await Promise.all([loadClaims(), loadTravel(), loadApprovals(), loadReports(), loadPolicy()]);

    showToast('Updated successfully');

  };



  const approvedTravelOptions = travelRequests.filter((item) => item.status === 'APPROVED' || item.status === 'PENDING');



  return (

    <div className="mx-auto max-w-7xl space-y-10 animate-in fade-in duration-700">

      <PageSectionSubnav

        leading={

          <div className="flex items-center gap-3">

            <span className="h-1.5 w-8 rounded-full bg-brand-red" />

            <h1 className="truncate text-sm font-medium text-slate-600 dark:text-slate-300 sm:text-[15px]">Expense & Travel</h1>

          </div>

        }

        center={

          <>

            {hasPermission('ATTENDANCE_VIEW') && (

              <button

                type="button"

                onClick={() => navigate('/attendance')}

                className="whitespace-nowrap border-b-2 border-transparent px-1 py-1.5 text-[13px] font-medium text-slate-500 transition hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"

              >

                Overview

              </button>

            )}

            {visibleSections.map((section) => (

              <button

                key={section.id}

                type="button"

                onClick={() => handleSectionChange(section.id)}

                className={`whitespace-nowrap border-b-2 px-1 py-1.5 text-[13px] font-medium transition ${

                  activeSection === section.id

                    ? 'border-brand-red text-brand-red'

                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'

                }`}

              >

                {section.label}

              </button>

            ))}

          </>

        }

        trailing={

          canManageClaims ? (

            <div className="flex flex-wrap items-center gap-2">

              <ExpenseSubnavActionButton

                icon={<MapPin size={18} strokeWidth={2} />}

                label="New Trip"

                onClick={() => setTravelFormOpen(true)}

              />

              <ExpenseSubnavActionButton

                icon={<Plus size={18} strokeWidth={2.25} />}

                label="Add Expense"

                onClick={() => {

                  setEditingClaim(null);

                  setExpenseFormOpen(true);

                }}

              />

            </div>

          ) : null

        }

      />



      {toast && (

        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-slate-900 px-4 py-3 text-sm text-white shadow-lg">

          {toast}

        </div>

      )}



      {activeSection === 'claims' && (

        <MyExpensesSection

          items={claims}

          summary={claimsSummary}

          loading={claimsLoading}

          showEmployee={mode === 'manager' && canApprove}

          currentUserId={String(session._id || session.id || '')}

          isAdmin={role === 'ADMIN' || role === 'SUPER_ADMIN'}

          canManageOthers={mode === 'manager' && canApprove}

          onEdit={(claim) => {

            setEditingClaim(claim);

            setExpenseFormOpen(true);

          }}

          onUpdated={loadClaims}

        />

      )}



      {activeSection === 'travel' && (

        <TravelRequestsSection

          items={travelRequests}

          loading={travelLoading}

          onNewTrip={canManageClaims ? () => setTravelFormOpen(true) : undefined}

        />

      )}



      {activeSection === 'approvals' && canApprove && (

        <ApprovalQueue

          expenseItems={approvalExpenses}

          travelItems={approvalTravel}

          historyItems={approvalHistory}

          loading={approvalsLoading}

          historyLoading={historyLoading}

          onUpdated={refreshAll}

        />

      )}



      {activeSection === 'reports' && (

        <ReportsAnalyticsSection data={reportsData} loading={reportsLoading} />

      )}



      {activeSection === 'policy' && !isEmployeePortal && (

        <PolicyLimitsSection
          data={policyData}
          loading={policyLoading}
          canEdit={hasPermission('EXPENSE_BUDGET_MANAGE')}
          onUpdated={loadPolicy}
        />

      )}



      <ExpenseForm

        open={expenseFormOpen}

        onClose={() => {

          setExpenseFormOpen(false);

          setEditingClaim(null);

        }}

        onSaved={refreshAll}

        editingClaim={editingClaim}

        travelRequests={approvedTravelOptions}

        canOverrideDuplicate={canReimburse}

      />

      <TravelRequestForm

        open={travelFormOpen}

        onClose={() => setTravelFormOpen(false)}

        onSaved={refreshAll}

      />

    </div>

  );

};



export default ExpenseTravelView;

