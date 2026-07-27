import React from 'react';
import { X, Trash2, Sparkles, Plus } from 'lucide-react';
import { TaskStatus } from '../../types';

interface ProjectCharterDetailModalsProps {
  isDeleteModalOpen: boolean;
  onCloseDeleteModal: () => void;
  onConfirmDelete: () => void;

  aiErrorMessage: string | null;
  onCloseAiError: () => void;

  isAddTaskModalOpen: boolean;
  onCloseAddTaskModal: () => void;
  newTaskTitle: string;
  setNewTaskTitle: (title: string) => void;
  handleAddTask: () => void;

  isAiConfigModalOpen: boolean;
  onCloseAiConfigModal: () => void;
  aiTaskCount: string;
  setAiTaskCount: (count: string) => void;
  aiStatus: TaskStatus;
  setAiStatus: (status: TaskStatus) => void;
  handleAiSuggest: () => void;
}

export const ProjectCharterDetailModals: React.FC<ProjectCharterDetailModalsProps> = ({
  isDeleteModalOpen,
  onCloseDeleteModal,
  onConfirmDelete,
  aiErrorMessage,
  onCloseAiError,
  isAddTaskModalOpen,
  onCloseAddTaskModal,
  newTaskTitle,
  setNewTaskTitle,
  handleAddTask,
  isAiConfigModalOpen,
  onCloseAiConfigModal,
  aiTaskCount,
  setAiTaskCount,
  aiStatus,
  setAiStatus,
  handleAiSuggest,
}) => {
  return (
    <>
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/60 backdrop-blur-md">
          <div className="bg-white rounded-4xl shadow-2xl w-full max-w-lg p-8 border border-slate-100 relative">
            <button
              className="absolute top-4 right-4 text-slate-300 hover:text-brand-red transition-colors"
              onClick={onCloseDeleteModal}
            >
              <X size={20} />
            </button>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-brand-red flex items-center justify-center text-white shadow-md">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-brand-navy leading-tight">
                  Delete Charter Frame
                </h3>
                <p className="text-[13px] text-brand-grey font-medium tracking-[0.15em] mt-1 uppercase">
                  This action cannot be undone
                </p>
              </div>
            </div>
            <p className="text-[15px] text-slate-700 mb-8">Permanently purge this charter frame?</p>
            <div className="flex justify-end gap-3">
              <button
                className="px-5 py-2.5 rounded-full text-[14px] font-black tracking-[0.15em] text-brand-grey bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors uppercase"
                onClick={onCloseDeleteModal}
              >
                Cancel
              </button>
              <button
                onClick={onConfirmDelete}
                className="px-7 py-2.5 rounded-full text-[14px] font-black tracking-[0.15em] text-white bg-brand-red shadow-lg shadow-brand-red/30 hover:bg-brand-navy transition-colors uppercase"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {aiErrorMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/60 backdrop-blur-md">
          <div className="bg-white rounded-4xl shadow-2xl w-full max-w-lg p-8 border border-slate-100 relative">
            <button
              className="absolute top-4 right-4 text-slate-300 hover:text-brand-red transition-colors"
              onClick={onCloseAiError}
            >
              <X size={20} />
            </button>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-brand-red flex items-center justify-center text-white shadow-md">
                <Sparkles size={20} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-brand-navy leading-tight">
                  AI Protocol Error
                </h3>
                <p className="text-[13px] text-brand-grey font-medium tracking-[0.15em] mt-1 uppercase">
                  Task synthesis unavailable
                </p>
              </div>
            </div>
            <p className="text-[15px] text-slate-700 mb-8">{aiErrorMessage}</p>
            <div className="flex justify-end">
              <button
                className="px-7 py-2.5 rounded-full text-[14px] font-black tracking-[0.15em] text-white bg-brand-red shadow-lg shadow-brand-red/30 hover:bg-brand-navy transition-colors uppercase"
                onClick={onCloseAiError}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {isAddTaskModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-white/60 backdrop-blur-md">
          <div className="bg-white rounded-4xl shadow-2xl w-full max-w-lg p-8 border border-slate-100 relative">
            <button
              className="absolute top-4 right-4 text-slate-300 hover:text-brand-navy transition-colors"
              onClick={onCloseAddTaskModal}
            >
              <X size={20} />
            </button>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-brand-navy flex items-center justify-center text-white shadow-md">
                <Plus size={20} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-brand-navy leading-tight">Add Task</h3>
                <p className="text-[13px] text-brand-grey font-medium tracking-[0.15em] mt-1 uppercase">
                  Create a project task
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <label className="text-[13px] font-black tracking-[0.2em] text-slate-500 uppercase">
                Task Title
              </label>
              <input
                autoFocus
                value={newTaskTitle}
                onChange={e => setNewTaskTitle(e.target.value)}
                className="w-full rounded-3xl border border-slate-200 px-4 py-3 text-brand-navy text-[15px] font-medium outline-none focus:ring-2 focus:ring-brand-navy/30 focus:border-brand-navy bg-slate-50/40"
                placeholder="Enter task title"
              />
            </div>
            <div className="flex justify-end gap-3 mt-8">
              <button
                className="px-5 py-2.5 rounded-full text-[14px] font-black tracking-[0.15em] text-brand-grey bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors uppercase"
                onClick={onCloseAddTaskModal}
              >
                Cancel
              </button>
              <button
                disabled={!newTaskTitle.trim()}
                onClick={handleAddTask}
                className={`px-7 py-2.5 rounded-full text-[14px] font-black tracking-[0.15em] text-white bg-brand-navy shadow-lg shadow-brand-navy/30 hover:bg-brand-red transition-colors uppercase ${
                  !newTaskTitle.trim() ? 'opacity-60 cursor-not-allowed' : ''
                }`}
              >
                Create Task
              </button>
            </div>
          </div>
        </div>
      )}

      {isAiConfigModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-white/60 backdrop-blur-md">
          <div className="bg-white rounded-4xl shadow-2xl w-full max-w-lg p-8 border border-slate-100 relative">
            <button
              className="absolute top-4 right-4 text-slate-300 hover:text-brand-red transition-colors"
              onClick={onCloseAiConfigModal}
            >
              <X size={20} />
            </button>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-brand-red flex items-center justify-center text-white shadow-md">
                <Sparkles size={20} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-brand-navy leading-tight">
                  Generate Tasks
                </h3>
                <p className="text-[13px] text-brand-grey font-medium tracking-[0.15em] mt-1 uppercase">
                  Configure synthesis parameters
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-[13px] font-black tracking-[0.2em] text-slate-500 uppercase">
                  Number of Tasks (1-10)
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={aiTaskCount}
                  onChange={e => setAiTaskCount(e.target.value)}
                  className="w-full rounded-3xl border border-slate-200 px-4 py-3 text-brand-navy text-[15px] font-medium outline-none focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red bg-slate-50/40"
                />
              </div>
              <div className="space-y-3">
                <label className="text-[13px] font-black tracking-[0.2em] text-slate-500 uppercase">
                  Initial Status
                </label>
                <select
                  value={aiStatus}
                  onChange={e => setAiStatus(e.target.value as TaskStatus)}
                  className="w-full rounded-3xl border border-slate-200 px-4 py-3 text-brand-navy text-[15px] font-medium outline-none focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red bg-slate-50/40 cursor-pointer"
                >
                  <option value="todo">todo</option>
                  <option value="doing">doing</option>
                  <option value="review">review</option>
                  <option value="done">done</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-8">
              <button
                className="px-5 py-2.5 rounded-full text-[14px] font-black tracking-[0.15em] text-brand-grey bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors uppercase"
                onClick={onCloseAiConfigModal}
              >
                Cancel
              </button>
              <button
                disabled={!aiTaskCount || parseInt(aiTaskCount || '0', 10) <= 0}
                onClick={handleAiSuggest}
                className={`px-7 py-2.5 rounded-full text-[14px] font-black tracking-[0.15em] text-white bg-brand-red shadow-lg shadow-brand-red/30 hover:bg-brand-navy transition-colors uppercase ${
                  !aiTaskCount || parseInt(aiTaskCount || '0', 10) <= 0
                    ? 'opacity-60 cursor-not-allowed'
                    : ''
                }`}
              >
                Generate
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ProjectCharterDetailModals;
