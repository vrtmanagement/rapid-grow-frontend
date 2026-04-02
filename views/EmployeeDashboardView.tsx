import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE, getAuthHeaders } from '../config/api';
import { LayoutDashboard } from 'lucide-react';
import { PageHeaderSkeleton, ProjectCardGridSkeleton } from '../components/ui/Skeleton';
import ExecutionMatrix from '../components/dashboard/ExecutionMatrix';
import { usePermissions } from '../context/PermissionContext';

interface Project {
  clientProjectId: string;
  name: string;
  status?: string;
  problemStatement?: string;
}

const EmployeeDashboardView: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [empId, setEmpId] = useState<string | null>(null);
  const { hasPermission } = usePermissions();
  const canViewExecutionMatrix = hasPermission('EXECUTION_MATRIX_VIEW');

  useEffect(() => {
    const stored = localStorage.getItem('rapidgrow-admin');
    if (!stored) return;
    try {
      const { employee } = JSON.parse(stored);
      const id = employee?.empId;
      if (id) {
        setEmpId(id);
        fetchProjects(id);
      } else {
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  }, []);

  const fetchProjects = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/project-charters/assigned/${id}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setProjects(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error('Failed to fetch projects', e);
    } finally {
      setLoading(false);
    }
  };

  if (!empId && !loading) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-12">
      <div>
        {loading ? (
          <PageHeaderSkeleton />
        ) : (
          <>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-1.5 w-8 bg-brand-red rounded-full" />
              <span className="text-[15px] text-slate-500">Your Workspace</span>
            </div>
            <h2 className="text-4xl text-slate-900 leading-none">Dashboard</h2>
            <p className="text-slate-500 text-lg mt-3">
              Projects you are assigned to as Champion, Lead, or Team Member
            </p>
          </>
        )}
      </div>

      {loading ? (
        <ProjectCardGridSkeleton count={3} />
      ) : (
        <>
          {projects.length === 0 ? (
            <div className="bg-white rounded-3xl p-16 border border-slate-200 shadow-sm text-center">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <LayoutDashboard className="w-10 h-10 text-slate-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-700">No Projects Assigned</h3>
              <p className="text-slate-500 mt-2">
                You have not been assigned to any projects yet. Contact your admin to get assigned.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {projects.map((project) => (
                <Link
                  key={project.clientProjectId}
                  to={`/project/${project.clientProjectId}`}
                  className="bg-white rounded-3xl p-8 border-2 border-slate-100 shadow-sm hover:shadow-xl hover:border-brand-red/30 hover:-translate-y-1 transition-all text-left group"
                >
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center group-hover:bg-brand-red transition-colors">
                      <LayoutDashboard className="w-7 h-7 text-white" />
                    </div>
                    <span className="px-4 py-2 bg-slate-100 text-slate-700 text-[13px] font-semibold rounded-full">
                      {project.status || 'draft'}
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 group-hover:text-brand-red transition-colors mb-2">
                    {project.name}
                  </h3>
                  <p className="text-slate-500 text-sm line-clamp-2">
                    {project.problemStatement || 'View full project details by clicking this card.'}
                  </p>
                  <div className="mt-6 pt-6 border-t border-slate-100 flex items-center gap-2 text-brand-red text-sm font-semibold">
                    View details
                  </div>
                </Link>
              ))}
            </div>
          )}

          {canViewExecutionMatrix && (
            <div className="bg-white p-12 rounded-[2rem] shadow-2xl border border-slate-200 relative overflow-visible">
              <div className="flex items-center justify-between mb-12">
                <div>
                  <h3 className="text-2xl text-slate-900">Execution Matrix</h3>
                  <p className="text-[15px] text-slate-800 mt-1">Real-Time Performance Throughput</p>
                </div>
                <div className="flex items-center gap-2 bg-slate-50 px-5 py-2.5 rounded-xl border border-slate-100">
                  <div className="w-2 h-2 rounded-full bg-brand-red animate-pulse"></div>
                  <span className="text-[15px] text-slate-600">Live Feed Active</span>
                </div>
              </div>
              <ExecutionMatrix />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default EmployeeDashboardView;
