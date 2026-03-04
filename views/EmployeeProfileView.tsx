import React, { useState, useEffect } from 'react';

const EmployeeProfileView: React.FC = () => {
  const [employee, setEmployee] = useState<any>(null);

  useEffect(() => {
    const stored = localStorage.getItem('rapidgrow-admin');
    if (!stored) return;
    try {
      const { employee: emp } = JSON.parse(stored);
      setEmployee(emp);
    } catch {}
  }, []);

  if (!employee) return null;

  return (
    <div className="max-w-3xl mx-auto space-y-12">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="h-1.5 w-8 bg-brand-red rounded-full" />
          <span className="text-[15px] text-slate-500">Personal Information</span>
        </div>
        <h2 className="text-4xl text-slate-900 leading-none">My Profile</h2>
        <p className="text-slate-500 text-lg mt-3">Your employee details and account information</p>
      </div>

      <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="p-8 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-brand-red rounded-2xl flex items-center justify-center text-white text-2xl font-bold">
              {(employee.empName || '').charAt(0)}
            </div>
            <div>
              <h3 className="text-2xl font-bold text-slate-900">{employee.empName}</h3>
              <p className="text-slate-600 mt-1">
                {employee.designation} • {employee.department}
              </p>
              <span className="inline-block mt-2 px-4 py-1.5 bg-green-100 text-green-700 text-sm font-semibold rounded-full capitalize">
                {employee.status || 'active'}
              </span>
            </div>
          </div>
        </div>

        <div className="p-8">
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <dt className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Employee ID</dt>
              <dd className="text-lg font-mono text-slate-900">{employee.empId}</dd>
            </div>
            <div>
              <dt className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Full Name</dt>
              <dd className="text-lg text-slate-900">{employee.empName}</dd>
            </div>
            <div>
              <dt className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Designation</dt>
              <dd className="text-lg text-slate-900">{employee.designation}</dd>
            </div>
            <div>
              <dt className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Department</dt>
              <dd className="text-lg text-slate-900">{employee.department}</dd>
            </div>
            {employee.email && (
              <div>
                <dt className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Email</dt>
                <dd className="text-lg text-slate-900">{employee.email}</dd>
              </div>
            )}
            {employee.phone && (
              <div>
                <dt className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Phone</dt>
                <dd className="text-lg text-slate-900">{employee.phone}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>
    </div>
  );
};

export default EmployeeProfileView;
