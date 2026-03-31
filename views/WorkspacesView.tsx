import React, { useEffect, useState } from 'react';
import { Routes, Route, useNavigate, Link } from 'react-router-dom';
import { PlanningState, WorkspaceProject } from '../types';
import { Plus, Trash2, X, Briefcase } from 'lucide-react';
import WorkspaceP1Detail from '../components/WorkspaceP1Detail';
import { API_BASE, getAuthHeaders } from '../config/api';
import { Skeleton, SkeletonBlock } from '../components/ui/Skeleton';

interface Props {
  state: PlanningState;
  updateState: (updater: (prev: PlanningState) => PlanningState) => void;
  loading?: boolean;
}
const WorkspacesView: React.FC<Props> = (props) => {
  const { state, updateState, loading = false } = props;
  const generateId = () =>
    (typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? (crypto.randomUUID() as string)
      : Math.random().toString(36).slice(2));
  const navigate = useNavigate();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [pendingDeleteProjectId, setPendingDeleteProjectId] = useState<string | null>(null);
  const [chartersLoading, setChartersLoading] = useState(loading);

  const canCreateProject = state.currentUser.role === 'Admin' || state.currentUser.role === 'Leader';
  const canDeleteProject = state.currentUser.role === 'Admin';

  // Load existing project charters from backend (never show default "Rapid Grow execution framework")
  useEffect(() => {
    const loadProjects = async () => {
      setChartersLoading(true);
      try {
        const res = await fetch(`${API_BASE}/project-charters`, {
          headers: getAuthHeaders(),
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!Array.isArray(data)) return;

        const mapped: WorkspaceProject[] = data.map((item: any) => ({
          id: item.clientProjectId,
          name: item.name,
          status: item.status || 'draft',
          dateCreated:
            item.dateCreated ||
            (item.createdAt
              ? String(item.createdAt).split('T')[0]
              : new Date().toISOString().split('T')[0]),
          businessCase: item.businessCase || '',
          problemStatement: item.problemStatement || '',
          goalStatement: item.goalStatement || '',
          inScope: item.inScope || '',
          outOfScope: item.outOfScope || '',
          benefits: item.benefits || '',
          champion: item.champion || '',
          championRole: item.championRole || 'Executive Sponsor',
          lead: item.lead || '',
          leadRole: item.leadRole || 'Project Manager',
          smeList: item.smeList || [],
          projectTeam: item.projectTeam || [],
          phases: item.phases || {},
          tasks: item.tasks || [],
        }));

        updateState(prev => ({
          ...prev,
          workspaces: prev.workspaces.map((ws, i) =>
            i === 0 ? { ...ws, projects: mapped } : ws
          ),
        }));
      } catch (e) {
        // You can replace this with UI error handling if desired
        console.error('Failed to load project charters', e);
      } finally {
        setChartersLoading(false);
      }
    };

    loadProjects();
  }, [updateState]);

  const handleCreateProject = () => {
    if (!canCreateProject) return;
    const name = newProjectName.trim();
    if (!name) return;
    const newProject: WorkspaceProject = {
      id: `p-${generateId()}`,
      name,
      status: 'draft',
      dateCreated: new Date().toISOString().split('T')[0],
      businessCase: '',
      problemStatement: '',
      goalStatement: '',
      inScope: '',
      outOfScope: '',
      benefits: '',
      champion: '',
      championRole: 'Executive Sponsor',
      lead: '',
      leadRole: 'Project Manager',
      smeList: [],
      projectTeam: [],
      // Start with a single default Phase 1 only; additional phases can be added from the detail screen
      phases: {
        phase1: 'Establish baseline metrics and organizational context.',
      },
      tasks: []
    };
    updateState(prev => ({
      ...prev,
      workspaces: prev.workspaces.map((ws, i) => i === 0 ? { ...ws, projects: [...ws.projects, newProject] } : ws)
    }));
    setIsCreateModalOpen(false);
    setNewProjectName('');
    navigate(`${newProject.id}`);
  };

  const showPageSkeleton = loading || chartersLoading;

  return (
    <Routes>
      <Route path="/" element={
        <div className="min-h-screen flex flex-col -m-16 animate-in fade-in duration-1000 bg-white relative">
          <div className="bg-white border-b-2 border-slate-50 p-6 flex flex-col md:flex-row justify-between items-center gap-10 sticky -top-16 z-30 shadow-sm">
            <div className="flex items-start gap-6">
              <div className="w-2 h-12 bg-brand-red rounded-full mt-1 shrink-0"></div>
              <div>
                <h2 className="text-4xl font-black text-brand-navy  leading-none">Command Charters</h2>
                <p className=" font-black  mt-3  tracking-[0.1em] text-[15px] ">Performance Frame Repository & Deployment Hub</p>
              </div>
            </div>
            {canCreateProject && (
              <button 
              onClick={() => setIsCreateModalOpen(true)} 
                className="px-8 py-4 bg-brand-red text-white rounded-5xl font-black  text-md shadow-3xl shadow-brand-red/30 hover:bg-brand-navy transition-all flex items-center gap-6 group hover:-translate-y-1 active:translate-y-0"
              >
                <Plus size={28} className="group-hover:rotate-90 transition-transform" /> Deploy New frame
              </button>
            )}
          </div>

          {!showPageSkeleton && isCreateModalOpen && (
            <div className="fixed inset-0 z-40 flex items-center justify-center bg-white/60 backdrop-blur-md">
              <div className="bg-white rounded-4xl shadow-2xl w-full max-w-lg p-8 relative border border-slate-100">
                <button 
                  className="absolute top-4 right-4 text-slate-300 hover:text-brand-red transition-colors"
                  onClick={() => { setIsCreateModalOpen(false); setNewProjectName(''); }}
                >
                  <X size={20} />
                </button>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-10 h-10 rounded-2xl bg-brand-red flex items-center justify-center text-white shadow-md">
                    <Briefcase size={20} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-brand-navy leading-tight">Deploy New Frame</h3>
                    <p className="text-[13px] text-brand-grey font-medium tracking-[0.15em] mt-1 uppercase">
                      Strategic mission initialization
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  <label className="text-[13px] font-black tracking-[0.2em] text-slate-500 uppercase">
                    Frame Name
                  </label>
                  <input
                    autoFocus
                    value={newProjectName}
                    onChange={e => setNewProjectName(e.target.value)}
                    className="w-full rounded-3xl border border-slate-200 px-4 py-3 text-brand-navy text-[15px] font-medium outline-none focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red bg-slate-50/40"
                    placeholder="Enter strategic mission name"
                  />
                </div>
                <div className="flex justify-end gap-3 mt-8">
                  <button
                    className="px-5 py-2.5 rounded-full text-[14px] font-black tracking-[0.15em] text-brand-grey bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors uppercase"
                    onClick={() => { setIsCreateModalOpen(false); setNewProjectName(''); }}
                  >
                    Cancel
                  </button>
                  <button
                    disabled={!newProjectName.trim()}
                    onClick={handleCreateProject}
                    className={`px-7 py-2.5 rounded-full text-[14px] font-black tracking-[0.15em] text-white bg-brand-red shadow-lg shadow-brand-red/30 hover:bg-brand-navy transition-colors uppercase ${
                      !newProjectName.trim() ? 'opacity-60 cursor-not-allowed' : ''
                    }`}
                  >
                    Deploy
                  </button>
                </div>
              </div>
            </div>
          )}

        {!showPageSkeleton && pendingDeleteProjectId && canDeleteProject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/60 backdrop-blur-md">
              <div className="bg-white rounded-4xl shadow-2xl w-full max-w-lg p-8 border border-slate-100 relative">
                <button 
                  className="absolute top-4 right-4 text-slate-300 hover:text-brand-red transition-colors"
                  onClick={() => setPendingDeleteProjectId(null)}
                >
                  <X size={20} />
                </button>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-10 h-10 rounded-2xl bg-brand-red flex items-center justify-center text-white shadow-md">
                    <Trash2 size={20} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-brand-navy leading-tight">Delete Charter Frame</h3>
                    <p className="text-[13px] text-brand-grey font-medium tracking-[0.15em] mt-1 uppercase">
                      This action cannot be undone
                    </p>
                  </div>
                </div>
                <p className="text-[15px] text-slate-700 mb-8">
                  Permanently purge this charter frame?
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    className="px-5 py-2.5 rounded-full text-[14px] font-black tracking-[0.15em] text-brand-grey bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors uppercase"
                    onClick={() => setPendingDeleteProjectId(null)}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      if (!pendingDeleteProjectId) return;
                      try {
                        const res = await fetch(
                          `${API_BASE}/project-charters/${pendingDeleteProjectId}`,
                          {
                            method: 'DELETE',
                            headers: getAuthHeaders(),
                          }
                        );
                        if (!res.ok) {
                          const err = await res.json().catch(() => ({}));
                          console.error('Delete failed', err?.message || res.statusText);
                          return;
                        }
                        updateState(prev => ({
                          ...prev,
                          workspaces: prev.workspaces.map(ws => ({
                            ...ws,
                            projects: ws.projects.filter(project => project.id !== pendingDeleteProjectId)
                          }))
                        }));
                      } catch (e) {
                        console.error('Failed to delete project charter', e);
                      }
                      setPendingDeleteProjectId(null);
                    }}
                    className="px-7 py-2.5 rounded-full text-[14px] font-black tracking-[0.15em] text-white bg-brand-red shadow-lg shadow-brand-red/30 hover:bg-brand-navy transition-colors uppercase"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
          <div className="flex-1 p-6 overflow-auto no-scrollbar pb-40">
            {showPageSkeleton ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-16 animate-pulse">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={`charter-skeleton-${index}`}
                    className="bg-white rounded-5xl p-14 border-2 border-slate-100 shadow-sm relative overflow-hidden flex flex-col min-h-[420px]"
                  >
                    <div className="absolute top-0 right-0 w-40 h-40 bg-slate-100/70 -mr-20 -mt-20 rounded-full" />
                    <div className="flex items-center justify-between mb-12 relative z-10">
                      <div className="w-15 h-15 rounded-[1.8rem] bg-slate-200" />
                      <SkeletonBlock className="h-10 w-24 rounded-full" />
                    </div>
                    <div className="space-y-4 relative z-10">
                      <div className="h-10 w-3/4 rounded-full bg-slate-200" />
                      <div className="space-y-3">
                        <Skeleton className="h-4 w-full rounded-full bg-slate-100" />
                        <Skeleton className="h-4 w-5/6 rounded-full bg-slate-100" />
                        <Skeleton className="h-4 w-2/3 rounded-full bg-slate-100" />
                      </div>
                    </div>
                    <div className="pt-0 mt-auto flex justify-between items-center">
                      <div className="h-5 w-40 rounded-full bg-slate-100" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-16">
            {state.workspaces.flatMap(w => w.projects).map(p => (
              <Link 
                to={`${p.id}`} 
                key={p.id} 
                className="bg-white rounded-5xl p-14 border-2 border-slate-100 shadow-sm hover:shadow-4xl hover:-translate-y-4 hover:border-brand-red transition-all group relative overflow-hidden flex flex-col min-h-[420px]"
              >
                {canDeleteProject && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setPendingDeleteProjectId(p.id);
                    }}
                    className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/80 text-slate-300 hover:text-brand-red hover:bg-red-50 shadow-sm transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
                 <div className="absolute top-0 right-0 w-40 h-40 bg-brand-red/5 -mr-20 -mt-20 rounded-full group-hover:scale-150 transition-transform duration-1000"></div>
                 <div className="flex items-center justify-between mb-12">
                   <div className="w-15 h-15 bg-brand-navy rounded-[1.8rem] flex items-center justify-center p-5 shadow-2xl group-hover:bg-brand-red transition-colors shadow-brand-navy/20 group-hover:shadow-brand-red/20">
                      <Briefcase size={26} className="text-white" />
                   </div>
                   <div className="px-6 py-2.5 bg-slate-50 text-brand-navy text-[15px] font-black tracking-[0.1em] rounded-full border border-slate-200 group-hover:bg-brand-red group-hover:text-white group-hover:border-transparent transition-all">
                      {p.status}
                   </div>
                 </div>
                 <h3 className="text-4xl font-black  text-brand-navy group-hover:text-brand-red mb-2 tracking-tighter leading-none transition-colors">{p.name}</h3>
                 <p className="text-brand-grey text-base font-medium line-clamp-3 mb-auto  leading-relaxed opacity-50 group-hover:opacity-100 transition-opacity">
                   {p.problemStatement || "Framework initialized. Define strategic architecture to begin high-performance execution."}
                 </p>
                 <div className="pt-0 border-t border-slate-50 flex justify-between items-center mt-12">
                   <span className="text-[15px] font-black text-brand-red  tracking-[0.1em]  group-hover:translate-x-3 transition-transform flex items-center gap-4">
                      Initialize deployment <Plus size={16}/>
                   </span>
                 </div>
              </Link>
            ))}
            {state.workspaces.flatMap(w => w.projects).length === 0 && (
               <div className="col-span-full py-32 text-center border-4 border-dashed border-slate-100 rounded-5xl">
                  <div className="w-32 h-32 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-10 border-2 border-slate-100">
                    <Plus className="text-slate-400" size={64} />
                  </div>
                  <h3 className="text-4xl font-black text-slate-400   tracking-[0.2em]">Frame repository empty</h3>
                  <button 
                    onClick={handleCreateProject} 
                    className="mt-12 px-12 py-5 bg-slate-50 text-slate-300 rounded-full text-md font-black  tracking-[0.2em] border border-slate-100 hover:bg-brand-red hover:text-white hover:border-transparent transition-all"
                  >
                    System initialization Required
                  </button>
               </div>
            )}
            </div>
            )}
          </div>
        </div>
      } />
      <Route path="/:projectId" element={<WorkspaceP1Detail {...props} />} />
    </Routes>
  );
};

export default WorkspacesView;
