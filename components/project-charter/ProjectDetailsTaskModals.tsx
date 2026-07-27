import React from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { ProjectTeamMember } from '../../types';
import { CREATE_INPUT_CLASS, ThemedDatePicker } from '../spaces/SpacesFormControls';
import { ProjectLinkedTask, ProjectTaskEditDraft, getTaskKey } from './projectDetailsTypes';

interface ProjectDetailsTaskModalsProps {
  projectName: string;
  projectAssignees: ProjectTeamMember[];

  isAddTaskOpen: boolean;
  taskTitle: string;
  setTaskTitle: (value: string) => void;
  taskDescription: string;
  setTaskDescription: (value: string) => void;
  taskAssigneeId: string;
  setTaskAssigneeId: (value: string) => void;
  taskDueDate: string;
  setTaskDueDate: (value: string) => void;
  taskPriority: 'low' | 'medium' | 'high';
  setTaskPriority: (value: 'low' | 'medium' | 'high') => void;
  taskError: string | null;
  taskSubmitting: boolean;
  closeAddTaskModal: () => void;
  onCreateTask: () => void;

  editingTask: ProjectLinkedTask | null;
  editingTaskDraft: ProjectTaskEditDraft;
  setEditingTaskDraft: React.Dispatch<React.SetStateAction<ProjectTaskEditDraft>>;
  closeEditTaskModal: () => void;
  onUpdateTask: (task: ProjectLinkedTask, updates: Partial<ProjectTaskEditDraft>) => void;

  taskPendingId: string | null;
  taskActionError: string | null;

  deleteTaskTarget: ProjectLinkedTask | null;
  setDeleteTaskTarget: (task: ProjectLinkedTask | null) => void;
  setTaskActionError: (error: string | null) => void;
  onDeleteTask: (task: ProjectLinkedTask) => void;
}

export const ProjectDetailsTaskModals: React.FC<ProjectDetailsTaskModalsProps> = ({
  projectName,
  projectAssignees,
  isAddTaskOpen,
  taskTitle,
  setTaskTitle,
  taskDescription,
  setTaskDescription,
  taskAssigneeId,
  setTaskAssigneeId,
  taskDueDate,
  setTaskDueDate,
  taskPriority,
  setTaskPriority,
  taskError,
  taskSubmitting,
  closeAddTaskModal,
  onCreateTask,
  editingTask,
  editingTaskDraft,
  setEditingTaskDraft,
  closeEditTaskModal,
  onUpdateTask,
  taskPendingId,
  taskActionError,
  deleteTaskTarget,
  setDeleteTaskTarget,
  setTaskActionError,
  onDeleteTask,
}) => {
  return (
    <>
      {isAddTaskOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[2rem] border border-slate-200 bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
              <div>
                <h3 className="text-xl font-semibold text-slate-950">Add Task</h3>
                <p className="mt-1 text-sm text-slate-500">This task will stay linked to {projectName} and sync to Task Hub.</p>
              </div>
              <button
                type="button"
                onClick={closeAddTaskModal}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid gap-4 px-6 py-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-700">Task title</label>
                <input
                  value={taskTitle}
                  onChange={(event) => setTaskTitle(event.target.value)}
                  placeholder="Enter task title"
                  className={CREATE_INPUT_CLASS}
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-700">Description</label>
                <textarea
                  value={taskDescription}
                  onChange={(event) => setTaskDescription(event.target.value)}
                  rows={4}
                  placeholder="Add a short task description"
                  className={`${CREATE_INPUT_CLASS} min-h-[110px] resize-none`}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Assign to</label>
                <select
                  value={taskAssigneeId}
                  onChange={(event) => setTaskAssigneeId(event.target.value)}
                  className={`${CREATE_INPUT_CLASS} appearance-none bg-white`}
                >
                  <option value="">Unassigned</option>
                  {projectAssignees.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.role && member.role.toLowerCase() !== member.name.toLowerCase()
                        ? `${member.name} - ${member.role}`
                        : member.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Due date</label>
                <ThemedDatePicker value={taskDueDate} onChange={setTaskDueDate} />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Priority</label>
                <select
                  value={taskPriority}
                  onChange={(event) => setTaskPriority(event.target.value as 'low' | 'medium' | 'high')}
                  className={`${CREATE_INPUT_CLASS} appearance-none bg-white`}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Project</label>
                <div className={`${CREATE_INPUT_CLASS} flex items-center bg-slate-50 text-slate-500`}>
                  <span className="truncate">{projectName}</span>
                </div>
              </div>

              {taskError ? <p className="md:col-span-2 text-sm text-rose-600">{taskError}</p> : null}
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-5">
              <button
                type="button"
                onClick={closeAddTaskModal}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void onCreateTask()}
                disabled={!taskTitle.trim() || taskSubmitting}
                className={`inline-flex items-center gap-2 rounded-2xl border border-slate-900/10 bg-gradient-to-r from-slate-950 via-[#111c44] to-[#1d4ed8] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(15,23,42,0.18)] transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(29,78,216,0.24)] ${!taskTitle.trim() || taskSubmitting ? 'cursor-not-allowed opacity-60 hover:translate-y-0 hover:shadow-[0_14px_30px_rgba(15,23,42,0.18)]' : ''}`}
              >
                <Plus size={16} />
                {taskSubmitting ? 'Creating...' : 'Add Task'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {editingTask ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[2rem] border border-slate-200 bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
              <div>
                <h3 className="text-xl font-semibold text-slate-950">Edit Task</h3>
                <p className="mt-1 text-sm text-slate-500">Update this linked task without leaving the project page.</p>
              </div>
              <button
                type="button"
                onClick={closeEditTaskModal}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid gap-4 px-6 py-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-700">Task title</label>
                <input
                  value={editingTaskDraft.title}
                  onChange={(event) => setEditingTaskDraft((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="Enter task title"
                  className={CREATE_INPUT_CLASS}
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-700">Description</label>
                <textarea
                  value={editingTaskDraft.description}
                  onChange={(event) => setEditingTaskDraft((prev) => ({ ...prev, description: event.target.value }))}
                  rows={4}
                  placeholder="Add a short task description"
                  className={`${CREATE_INPUT_CLASS} min-h-[110px] resize-none`}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Assign to</label>
                <select
                  value={editingTaskDraft.assigneeId}
                  onChange={(event) => setEditingTaskDraft((prev) => ({ ...prev, assigneeId: event.target.value }))}
                  className={`${CREATE_INPUT_CLASS} appearance-none bg-white`}
                >
                  <option value="">Unassigned</option>
                  {projectAssignees.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.role && member.role.toLowerCase() !== member.name.toLowerCase()
                        ? `${member.name} - ${member.role}`
                        : member.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Due date</label>
                <ThemedDatePicker
                  value={editingTaskDraft.dueDate}
                  onChange={(value) => setEditingTaskDraft((prev) => ({ ...prev, dueDate: value }))}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Priority</label>
                <select
                  value={editingTaskDraft.priority}
                  onChange={(event) => setEditingTaskDraft((prev) => ({ ...prev, priority: event.target.value as 'low' | 'medium' | 'high' }))}
                  className={`${CREATE_INPUT_CLASS} appearance-none bg-white`}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Status</label>
                <select
                  value={editingTaskDraft.status}
                  onChange={(event) =>
                    setEditingTaskDraft((prev) => ({
                      ...prev,
                      status: event.target.value as ProjectTaskEditDraft['status'],
                    }))
                  }
                  className={`${CREATE_INPUT_CLASS} appearance-none bg-white`}
                >
                  <option value="todo">To Do</option>
                  <option value="doing">Doing</option>
                  <option value="review">Submitted</option>
                  <option value="done">Done</option>
                  <option value="blocked">Blocked</option>
                </select>
              </div>

              {taskActionError ? <p className="md:col-span-2 text-sm text-rose-600">{taskActionError}</p> : null}
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-5">
              <button
                type="button"
                onClick={closeEditTaskModal}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void onUpdateTask(editingTask, editingTaskDraft)}
                disabled={!editingTaskDraft.title.trim() || taskPendingId === getTaskKey(editingTask)}
                className={`inline-flex items-center gap-2 rounded-2xl border border-slate-900/10 bg-gradient-to-r from-slate-950 via-[#111c44] to-[#1d4ed8] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(15,23,42,0.18)] transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(29,78,216,0.24)] ${!editingTaskDraft.title.trim() || taskPendingId === getTaskKey(editingTask) ? 'cursor-not-allowed opacity-60 hover:translate-y-0 hover:shadow-[0_14px_30px_rgba(15,23,42,0.18)]' : ''}`}
              >
                {taskPendingId === getTaskKey(editingTask) ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteTaskTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-slate-950">Delete Task</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Delete <span className="font-semibold text-slate-700">{deleteTaskTarget.title}</span> from this project and task hub.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDeleteTaskTarget(null);
                  setTaskActionError(null);
                }}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800"
              >
                <X size={16} />
              </button>
            </div>

            {taskActionError ? <p className="mt-4 text-sm text-rose-600">{taskActionError}</p> : null}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setDeleteTaskTarget(null);
                  setTaskActionError(null);
                }}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void onDeleteTask(deleteTaskTarget)}
                disabled={taskPendingId === getTaskKey(deleteTaskTarget)}
                className={`inline-flex items-center gap-2 rounded-2xl bg-rose-50 px-5 py-2.5 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-100 ${taskPendingId === getTaskKey(deleteTaskTarget) ? 'cursor-not-allowed opacity-60' : ''}`}
              >
                <Trash2 size={16} />
                {taskPendingId === getTaskKey(deleteTaskTarget) ? 'Deleting...' : 'Delete Task'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default ProjectDetailsTaskModals;
