import React from 'react';
import { Bell, Clock, Plus, Trash2 } from 'lucide-react';
import { WorkspaceProject, WorkspaceTask } from '../../types';
import { Employee } from '../WorkspaceP1Detail';

interface WorkspaceP1TasksSectionProps {
  activeProject: WorkspaceProject;
  employees: Employee[];
  isAddingTask: boolean;
  setIsAddingTask: React.Dispatch<React.SetStateAction<boolean>>;
  newTaskTitle: string;
  setNewTaskTitle: React.Dispatch<React.SetStateAction<string>>;
  newTaskAssignee: string;
  setNewTaskAssignee: React.Dispatch<React.SetStateAction<string>>;
  newTaskDueDate: string;
  setNewTaskDueDate: React.Dispatch<React.SetStateAction<string>>;
  newTaskPriority: 'low' | 'medium' | 'high';
  setNewTaskPriority: React.Dispatch<React.SetStateAction<'low' | 'medium' | 'high'>>;
  handleAddSimpleTask: () => void;
  removeTask: (taskId: string) => void;
  isPrivilegedCreator: (createdBy: unknown, createdByRole: unknown) => boolean;
  onViewMessages: (task: WorkspaceTask) => void;
}

const WorkspaceP1TasksSection: React.FC<WorkspaceP1TasksSectionProps> = ({
  activeProject,
  employees,
  isAddingTask,
  setIsAddingTask,
  newTaskTitle,
  setNewTaskTitle,
  newTaskAssignee,
  setNewTaskAssignee,
  newTaskDueDate,
  setNewTaskDueDate,
  newTaskPriority,
  setNewTaskPriority,
  handleAddSimpleTask,
  removeTask,
  isPrivilegedCreator,
  onViewMessages,
}) => {
  return (
    <div className="border-t border-slate-200 pt-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-brand-navy">Add Tasks</h2>
        <button
          type="button"
          onClick={() => setIsAddingTask(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-navy text-white text-[14px] font-semibold hover:bg-brand-red transition-colors"
        >
          <Plus size={16} /> Add task
        </button>
      </div>

      {isAddingTask && (
        <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-3xl border border-slate-200">
          <div className="flex flex-col gap-1">
            <label className="text-[13px] font-semibold text-slate-700">Task</label>
            <input
              value={newTaskTitle}
              onChange={e => setNewTaskTitle(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-[15px] text-brand-grey outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red"
              placeholder="Task name"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[13px] font-semibold text-slate-700">Assignee</label>
            <select
              value={newTaskAssignee}
              onChange={e => setNewTaskAssignee(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-[15px] text-brand-grey outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red bg-white"
            >
              <option value="">Unassigned</option>
              {employees.map(emp => (
                <option key={emp._id} value={emp.empId}>
                  {emp.empName}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[13px] font-semibold text-slate-700">Due date</label>
            <input
              type="date"
              value={newTaskDueDate}
              onChange={e => setNewTaskDueDate(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-[15px] text-brand-grey outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[13px] font-semibold text-slate-700">Priority</label>
            <select
              value={newTaskPriority}
              onChange={e => setNewTaskPriority(e.target.value as 'low' | 'medium' | 'high')}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-[15px] text-brand-grey outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red bg-white"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div className="md:col-span-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setIsAddingTask(false);
                setNewTaskTitle('');
                setNewTaskAssignee('');
                setNewTaskDueDate('');
                setNewTaskPriority('medium');
              }}
              className="px-4 py-2 rounded-full text-[13px] font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!newTaskTitle.trim()}
              onClick={handleAddSimpleTask}
              className={`px-6 py-2 rounded-full text-[13px] font-semibold text-white bg-brand-red hover:bg-brand-navy transition-colors ${
                !newTaskTitle.trim() ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            >
              Add task
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {(activeProject.tasks || []).length === 0 && !isAddingTask && (
          <div className="text-[13px] text-slate-400 border border-dashed border-slate-200 rounded-2xl px-4 py-6 text-center">
            No tasks added yet. Use &quot;Add task&quot; to create the first task.
          </div>
        )}
        {(activeProject.tasks || []).map(task => (
          <div
            key={task.id}
            className={`grid grid-cols-1 md:grid-cols-6 gap-4 p-4 rounded-3xl border items-center ${
              isPrivilegedCreator((task as any).createdBy, (task as any).createdByRole)
                ? 'bg-green-50 border-green-200'
                : 'bg-white border-slate-100'
            }`}
          >
            <div>
              <div className="text-[11px] text-slate-400 uppercase tracking-[0.15em] mb-1">
                Task
              </div>
              <div className="text-[15px] text-slate-900 font-medium">{task.title}</div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400 uppercase tracking-[0.15em] mb-1">
                Assignee
              </div>
              <div className="text-[14px] text-slate-700">
                {task.assigneeId || 'Unassigned'}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400 uppercase tracking-[0.15em] mb-1">
                Due Date
              </div>
              <div className="flex items-center gap-2 text-[14px] text-slate-700">
                <Clock size={14} className="text-slate-300" />
                {task.dueDate || '—'}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400 uppercase tracking-[0.15em] mb-1">
                Priority
              </div>
              <span
                className={`inline-flex px-3 py-1 rounded-full text-[12px] font-semibold ${
                  task.priority === 'high'
                    ? 'bg-red-50 text-brand-red'
                    : task.priority === 'low'
                    ? 'bg-slate-50 text-slate-600'
                    : 'bg-amber-50 text-amber-600'
                }`}
              >
                {task.priority}
              </span>
            </div>
            <div>
              <div className="text-[11px] text-slate-400 uppercase tracking-[0.15em] mb-1">
                Status
              </div>
              <div className="flex items-center gap-2 text-[14px] text-slate-700">
                <span>{task.status || 'todo'}</span>
                <button
                  type="button"
                  onClick={() => onViewMessages(task)}
                  className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-slate-200 text-slate-500 hover:text-brand-red hover:border-brand-red/40 bg-white"
                  title="View messages from employees"
                >
                  <Bell size={14} />
                  {Array.isArray(task.messages) && task.messages.length > 0 && (
                    <span className="ml-1 inline-flex items-center justify-center min-w-[16px] h-4 rounded-full bg-brand-red text-white text-[10px]">
                      {task.messages.length}
                    </span>
                  )}
                </button>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => removeTask(task.id)}
                className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-red-100 text-brand-red hover:bg-red-50"
                title="Delete task"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WorkspaceP1TasksSection;
