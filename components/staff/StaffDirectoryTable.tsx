import React from 'react';
import { ChevronDown, Search } from 'lucide-react';
import StaffEmployeeActionMenu from './StaffEmployeeActionMenu';
import { StaffTableSkeleton } from '../ui/Skeleton';
import { getDisplayAvatarUrl } from '../../utils/avatar';
import {
  formatRoleLabel,
  getRoleBadgeClass,
  getStatusBadgeClass,
  type EmployeeRow,
} from './staffViewHelpers';

type StaffDirectoryTableProps = { ctx: Record<string, any> };

const StaffDirectoryTable: React.FC<StaffDirectoryTableProps> = ({ ctx }) => {
  const {
    staffTableCardRef,
    loading,
    rows,
    filteredRows,
    searchQuery,
    setSearchQuery,
    departmentMenuRef,
    departmentMenuOpen,
    setDepartmentMenuOpen,
    setStatusMenuOpen,
    departmentFilter,
    setDepartmentFilter,
    departmentOptions,
    statusMenuRef,
    statusMenuOpen,
    statusFilter,
    setStatusFilter,
    canEditRow,
    canDeleteRow,
    openStaffPreview,
    isCurrentUserRow,
    openActionMenuRowId,
    setOpenActionMenuRowId,
    handleStartEdit,
    setDeleting,
  } = ctx;

  return (
<div
  ref={staffTableCardRef}
  className="relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.08)]"
>
  <div className="border-b border-slate-100 px-8 py-4">
    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
      <div className="text-[14px] font-medium text-slate-700">
        All Employees ({loading ? rows.length : filteredRows.length})
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative min-w-[270px] flex-1 md:w-[270px]">
          <Search
            size={16}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search employee....."
            className="w-full rounded-[10px] border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-[13px] text-slate-700 outline-none transition focus:border-brand-red focus:ring-2 focus:ring-brand-red/10"
          />
        </div>

        <div className="relative" ref={departmentMenuRef}>
          <button
            type="button"
            onClick={() => {
              setDepartmentMenuOpen((prev) => !prev);
              setStatusMenuOpen(false);
            }}
            className={`flex min-w-[150px] items-center justify-between gap-3 rounded-[10px] border bg-white px-4 py-2.5 text-[13px] text-slate-700 transition ${
              departmentMenuOpen
                ? 'border-brand-red shadow-[0_0_0_3px_rgba(239,68,68,0.10)]'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <span>{departmentFilter === 'all' ? 'All Departments' : departmentFilter}</span>
            <ChevronDown
              size={16}
              className={`text-slate-500 transition ${departmentMenuOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {departmentMenuOpen && (
            <div className="absolute right-0 top-[calc(100%+8px)] z-20 min-w-full overflow-hidden rounded-[10px] border border-slate-200 bg-white p-1.5 shadow-[0_18px_40px_rgba(15,23,42,0.14)]">
              <button
                type="button"
                onClick={() => {
                  setDepartmentFilter('all');
                  setDepartmentMenuOpen(false);
                }}
                className={`flex w-full items-center rounded-[8px] px-3 py-2 text-left text-[13px] transition ${
                  departmentFilter === 'all'
                    ? 'bg-brand-red text-white'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                All Departments
              </button>
              {departmentOptions.map((department) => (
                <button
                  key={department}
                  type="button"
                  onClick={() => {
                    setDepartmentFilter(department);
                    setDepartmentMenuOpen(false);
                  }}
                  className={`flex w-full items-center rounded-[8px] px-3 py-2 text-left text-[13px] transition ${
                    departmentFilter === department
                      ? 'bg-brand-red text-white'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {department}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative" ref={statusMenuRef}>
          <button
            type="button"
            onClick={() => {
              setStatusMenuOpen((prev) => !prev);
              setDepartmentMenuOpen(false);
            }}
            className={`flex min-w-[130px] items-center justify-between gap-3 rounded-[10px] border bg-white px-4 py-2.5 text-[13px] text-slate-700 transition ${
              statusMenuOpen
                ? 'border-brand-red shadow-[0_0_0_3px_rgba(239,68,68,0.10)]'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <span>
              {statusFilter === 'all'
                ? 'All Status'
                : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
            </span>
            <ChevronDown
              size={16}
              className={`text-slate-500 transition ${statusMenuOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {statusMenuOpen && (
            <div className="absolute right-0 top-[calc(100%+8px)] z-20 min-w-full overflow-hidden rounded-[10px] border border-slate-200 bg-white p-1.5 shadow-[0_18px_40px_rgba(15,23,42,0.14)]">
              {[
                { value: 'all', label: 'All Status' },
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setStatusFilter(option.value);
                    setStatusMenuOpen(false);
                  }}
                  className={`flex w-full items-center rounded-[8px] px-3 py-2 text-left text-[13px] transition ${
                    statusFilter === option.value
                      ? 'bg-brand-red text-white'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  </div>

  <div className="overflow-x-hidden">
    <table className="w-full border-collapse text-left">
      <thead className="bg-white">
        <tr className="border-b border-slate-100 text-[12px] font-medium text-slate-900">
          <th className="min-w-[260px] px-6 py-4">Name</th>
          <th className="min-w-[100px] px-4 py-4">Emp ID</th>
          <th className="min-w-[140px] px-4 py-4">Role</th>
          <th className="min-w-[150px] px-4 py-4">Designation</th>
          <th className="min-w-[150px] px-4 py-4">Department</th>
          <th className="min-w-[130px] px-4 py-4">Phone</th>
          <th className="min-w-[110px] px-4 py-4">Status</th>
          <th className="w-[96px] px-6 py-4 text-center">Actions</th>
        </tr>
      </thead>
      <tbody>
        {loading && rows.length === 0 ? (
          <StaffTableSkeleton rows={6} />
        ) : filteredRows.length === 0 ? (
          <tr>
            <td className="px-6 py-16 text-center text-[15px] text-slate-500" colSpan={8}>
              No staff found.
            </td>
          </tr>
        ) : (
          filteredRows.map((row) => {
            const editable = canEditRow(row);
            const deletable = canDeleteRow(row);
            const canOpenActions = editable || deletable;
            const avatarSrc = getDisplayAvatarUrl(row.avatar, row.empName);
            const isCurrentUser = isCurrentUserRow(row);

            return (
              <tr
                key={row._id}
                className="border-b border-slate-100 transition hover:bg-slate-50/40"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => openStaffPreview(row)}
                      className="h-11 w-11 cursor-pointer overflow-hidden rounded-full border border-slate-200 bg-slate-50"
                    >
                      <img src={avatarSrc} alt={row.empName} className="h-full w-full object-cover" />
                    </button>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="truncate text-[14px] font-medium text-slate-900">{row.empName}</div>
                        {isCurrentUser ? (
                          <span className="shrink-0 text-[12px] font-medium text-slate-500">(You)</span>
                        ) : null}
                      </div>
                      <div className="mt-0.5 truncate text-[12px] text-slate-500">{row.email || '--'}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 text-[13px] text-slate-700">{row.empId}</td>
                <td className="px-4 py-4">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${getRoleBadgeClass(
                      row.role,
                    )}`}
                  >
                    {formatRoleLabel(row.role)}
                  </span>
                </td>
                <td className="px-4 py-4 text-[13px] text-slate-700">{row.designation || '--'}</td>
                <td className="px-4 py-4 text-[13px] text-slate-700">{row.department || '--'}</td>
                <td className="px-4 py-4 text-[13px] text-slate-700">{row.phone || '--'}</td>
                <td className="px-4 py-4">
                  <span
                    className={`inline-flex min-w-[60px] items-center justify-center rounded-full px-3 py-1 text-[11px] font-medium capitalize ${getStatusBadgeClass(
                      row.status,
                    )}`}
                  >
                    {row.status || '--'}
                  </span>
                </td>
                <td className="px-6 py-4 text-center" onClick={(event) => event.stopPropagation()}>
                  {canOpenActions ? (
                    <StaffEmployeeActionMenu
                      isOpen={openActionMenuRowId === row._id}
                      showEdit={editable}
                      showDelete={deletable}
                      onToggle={() =>
                        setOpenActionMenuRowId((current) => (current === row._id ? null : row._id))
                      }
                      onClose={() => setOpenActionMenuRowId(null)}
                      onEdit={() => handleStartEdit(row)}
                      onDelete={() => setDeleting(row)}
                    />
                  ) : (
                    <span className="text-[12px] text-slate-300">-</span>
                  )}
                </td>
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  </div>

</div>
  );
};

export default StaffDirectoryTable;
